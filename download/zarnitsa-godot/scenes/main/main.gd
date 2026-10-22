extends Node
## Главный экран: вход в лагерь, сохранение/загрузка, юнит-тесты.

const BootstrapperS := preload("res://core/bootstrapper.gd")
const TestSuiteS := preload("res://tests/test_suite.gd")

var _status: Label


func _ready() -> void:
	BootstrapperS.ensure()
	_build_ui()


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	var bg := ColorRect.new()
	bg.color = Color(0.055, 0.05, 0.09)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(bg)

	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(520, 0)
	box.position = Vector2((1280.0 - 520.0) / 2.0, 96.0)
	box.add_theme_constant_override("separation", 12)
	layer.add_child(box)

	var title := Label.new()
	title.text = "ЗАРНИЦА: КЛЯТВА"
	title.add_theme_font_size_override("font_size", 46)
	title.add_theme_color_override("font_color", Color(0.94, 0.78, 0.45))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "вертикальный срез M0 — движок предательства"
	subtitle.add_theme_font_size_override("font_size", 18)
	subtitle.add_theme_color_override("font_color", Color(0.65, 0.62, 0.58))
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(subtitle)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 10)
	box.add_child(spacer)

	_add_button(box, "Войти в лагерь (вертикальный срез)", _on_play)
	_add_button(box, "Сохранить игру", _on_save)
	_add_button(box, "Загрузить игру", _on_load)
	_add_button(box, "Запустить юнит-тесты (вывод в консоль)", _on_tests)
	_add_button(box, "Выход", _on_quit)

	_status = Label.new()
	_status.text = "v0.1.0 — Godot 4.3, план разработки v2.0 (соло + аутсорс)"
	_status.add_theme_color_override("font_color", Color(0.5, 0.52, 0.55))
	_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(_status)


func _add_button(parent: Node, text: String, handler: Callable) -> void:
	var b := Button.new()
	b.text = text
	b.pressed.connect(handler)
	parent.add_child(b)


func _on_play() -> void:
	get_tree().change_scene_to_file("res://scenes/camp/Camp.tscn")


func _on_save() -> void:
	var extra := {
		"time": {"day": TimeSystem.day, "minutes": TimeSystem.minutes_total},
		"memories": MemoryLog.to_save_data(),
		"betrayal": BetrayalEngine.to_save_data(),
		"chronicle": EventLog.get_chronicle(),
	}
	var ok: bool = GameState.write_save(extra)
	var msg := "успешно" if ok else "ошибка"
	_status.text = "Сохранение: " + msg


func _on_load() -> void:
	var data: Dictionary = GameState.read_save()
	if data.is_empty():
		_status.text = "Сохранение не найдено"
		return
	GameState.load_save_data(data)
	if data.has("memories") and data["memories"] is Array:
		MemoryLog.load_save_data(data["memories"])
	if data.has("betrayal") and data["betrayal"] is Dictionary:
		BetrayalEngine.load_save_data(data["betrayal"])
	if data.has("chronicle") and data["chronicle"] is Array:
		EventLog.entries = data["chronicle"].duplicate(true)
	if data.has("time") and data["time"] is Dictionary:
		TimeSystem.day = int(data["time"].get("day", 1))
		TimeSystem.minutes_total = int(data["time"].get("minutes", 480))
	_status.text = "Сохранение загружено (день %d)" % TimeSystem.day


func _on_tests() -> void:
	var suite = TestSuiteS.new()
	var failures: Array = suite.run_all()
	if failures.is_empty():
		_status.text = "Юнит-тесты: все прошли (%d проверок)" % suite.tests_run
	else:
		_status.text = "Юнит-тесты: провалено %d (подробности в консоли)" % failures.size()


func _on_quit() -> void:
	get_tree().quit()
