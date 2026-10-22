extends RefCounted
## Юнит-тесты ядра M0. Тесты создают СВОИ экземпляры систем (инъекция),
## поэтому не зависят от автолоадов и работают в headless-режиме.
## Тот же набор выполняется кнопкой в главном меню.

const MemoryLogS := preload("res://autoload/memory_log.gd")
const BetrayalEngineS := preload("res://autoload/betrayal_engine.gd")
const TimeSystemS := preload("res://autoload/time_system.gd")
const DialogueManagerS := preload("res://autoload/dialogue_manager.gd")
const EventLogS := preload("res://autoload/event_log.gd")
const GameStateS := preload("res://autoload/game_state.gd")
const DataLoaderS := preload("res://core/data_loader.gd")

var tests_run: int = 0
var _failures: Array = []
var _current: String = ""
var _dm_finished: Dictionary = {}


func run_all() -> Array:
        _failures.clear()
        tests_run = 0
        _test_memory_log_basics()
        _test_memory_no_decay()
        _test_ladder_thresholds()
        _test_speech_right_blocks_and_resolves()
        _test_rupture_only_by_event()
        _test_trust_recovery()
        _test_time_and_mist()
        _test_dialogue_effects()
        _test_speech_right_dialogue_flow()
        _test_pivotal_moment()
        _test_save_roundtrip()
        return _failures.duplicate()


func _check(cond: bool, what: String) -> void:
        tests_run += 1
        if not cond:
                _failures.append("%s — %s" % [_current, what])
                print("  [FAIL] " + what)


func _make_engine(mem) -> Node:
        var comps: Dictionary = DataLoaderS.companions_by_id()
        var eng = BetrayalEngineS.new()
        eng.setup(mem, comps)
        return eng


# --- 1. Память -----------------------------------------------------------------

func _test_memory_log_basics() -> void:
        _current = "memory_log_basics"
        var ml = MemoryLogS.new()
        var e1: Dictionary = ml.add_memory("lie", -2, "player", "gavrila", "солгал о монетах")
        _check(str(e1.get("tag")) == "lie" and int(e1.get("valence")) == -2, "запись памяти создаётся")
        var e2: Dictionary = ml.add_memory("greed", -9, "gavrila", "ratmir", "клампинг")
        _check(int(e2.get("valence")) == -3, "валентность зажимается в [-3;+3]")
        _check(ml.memories_about("gavrila").size() == 1, "memories_about фильтрует по цели")
        _check(ml.memories_from("gavrila").size() == 1, "memories_from фильтрует по источнику")
        _check(ml.count() == 2, "счётчик записей корректен")


func _test_memory_no_decay() -> void:
        _current = "memory_no_decay"
        var ml = MemoryLogS.new()
        var eng = _make_engine(ml)
        eng.debug_set_trust("ratmir", 70.0)
        eng.adjust_trust("ratmir", -30.0)
        var t1: float = float(eng.trust["ratmir"])
        var ts = TimeSystemS.new()
        ts.advance_minutes(1440)  # сутки проходят
        _check(absf(float(eng.trust["ratmir"]) - t1) < 0.001, "память не тускнеет со временем")


# --- 2. Лестница ---------------------------------------------------------------

func _test_ladder_thresholds() -> void:
        _current = "ladder_thresholds"
        var ml = MemoryLogS.new()
        var eng = _make_engine(ml)
        var transitions: Array = []
        eng.level_changed.connect(func(cid, f, t): transitions.append([cid, f, t]))
        _check(int(eng.levels["gavrila"]) == 0, "старт — Верность")
        eng.debug_set_trust("gavrila", 55.0)
        _check(int(eng.levels["gavrila"]) == 1, "55 → Сомнение (I)")
        eng.debug_set_trust("gavrila", 39.0)
        _check(int(eng.levels["gavrila"]) == 2, "39 → Отчуждение (II)")
        _check(transitions.size() == 2, "переходы I–II происходят без права слова")


# --- 3. Право слова ------------------------------------------------------------

func _test_speech_right_blocks_and_resolves() -> void:
        _current = "speech_right_blocks_and_resolves"
        var ml = MemoryLogS.new()
        var eng = _make_engine(ml)
        var fired: Dictionary = {"cid": "", "to": -1}
        eng.speech_right_requested.connect(_on_requested.bind(fired))
        eng.debug_set_trust("khodata", 20.0)
        _check(str(fired["cid"]) == "khodata" and int(fired["to"]) == 3, "запрошено право слова на III")
        _check(int(eng.levels["khodata"]) == 0, "переход заморожен до решения")
        _check(eng.has_pending_speech_right("khodata"), "переход в состоянии ожидания")

        eng.resolve_speech_right("khodata", false)
        _check(int(eng.levels["khodata"]) == 3, "отказ — вступает Ультиматум (III)")
        _check(eng.speech_rights_used["khodata"].has(3), "право слова помечено использованным")

        eng.debug_set_trust("khodata", 30.0)
        _check(int(eng.levels["khodata"]) == 2, "восстановление до Отчуждения (II)")
        eng.debug_set_trust("khodata", 20.0)
        _check(int(eng.levels["khodata"]) == 3 and not eng.has_pending_speech_right("khodata"),
                "повторный переход на III — без права слова")

        var fired2: Dictionary = {"cid": "", "to": -1}
        eng.speech_right_requested.connect(_on_requested.bind(fired2))
        eng.debug_set_trust("ratmir", 5.0)
        _check(int(fired2["to"]) == 4, "запрошено право слова на IV")
        eng.resolve_speech_right("ratmir", true)
        _check(int(eng.levels["ratmir"]) == 3, "успех — смягчение до III")
        _check(absf(float(eng.trust["ratmir"]) - 15.0) < 0.01, "доверие поднято чуть выше порога (15)")


func _on_requested(cid, from_level, to_level, store: Dictionary) -> void:
        store["cid"] = str(cid)
        store["to"] = int(to_level)


# --- 4. Разрыв -----------------------------------------------------------------

func _test_rupture_only_by_event() -> void:
        _current = "rupture_only_by_event"
        var ml = MemoryLogS.new()
        var eng = _make_engine(ml)
        var rupture_fired: Dictionary = {"fired": false}
        eng.level_changed.connect(_on_level_store.bind(rupture_fired))
        eng.debug_set_trust("miluta", 0.0)
        # Переход на IV сначала требует права слова (оно замораживает ступень):
        _check(eng.has_pending_speech_right("miluta"), "переход на IV требует права слова")
        _check(not bool(rupture_fired["fired"]), "уровень V недостижим очками")
        eng.resolve_speech_right("miluta", false)  # отказ → IV вступает в силу
        _check(int(eng.levels["miluta"]) == 4, "доверие 0 даёт максимум IV (Предательство)")
        eng.force_break("miluta", "тест")
        _check(int(eng.levels["miluta"]) == 5 and bool(rupture_fired["fired"]), "Разрыв — только сюжетное событие")
        eng.adjust_trust("miluta", 50.0)
        _check(float(eng.trust["miluta"]) == 0.0, "после Разрыва доверие не меняется")


func _on_level_store(cid, from_level, to_level, store: Dictionary) -> void:
        if int(to_level) == 5:
                store["fired"] = true


# --- 5. Восстановление ---------------------------------------------------------

func _test_trust_recovery() -> void:
        _current = "trust_recovery"
        var ml = MemoryLogS.new()
        var eng = _make_engine(ml)
        eng.debug_set_trust("gavrila", 30.0)
        _check(int(eng.levels["gavrila"]) == 2, "провал до Отчуждения (II)")
        eng.debug_set_trust("gavrila", 80.0)
        _check(int(eng.levels["gavrila"]) == 0, "восстановление до Верности — сразу, без права слова")


# --- 6. Время и Мгла -----------------------------------------------------------

func _test_time_and_mist() -> void:
        _current = "time_and_mist"
        var ts = TimeSystemS.new()
        ts.set_time(8, 0)
        _check(str(ts.get_phase()) == ts.PHASE_MORNING, "8:00 — утро")
        ts.advance_minutes(60 * 11)
        _check(str(ts.get_phase()) == ts.PHASE_EVENING, "19:00 — вечер")
        _check(ts.mist_intensity() < 0.001, "19:00 — Мгла ещё не активна")
        ts.advance_minutes(60 * 3)
        _check(absf(ts.mist_intensity() - 1.0) < 0.001 and ts.is_mist_active(), "22:00 — Мгла полная")
        ts.advance_minutes(60 * 7)
        _check(absf(ts.mist_intensity() - 1.0) < 0.001, "5:00 — Мгла ещё держится")
        ts.advance_minutes(60 * 3)
        _check(int(ts.day) == 2, "сутки прошли: день 2")
        _check(str(ts.get_phase()) == ts.PHASE_MORNING, "8:00 дня 2 — утро")


# --- 7. Диалоги и эффекты ------------------------------------------------------

func _make_dialogue_stack():
        var ml = MemoryLogS.new()
        var eng = _make_engine(ml)
        var gs = GameStateS.new()
        var el = EventLogS.new()
        var ts = TimeSystemS.new()
        var dm = DialogueManagerS.new()
        dm.setup({"memory_log": ml, "betrayal_engine": eng, "game_state": gs, "event_log": el, "time_system": ts})
        return {"ml": ml, "eng": eng, "gs": gs, "el": el, "ts": ts, "dm": dm}


func _test_dialogue_effects() -> void:
        _current = "dialogue_effects"
        var s = _make_dialogue_stack()
        _check(s["dm"].load_dialogue_file("res://data/dialogues/camp_gavrila.json"), "диалог загружается из JSON")
        _check(s["dm"].is_loaded("camp_gavrila"), "диалог доступен по id")
        var t0: float = float(s["eng"].trust["gavrila"])
        s["dm"].start("camp_gavrila")
        _check(bool(s["dm"].active), "диалог активен после start")
        s["dm"].choose(0)  # ободрить → bravery +1, вес Гаврилы 1.5
        _check(not bool(s["dm"].active), "диалог завершён")
        _check(s["ml"].memories_about("gavrila").size() == 1, "выбор создал запись памяти")
        _check(absf(float(s["eng"].trust["gavrila"]) - (t0 + 1.5)) < 0.001, "доверие выросло на валентность × вес (1.5)")


func _test_speech_right_dialogue_flow() -> void:
        _current = "speech_right_dialogue_flow"
        var s = _make_dialogue_stack()
        _check(s["dm"].load_dialogue_file("res://data/dialogues/speech_right_default.json"), "универсальный диалог права слова загружен")
        _dm_finished = {"did": "", "n": 0, "success": false}
        s["dm"].dialogue_finished.connect(_on_dm_finished)

        # Отказ в праве слова
        s["eng"].debug_set_trust("ratmir", 5.0)
        _check(s["eng"].has_pending_speech_right("ratmir"), "ожидается право слова (IV)")
        s["dm"].start("speech_right_default", {"companion_id": "ratmir"})
        s["dm"].choose(1)  # «Слова кончились»
        _check(not bool(s["dm"].active) and str(_dm_finished["did"]) == "speech_right_default", "диалог права слова завершён")
        _check(not bool(_dm_finished["success"]), "результат: отказ")
        s["eng"].resolve_speech_right("ratmir", bool(_dm_finished["success"]))
        _check(int(s["eng"].levels["ratmir"]) == 4, "отказ в праве слова → IV Предательство")

        # Успех права слова
        s["eng"].debug_set_trust("miluta", 20.0)
        s["dm"].start("speech_right_default", {"companion_id": "miluta"})
        s["dm"].choose(0)  # дать слово
        _check(bool(s["dm"].active), "переход к узлу appeal")
        s["dm"].choose(0)  # принять
        _check(bool(_dm_finished["success"]), "результат: успех")
        s["eng"].resolve_speech_right("miluta", true)
        _check(int(s["eng"].levels["miluta"]) == 2, "успех — смягчение до II при переходе на III")


func _on_dm_finished(did: String, res: Dictionary) -> void:
        _dm_finished["did"] = str(did)
        _dm_finished["n"] = int(_dm_finished["n"]) + 1
        _dm_finished["success"] = bool(res.get("speech_right_success", false))


# --- 8. Ключевой момент --------------------------------------------------------

func _test_pivotal_moment() -> void:
        _current = "pivotal_moment"
        var ml = MemoryLogS.new()
        var eng = _make_engine(ml)
        var report: Dictionary = eng.evaluate_pivotal_moment("pm_test")
        _check(str(report.get("traitor", "")) == "", "при Верности предателя нет")
        eng.debug_set_trust("ratmir", 5.0)
        eng.resolve_speech_right("ratmir", false)  # IV вступает в силу
        _check(int(eng.levels["ratmir"]) == 4, "Ратмир на грани (IV)")
        report = eng.evaluate_pivotal_moment("pm_test2")
        _check(str(report.get("traitor", "")) == "ratmir", "предатель определён: ratmir")
        _check(bool(eng.broken.get("ratmir", false)), "Разрыв зафиксирован (V)")


# --- 9. Сохранение -------------------------------------------------------------

func _test_save_roundtrip() -> void:
        _current = "save_roundtrip"
        var gs = GameStateS.new()
        gs.new_game()
        gs.add_gold(7)
        gs.set_flag("test_flag")
        var ok: bool = gs.write_save({"time": {"day": 3, "minutes": 900}})
        _check(ok, "сохранение записывается в user://")
        var gs2 = GameStateS.new()
        var data: Dictionary = gs2.read_save()
        _check(not data.is_empty() and int(data.get("gold", 0)) == 7, "золото восстановлено из файла")
        gs2.load_save_data(data)
        _check(int(gs2.gold) == 7 and gs2.has_flag("test_flag"), "состояние GameState восстановлено")
        _check(int(data["time"]["day"]) == 3, "время присутствует в сохранении")

        var ml = MemoryLogS.new()
        ml.add_memory("bravery", 1, "player", "gavrila", "тест")
        var ml2 = MemoryLogS.new()
        ml2.load_save_data(ml.to_save_data())
        _check(ml2.count() == 1 and ml2.memories_about("gavrila").size() == 1, "память переживает сохранение")
