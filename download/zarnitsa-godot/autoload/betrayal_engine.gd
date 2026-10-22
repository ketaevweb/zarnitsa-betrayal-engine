extends Node
## BetrayalEngine — движок предательства.
## Лестница I–V, личные веса тегов, право слова (III–V), ключевые моменты.
##
## Доверие: 0..100 (стартовое — base_trust из data/companions.json).
## Дельта доверия = валентность × вес тега у персонажа × чувствительность.
## Уровень L наступает, когда доверие НИЖЕ порога (см. константы T_*).
## Уровень V (Разрыв) недостижим через очки — только сюжетное force_break().
##
## Право слова: переход на уровень III–IV замораживается, издаётся сигнал
## speech_right_requested; сцена обязана дать игроку диалог и вызвать
## resolve_speech_right(cid, success). Успех: доверие = порог+5, уровень −1.
## Право слова — одно на уровень на спутника (повторный провал — сразу переход).
##
## ПРАВИЛО СВЯЗНОСТИ: движок не ссылается на другие автолоады (инъекция в setup).

signal trust_changed(companion_id: String, old_trust: float, new_trust: float)
signal level_changed(companion_id: String, from_level: int, to_level: int)
signal speech_right_requested(companion_id: String, from_level: int, to_level: int)
signal pivotal_evaluated(moment_id: String, report: Dictionary)

const L_LOYALTY: int = 0
const L_DOUBT: int = 1
const L_ALIENATION: int = 2
const L_ULTIMATUM: int = 3
const L_BETRAYAL: int = 4
const L_RUPTURE: int = 5

const LEVEL_NAMES: Array = [
	"Верность", "Сомнение", "Отчуждение", "Ультиматум", "Предательство", "Разрыв"
]

# Пороги доверия (0..100).
const T_DOUBT: float = 60.0
const T_ALIENATION: float = 40.0
const T_ULTIMATUM: float = 25.0
const T_BETRAYAL: float = 10.0

const SPEECH_RIGHT_MIN_LEVEL: int = 3
const SPEECH_RIGHT_BONUS: float = 5.0
const IRREVERSIBLE_MULT: float = 2.0

var memory_log = null
var companions: Dictionary = {}      # id -> профиль из data/companions.json
var trust: Dictionary = {}           # id -> float 0..100
var levels: Dictionary = {}          # id -> int 0..5
var speech_rights_used: Dictionary = {} # id -> {level: true}
var pending_transitions: Dictionary = {} # id -> {"from": int, "to": int}
var broken: Dictionary = {}          # id -> true (Разрыв, необратимо)


func setup(mem_log, companions_map: Dictionary) -> void:
	memory_log = mem_log
	companions = companions_map
	trust.clear()
	levels.clear()
	speech_rights_used.clear()
	pending_transitions.clear()
	broken.clear()
	for cid in companions:
		trust[cid] = float(companions[cid].get("base_trust", 60.0))
		levels[cid] = L_LOYALTY
		speech_rights_used[cid] = {}
		broken[cid] = false


func is_ready() -> bool:
	return memory_log != null and not companions.is_empty()


func level_name(level: int) -> String:
	return LEVEL_NAMES[clampi(level, L_LOYALTY, L_RUPTURE)]


func sensitivity(cid: String) -> float:
	if companions.has(cid):
		return float(companions[cid].get("sensitivity", 1.0))
	return 1.0


func get_tag_weight(cid: String, tag: String) -> float:
	if companions.has(cid):
		var w = companions[cid].get("tag_weights", {})
		return float(w.get(tag, 1.0))
	return 1.0


## Применить запись памяти к доверию цели.
func apply_memory(entry: Dictionary) -> void:
	var cid := str(entry.get("target_id", ""))
	if not companions.has(cid):
		return
	var base: float = float(entry.get("valence", 0)) \
		* get_tag_weight(cid, str(entry.get("tag", ""))) * sensitivity(cid)
	if bool(entry.get("irreversible", false)) and float(entry.get("valence", 0)) < 0:
		adjust_trust(cid, base * IRREVERSIBLE_MULT)
		_flag_irreversible(cid, entry)
		return
	adjust_trust(cid, base)


func _flag_irreversible(cid: String, entry: Dictionary) -> void:
	# Точка расширения M1: непоправимые события фиксируются в летописи
	# и лишают игрока права слова на следующем переходе.
	print("[BetrayalEngine] Непоправимое событие против %s: %s" % [cid, str(entry.get("description", ""))])


func adjust_trust(cid: String, delta: float) -> void:
	if not companions.has(cid) or broken.get(cid, false):
		return
	var old_t: float = float(trust.get(cid, 0.0))
	var new_t: float = clampf(old_t + delta, 0.0, 100.0)
	if is_equal_approx(old_t, new_t):
		return
	trust[cid] = new_t
	trust_changed.emit(cid, old_t, new_t)
	_reevaluate_level(cid)


## Отладка/инструменты дизайнера: прямая установка доверия.
func debug_set_trust(cid: String, value: float) -> void:
	if not companions.has(cid):
		return
	var old_t: float = float(trust.get(cid, 0.0))
	var new_t: float = clampf(value, 0.0, 100.0)
	trust[cid] = new_t
	trust_changed.emit(cid, old_t, new_t)
	_reevaluate_level(cid)


func _level_for_trust(t: float) -> int:
	if t >= T_DOUBT:
		return L_LOYALTY
	if t >= T_ALIENATION:
		return L_DOUBT
	if t >= T_ULTIMATUM:
		return L_ALIENATION
	if t >= T_BETRAYAL:
		return L_ULTIMATUM
	return L_BETRAYAL


func _threshold_for(level: int) -> float:
	if level == L_DOUBT:
		return T_DOUBT
	if level == L_ALIENATION:
		return T_ALIENATION
	if level == L_ULTIMATUM:
		return T_ULTIMATUM
	if level == L_BETRAYAL:
		return T_BETRAYAL
	return 0.0


func _reevaluate_level(cid: String) -> void:
	if pending_transitions.has(cid):
		return  # переход заморожен: идёт право слова
	var target: int = _level_for_trust(float(trust.get(cid, 0.0)))
	var current: int = int(levels.get(cid, L_LOYALTY))
	if target == current:
		return
	if target > current:
		_try_transition(cid, current, target)
	else:
		# Улучшение отношений применяется сразу, без права слова.
		levels[cid] = target
		level_changed.emit(cid, current, target)


func _try_transition(cid: String, from_level: int, to_level: int) -> void:
	if broken.get(cid, false):
		return
	if to_level >= L_RUPTURE:
		# Разрыв недостижим через очки доверия — только сюжетное событие.
		to_level = L_BETRAYAL
	if to_level >= SPEECH_RIGHT_MIN_LEVEL and not speech_rights_used[cid].has(to_level):
		pending_transitions[cid] = {"from": from_level, "to": to_level}
		speech_right_requested.emit(cid, from_level, to_level)
		return
	_apply_transition(cid, from_level, to_level)


func _apply_transition(cid: String, from_level: int, to_level: int) -> void:
	levels[cid] = to_level
	level_changed.emit(cid, from_level, to_level)


func has_pending_speech_right(cid: String) -> bool:
	return pending_transitions.has(cid)


## Завершить право слова. success=false — переход вступает в силу.
func resolve_speech_right(cid: String, success: bool) -> void:
	if not pending_transitions.has(cid):
		return
	var p: Dictionary = pending_transitions[cid]
	pending_transitions.erase(cid)
	var to_level: int = int(p.get("to", L_ULTIMATUM))
	speech_rights_used[cid][to_level] = true
	if success:
		trust[cid] = clampf(_threshold_for(to_level) + SPEECH_RIGHT_BONUS, 0.0, 100.0)
		trust_changed.emit(cid, trust[cid], trust[cid])
		var soft_level: int = to_level - 1
		if int(levels[cid]) != soft_level:
			_apply_transition(cid, int(levels[cid]), soft_level)
	else:
		_apply_transition(cid, int(p.get("from", levels[cid])), to_level)


## Сюжетный разрыв (уровень V). Необратим.
func force_break(cid: String, reason: String = "") -> void:
	if not companions.has(cid) or broken.get(cid, false):
		return
	broken[cid] = true
	pending_transitions.erase(cid)
	var from_level: int = int(levels.get(cid, L_LOYALTY))
	levels[cid] = L_RUPTURE
	level_changed.emit(cid, from_level, L_RUPTURE)
	print("[BetrayalEngine] Разрыв: %s (%s)" % [cid, reason])


## Ключевой момент (переломная точка сюжета): пересмотр всех отношений.
## Спутник с уровнем >= IV и минимальным доверием становится предателем.
func evaluate_pivotal_moment(moment_id: String) -> Dictionary:
	var report: Dictionary = {"moment_id": moment_id, "rows": [], "traitor": ""}
	var cands: Array = []
	for cid in companions:
		if broken.get(cid, false):
			continue
		cands.append({
			"id": cid,
			"trust": float(trust.get(cid, 0.0)),
			"level": int(levels.get(cid, L_LOYALTY)),
		})
	cands.sort_custom(func(a, b): return float(a["trust"]) < float(b["trust"]))
	for c in cands:
		var action := "держит клятву"
		var lvl := int(c["level"])
		if lvl == L_DOUBT:
			action = "поглядывает с подозрением"
		elif lvl == L_ALIENATION:
			action = "держится в стороне"
		elif lvl == L_ULTIMATUM:
			action = "требует объяснений"
		elif lvl >= L_BETRAYAL:
			action = str(companions[str(c["id"])].get("betrayal_behavior", "готов предать"))
		report["rows"].append({"id": c["id"], "trust": c["trust"], "level": lvl, "action": action})
	if not cands.is_empty():
		var first: Dictionary = cands[0]
		if int(first["level"]) >= L_BETRAYAL:
			report["traitor"] = str(first["id"])
			force_break(str(first["id"]), "ключевой момент %s" % moment_id)
	pivotal_evaluated.emit(moment_id, report)
	return report


func to_save_data() -> Dictionary:
	return {
		"trust": trust.duplicate(),
		"levels": levels.duplicate(),
		"speech_rights_used": speech_rights_used.duplicate(true),
		"broken": broken.duplicate(),
		"pending": pending_transitions.duplicate(true),
	}


func load_save_data(d: Dictionary) -> void:
	if d.has("trust"):
		var t: Dictionary = d["trust"]
		for cid in t:
			if companions.has(cid):
				trust[cid] = float(t[cid])
	if d.has("levels"):
		var lv: Dictionary = d["levels"]
		for cid in lv:
			if companions.has(cid):
				levels[cid] = int(lv[cid])
	if d.has("broken"):
		var br: Dictionary = d["broken"]
		for cid in br:
			if companions.has(cid):
				broken[cid] = bool(br[cid])
	if d.has("speech_rights_used"):
		var sru: Dictionary = d["speech_rights_used"]
		for cid in sru:
			if speech_rights_used.has(cid):
				var conv: Dictionary = {}
				var inner: Dictionary = sru[cid]
				for k in inner:
					conv[int(k)] = inner[k]
				speech_rights_used[cid] = conv
	if d.has("pending"):
		pending_transitions = d["pending"].duplicate(true)
