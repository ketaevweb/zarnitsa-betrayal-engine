extends Node
## Лагерь — хаб вертикального среза M0.
## 3D-заглушка (low-poly позже), HUD, диалоги, отладочная панель.
##
## Управление:
##   1–4 — говорить со спутником (Гаврила, Ходата, Милута, Ратмир)
##   F1  — отладочная панель движка предательства
##   F2  — +1 час
##   F3  — запустить первый ключевой момент
##   F4  — пауза времени

const BootstrapperS := preload("res://core/bootstrapper.gd")
const DataLoaderS := preload("res://core/data_loader.gd")
const DebugPanelS := preload("res://scenes/ui/debug_panel.gd")
const HudS := preload("res://scenes/ui/hud.gd")
const DialogueUIS := preload("res://scenes/ui/dialogue_ui.gd")

var sun: DirectionalLight3D
var fire_light: OmniLight3D
var mist_overlay: ColorRect
var hud
var dialogue_ui
var debug_panel

var _pending_speech_cid: String = ""
var _queued_speech_cid: String = ""
var _time_f: float = 0.0


func _ready() -> void:
        BootstrapperS.ensure()
        _build_world()
        hud = HudS.new()
        add_child(hud)
        dialogue_ui = DialogueUIS.new()
        add_child(dialogue_ui)
        debug_panel = DebugPanelS.new()
        add_child(debug_panel)
        _connect_signals()


func _build_world() -> void:
        var env := Environment.new()
        env.background_mode = Environment.BG_COLOR
        env.background_color = Color(0.03, 0.045, 0.075)
        env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
        env.ambient_light_color = Color(0.45, 0.5, 0.6)
        env.ambient_light_energy = 0.7
        var we := WorldEnvironment.new()
        we.environment = env
        add_child(we)

        sun = DirectionalLight3D.new()
        sun.rotation_degrees = Vector3(-42.0, 35.0, 0.0)
        sun.light_color = Color(1.0, 0.9, 0.75)
        sun.light_energy = 1.0
        sun.shadow_enabled = true
        add_child(sun)

        var ground := MeshInstance3D.new()
        var gm := BoxMesh.new()
        gm.size = Vector3(26.0, 0.2, 26.0)
        var gmat := StandardMaterial3D.new()
        gmat.albedo_color = Color(0.16, 0.19, 0.15)
        gm.material = gmat
        ground.mesh = gm
        add_child(ground)

        var fire := MeshInstance3D.new()
        var fm := SphereMesh.new()
        fm.radius = 0.25
        fm.height = 0.5
        var fmat := StandardMaterial3D.new()
        fmat.albedo_color = Color(1.0, 0.6, 0.2)
        fmat.emission_enabled = true
        fmat.emission = Color(1.0, 0.55, 0.15)
        fmat.emission_energy_multiplier = 2.0
        fm.material = fmat
        fire.mesh = fm
        fire.position = Vector3(0, 0.45, 0)
        add_child(fire)

        fire_light = OmniLight3D.new()
        fire_light.position = Vector3(0, 1.2, 0)
        fire_light.light_color = Color(1.0, 0.6, 0.25)
        fire_light.omni_range = 9.0
        fire_light.light_energy = 2.0
        add_child(fire_light)

        # Спутники — временные капсулы (низкополигональные модели — неделя 3–4)
        var comps: Dictionary = BetrayalEngine.companions
        var idx: int = 0
        for cid in comps:
                var angle := TAU * float(idx) / float(maxi(1, comps.size()))
                var pos := Vector3(cos(angle) * 3.0, 0.85, sin(angle) * 3.0)
                var body := MeshInstance3D.new()
                var cap := CapsuleMesh.new()
                cap.radius = 0.35
                cap.height = 1.4
                var mat := StandardMaterial3D.new()
                var col = comps[cid].get("color", [0.7, 0.7, 0.7])
                mat.albedo_color = Color(float(col[0]), float(col[1]), float(col[2]))
                cap.material = mat
                body.mesh = cap
                body.position = pos
                add_child(body)
                var lbl := Label3D.new()
                lbl.text = "%s [%d]" % [str(comps[cid].get("name", cid)), idx + 1]
                lbl.font_size = 40
                lbl.pixel_size = 0.004
                lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
                lbl.position = pos + Vector3(0, 1.15, 0)
                add_child(lbl)
                idx += 1

        var cam := Camera3D.new()
        cam.position = Vector3(0, 6.5, 9.5)
        cam.rotation_degrees = Vector3(-33.0, 0.0, 0.0)
        add_child(cam)
        cam.current = true

        # Слой Мглы: полупрозрачное затемнение экрана (объёмный туман — неделя 3–4)
        var ui_layer := CanvasLayer.new()
        ui_layer.layer = 5
        add_child(ui_layer)
        mist_overlay = ColorRect.new()
        mist_overlay.color = Color(0.06, 0.08, 0.13, 0.0)
        mist_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
        mist_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
        ui_layer.add_child(mist_overlay)


func _connect_signals() -> void:
        DialogueManager.dialogue_finished.connect(_on_dialogue_finished)
        BetrayalEngine.speech_right_requested.connect(_on_speech_right)
        BetrayalEngine.level_changed.connect(_on_level_changed)
        TimeSystem.mist_changed.connect(_on_mist)
        _on_mist(TimeSystem.is_mist_active(), TimeSystem.mist_intensity())


func _process(delta: float) -> void:
        _time_f += delta
        if fire_light != null:
                fire_light.light_energy = 1.8 + 0.25 * sin(_time_f * 9.0) + 0.12 * sin(_time_f * 23.7)
        if sun != null:
                var h := float(TimeSystem.get_hour())
                var daylight := clampf(1.0 - absf(h - 12.5) / 9.0, 0.05, 1.0)
                sun.light_energy = lerpf(0.06, 1.1, daylight)
                sun.light_color = Color(1.0, 0.82, 0.62).lerp(Color(0.55, 0.68, 1.0), 1.0 - daylight)


func _input(event: InputEvent) -> void:
        if event is InputEventKey and event.pressed and not event.echo:
                match event.keycode:
                        KEY_1, KEY_2, KEY_3, KEY_4:
                                if DialogueManager.active:
                                        return
                                var ids: Array = BetrayalEngine.companions.keys()
                                var i := int(event.keycode) - int(KEY_1)
                                if i >= 0 and i < ids.size():
                                        _talk_with(str(ids[i]))
                        KEY_F1:
                                debug_panel.toggle()
                        KEY_F2:
                                TimeSystem.advance_minutes(60)
                                hud.show_toast("+1 час", 1.2)
                        KEY_F3:
                                _run_pivotal_moment()
                        KEY_F4:
                                TimeSystem.running = not TimeSystem.running
                                var state := "идёт" if TimeSystem.running else "остановлено"
                                hud.show_toast("Время: " + state, 1.5)


func _talk_with(cid: String) -> void:
        if not GameState.party.has(cid):
                hud.show_toast("Этого спутника больше нет в отряде", 2.0)
                return
        DialogueManager.start("camp_" + cid)


## Право слова: переход на III–IV заморожен до решения игрока.
func _on_speech_right(cid: String, _from_level: int, _to_level: int) -> void:
        if DialogueManager.active:
                _queued_speech_cid = cid
                return
        _pending_speech_cid = cid
        DialogueManager.start("speech_right_default", {"companion_id": cid})


func _on_dialogue_finished(did: String, result: Dictionary) -> void:
        if did == "speech_right_default" and _pending_speech_cid != "":
                var success: bool = bool(result.get("speech_right_success", false))
                var cname := str(BetrayalEngine.companions.get(_pending_speech_cid, {}).get("name", _pending_speech_cid))
                BetrayalEngine.resolve_speech_right(_pending_speech_cid, success)
                if success:
                        hud.show_toast("Право слова принято: %s остаётся" % cname, 2.5)
                else:
                        hud.show_toast("Право слова отвергнуто: ступень вступила в силу", 2.5)
                _pending_speech_cid = ""
        if _queued_speech_cid != "" and not DialogueManager.active:
                _pending_speech_cid = _queued_speech_cid
                _queued_speech_cid = ""
                DialogueManager.start("speech_right_default", {"companion_id": _pending_speech_cid})


func _on_level_changed(cid: String, from_level: int, to_level: int) -> void:
        var cname := str(BetrayalEngine.companions.get(cid, {}).get("name", cid))
        EventLog.record("%s: %s → %s" % [cname, BetrayalEngine.level_name(from_level), BetrayalEngine.level_name(to_level)], TimeSystem.day)
        if to_level == BetrayalEngine.L_RUPTURE:
                hud.show_toast("РАЗРЫВ: %s предал клятву" % cname, 4.0)
        elif to_level >= BetrayalEngine.L_BETRAYAL:
                hud.show_toast("%s перешёл в Предательство" % cname, 3.0)


func _on_mist(active: bool, intensity: float) -> void:
        if mist_overlay != null:
                mist_overlay.color.a = 0.42 * intensity
        if hud != null:
                var word := "сгустилась" if active else "отступает"
                hud.show_toast("Мгла " + word, 2.0)


func _run_pivotal_moment() -> void:
        var moments: Array = DataLoaderS.moments_list()
        if moments.is_empty():
                return
        var m: Dictionary = moments[0]
        var title := str(m.get("title", "Ключевой момент"))
        var report: Dictionary = BetrayalEngine.evaluate_pivotal_moment(str(m.get("id", "pm")))
        EventLog.record("Ключевой момент: %s" % title, TimeSystem.day)
        var traitor := str(report.get("traitor", ""))
        if traitor != "":
                var tname := str(BetrayalEngine.companions.get(traitor, {}).get("name", traitor))
                var behavior := str(BetrayalEngine.companions.get(traitor, {}).get("betrayal_behavior", ""))
                hud.show_toast("ПРЕДАТЕЛЬСТВО! %s переходит грань" % tname, 4.5)
                EventLog.record("Предательство: %s. %s" % [tname, behavior], TimeSystem.day)
                GameState.remove_from_party(traitor)
        else:
                hud.show_toast("Ключевой момент: «%s» — отряд держится" % title, 3.0)
