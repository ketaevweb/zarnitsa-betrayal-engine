extends CanvasLayer
## Отладочная панель дизайнера (F1): память, доверие, право слова, летопись.

const DataLoaderS := preload("res://core/data_loader.gd")

var root_panel: PanelContainer
var comp_option: OptionButton
var tag_option: OptionButton
var valence_slider: HSlider
var valence_value: Label
var trust_slider: HSlider
var trust_value: Label
var info_label: Label
var tags_data: Dictionary = {}


func _ready() -> void:
	layer = 30
	visible = false
	_load_tags()
	_build()


func _load_tags() -> void:
	var d = DataLoaderS.load_json("res://data/memory_tags.json")
	if d == null:
		return
	for t in d.get("tags", []):
		tags_data[str(t.get("id", ""))] = str(t.get("ru", t.get("id", "?")))


func toggle(force: Variant = null) -> void:
	if force == null:
		visible = not visible
	else:
		visible = bool(force)
	if visible:
		_rebuild_options()
		_refresh_info()


func _build() -> void:
	root_panel = PanelContainer.new()
	root_panel.custom_minimum_size = Vector2(500, 0)
	root_panel.position = Vector2(20, 70)

	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.08, 0.075, 0.11, 0.97)
	sb.border_color = Color(0.5, 0.45, 0.55)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(8)
	sb.set_content_margin_all(12)
	root_panel.add_theme_stylebox_override("panel", sb)
	add_child(root_panel)

	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(476, 600)
	root_panel.add_child(scroll)

	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(452, 0)
	box.add_theme_constant_override("separation", 8)
	scroll.add_child(box)

	var header_box := HBoxContainer.new()
	box.add_child(header_box)
	var header := Label.new()
	header.text = "ОТЛАДКА — движок предательства (F1)"
	header.add_theme_font_size_override("font_size", 18)
	header.add_theme_color_override("font_color", Color(0.94, 0.78, 0.45))
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header_box.add_child(header)
	var close := Button.new()
	close.text = "X"
	close.pressed.connect(func(): toggle(false))
	header_box.add_child(close)

	# Цель (спутник)
	box.add_child(_section("Цель"))
	comp_option = OptionButton.new()
	box.add_child(comp_option)

	# Состояние
	box.add_child(_section("Состояние"))
	info_label = Label.new()
	info_label.text = ""
	info_label.add_theme_font_size_override("font_size", 14)
	info_label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85))
	box.add_child(info_label)

	# Добавить память
	box.add_child(_section("Добавить событие памяти"))
	tag_option = OptionButton.new()
	box.add_child(tag_option)
	var vrow := HBoxContainer.new()
	vrow.add_theme_constant_override("separation", 8)
	box.add_child(vrow)
	var vlabel := Label.new()
	vlabel.text = "Валентность:"
	vlabel.custom_minimum_size = Vector2(110, 0)
	vrow.add_child(vlabel)
	valence_slider = HSlider.new()
	valence_slider.min_value = -3.0
	valence_slider.max_value = 3.0
	valence_slider.step = 1.0
	valence_slider.value = 1.0
	valence_slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	valence_slider.value_changed.connect(func(_v): _update_slider_labels())
	vrow.add_child(valence_slider)
	valence_value = Label.new()
	valence_value.custom_minimum_size = Vector2(36, 0)
	vrow.add_child(valence_value)
	box.add_child(_button("Добавить в память и применить", _on_add_memory))

	# Доверие
	box.add_child(_section("Доверие напрямую"))
	var trow := HBoxContainer.new()
	trow.add_theme_constant_override("separation", 8)
	box.add_child(trow)
	var tlabel := Label.new()
	tlabel.text = "Значение:"
	tlabel.custom_minimum_size = Vector2(110, 0)
	trow.add_child(tlabel)
	trust_slider = HSlider.new()
	trust_slider.min_value = 0.0
	trust_slider.max_value = 100.0
	trust_slider.step = 1.0
	trust_slider.value = 50.0
	trust_slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	trust_slider.value_changed.connect(func(_v): _update_slider_labels())
	trow.add_child(trust_slider)
	trust_value = Label.new()
	trust_value.custom_minimum_size = Vector2(36, 0)
	trow.add_child(trust_value)
	box.add_child(_button("Установить доверие", _on_set_trust))

	# Инструменты
	box.add_child(_section("Инструменты"))
	box.add_child(_button("Память спутника — в консоль", _on_dump_memory))
	box.add_child(_button("Летопись — в консоль", _on_dump_chronicle))
	box.add_child(_button("+1 час", _on_plus_hour))
	box.add_child(_button("Сутки вперёд", _on_plus_day))
	box.add_child(_button("Исключить из отряда (тест выхода)", _on_remove_party))

	_update_slider_labels()


func _section(text: String) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", 14)
	l.add_theme_color_override("font_color", Color(0.65, 0.6, 0.55))
	return l


func _button(text: String, handler: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", 14)
	b.pressed.connect(handler)
	return b


func _selected_cid() -> String:
	var keys: Array = BetrayalEngine.companions.keys()
	if keys.is_empty():
		return ""
	var i: int = comp_option.selected
	if i < 0 or i >= keys.size():
		return str(keys[0])
	return str(keys[i])


func _selected_tag() -> String:
	var keys: Array = tags_data.keys()
	if keys.is_empty():
		return "loyalty"
	var i: int = tag_option.selected
	if i < 0 or i >= keys.size():
		return str(keys[0])
	return str(keys[i])


func _update_slider_labels() -> void:
	if valence_value == null:
		return
	valence_value.text = "%+d" % int(valence_slider.value)
	trust_value.text = str(int(trust_slider.value))


func _rebuild_options() -> void:
	var current_cid := _selected_cid()
	comp_option.clear()
	for cid in BetrayalEngine.companions:
		comp_option.add_item(str(BetrayalEngine.companions[cid].get("name", cid)))
	if tag_option.item_count == 0:
		for tag in tags_data:
			tag_option.add_item("%s (%s)" % [tags_data[tag], tag])
	var keys: Array = BetrayalEngine.companions.keys()
	var idx := keys.find(current_cid)
	if idx >= 0:
		comp_option.select(idx)
	elif comp_option.item_count > 0:
		comp_option.select(0)


func _refresh_info() -> void:
	var cid := _selected_cid()
	if cid == "" or not BetrayalEngine.companions.has(cid):
		info_label.text = "Нет данных"
		return
	var c: Dictionary = BetrayalEngine.companions[cid]
	var lvl := int(BetrayalEngine.levels.get(cid, 0))
	var lines: Array = []
	var in_party := "в отряде" if GameState.party.has(cid) else "НЕ в отряде"
	lines.append("%s — %s (%s)" % [str(c.get("name", cid)), str(c.get("role", "")), in_party])
	if bool(BetrayalEngine.broken.get(cid, false)):
		lines.append("СОСТОЯНИЕ: РАЗРЫВ (необратимо)")
	lines.append("Доверие: %d / 100" % int(BetrayalEngine.trust.get(cid, 0.0)))
	lines.append("Ступень: %s" % BetrayalEngine.level_name(lvl))
	if BetrayalEngine.has_pending_speech_right(cid):
		lines.append("ПРАВО СЛОВА: ожидает решения (закрой диалогом)")
	lines.append("Записей в памяти: %d" % MemoryLog.memories_about(cid).size())
	var w = c.get("tag_weights", {})
	var ws: Array = []
	for k in w:
		ws.append("%s ×%.1f" % [str(k), float(w[k])])
	lines.append("Веса тегов: " + ", ".join(ws))
	info_label.text = "\n".join(lines)


func _on_add_memory() -> void:
	var cid := _selected_cid()
	if cid == "":
		return
	var tag := _selected_tag()
	var val := int(valence_slider.value)
	var ru := str(tags_data.get(tag, tag))
	var entry: Dictionary = MemoryLog.add_memory(tag, val, "player", cid,
		"DEBUG: %s (%+d)" % [ru, val], "debug", TimeSystem.day)
	BetrayalEngine.apply_memory(entry)
	_refresh_info()


func _on_set_trust() -> void:
	var cid := _selected_cid()
	if cid == "":
		return
	BetrayalEngine.debug_set_trust(cid, float(int(trust_slider.value)))
	_refresh_info()


func _on_dump_memory() -> void:
	var cid := _selected_cid()
	if cid == "":
		return
	print("=== Память о %s ===" % cid)
	for m in MemoryLog.memories_about(cid):
		print("  д.%d [%+d] %s — %s" % [int(m.get("day", 0)), int(m.get("valence", 0)), str(m.get("tag", "")), str(m.get("description", ""))])


func _on_dump_chronicle() -> void:
	print("=== Летопись Милуты ===")
	for e in EventLog.get_chronicle():
		print("  д.%d: %s" % [int(e.get("day", 0)), str(e.get("text", ""))])


func _on_plus_hour() -> void:
	TimeSystem.advance_minutes(60)


func _on_plus_day() -> void:
	TimeSystem.advance_minutes(1440)


func _on_remove_party() -> void:
	var cid := _selected_cid()
	if cid == "":
		return
	GameState.remove_from_party(cid)
	EventLog.record("Отряд покинул: %s" % str(BetrayalEngine.companions.get(cid, {}).get("name", cid)), TimeSystem.day)
	_rebuild_options()
	_refresh_info()
