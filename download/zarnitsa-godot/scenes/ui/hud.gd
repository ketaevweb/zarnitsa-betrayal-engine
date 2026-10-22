extends CanvasLayer
## HUD лагеря: время/день/Мгла, панель доверия отряда, всплывающие сообщения.

var time_label: Label
var mist_label: Label
var gold_label: Label
var party_box: VBoxContainer
var toast: Label
var _tween: Tween


func _ready() -> void:
	layer = 10
	_build()
	TimeSystem.minute_tick.connect(func(_d, _h, _m): refresh())
	TimeSystem.mist_changed.connect(func(_a, _i): refresh())
	BetrayalEngine.trust_changed.connect(func(_c, _o, _n): refresh())
	BetrayalEngine.level_changed.connect(func(_c, _o, _n): refresh())
	GameState.party_changed.connect(refresh)
	GameState.gold_changed.connect(func(_v): refresh())
	refresh()


func _build() -> void:
	var info_box := VBoxContainer.new()
	info_box.position = Vector2(16, 12)
	info_box.add_theme_constant_override("separation", 4)
	add_child(info_box)

	time_label = _make_label(info_box, 20, Color(0.94, 0.88, 0.78))
	mist_label = _make_label(info_box, 16, Color(0.8, 0.85, 1.0))
	gold_label = _make_label(info_box, 16, Color(0.9, 0.78, 0.45))

	var party_panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.07, 0.07, 0.11, 0.82)
	sb.set_corner_radius_all(6)
	sb.set_content_margin_all(10)
	party_panel.add_theme_stylebox_override("panel", sb)
	party_panel.position = Vector2(1280.0 - 276.0, 12)
	add_child(party_panel)

	party_box = VBoxContainer.new()
	party_box.add_theme_constant_override("separation", 6)
	party_panel.add_child(party_box)

	var holder := Control.new()
	holder.set_anchors_preset(Control.PRESET_FULL_RECT)
	holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(holder)

	toast = Label.new()
	toast.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	toast.grow_horizontal = Control.GROW_DIRECTION_BOTH
	toast.grow_vertical = Control.GROW_DIRECTION_BEGIN
	toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast.add_theme_font_size_override("font_size", 24)
	toast.add_theme_color_override("font_color", Color(0.96, 0.9, 0.8))
	toast.modulate = Color(1, 1, 1, 0)
	holder.add_child(toast)


func _make_label(parent: Node, font_size: int, color: Color) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_color", color)
	parent.add_child(l)
	return l


func show_toast(text: String, dur: float = 2.0) -> void:
	if toast == null:
		return
	toast.text = text
	toast.modulate.a = 1.0
	if _tween != null and _tween.is_valid():
		_tween.kill()
	_tween = create_tween()
	_tween.tween_interval(dur)
	_tween.tween_property(toast, "modulate:a", 0.0, 0.6)


func refresh() -> void:
	if time_label == null:
		return
	time_label.text = "День %d — %s (%s)" % [TimeSystem.day, TimeSystem.get_clock_text(), TimeSystem.get_phase()]
	var mist_pct := int(round(TimeSystem.mist_intensity() * 100.0))
	mist_label.text = "Мгла: %d%%" % mist_pct
	if TimeSystem.is_mist_active():
		mist_label.add_theme_color_override("font_color", Color(0.72, 0.78, 1.0))
	else:
		mist_label.add_theme_color_override("font_color", Color(0.75, 0.75, 0.75))
	gold_label.text = "Проклятые монеты: %d" % GameState.gold

	for child in party_box.get_children():
		child.queue_free()

	var header := Label.new()
	header.text = "ОТРЯД — ЛЕСТНИЦА ПРЕДАТЕЛЬСТВА"
	header.add_theme_font_size_override("font_size", 13)
	header.add_theme_color_override("font_color", Color(0.6, 0.58, 0.55))
	party_box.add_child(header)

	for cid in GameState.party:
		if not BetrayalEngine.companions.has(cid):
			continue
		var c: Dictionary = BetrayalEngine.companions[cid]
		var lvl := int(BetrayalEngine.levels.get(cid, 0))
		var col := _level_color(lvl)

		var name_l := Label.new()
		name_l.text = "%s — %s (%d)" % [
			str(c.get("name", cid)),
			BetrayalEngine.level_name(lvl),
			int(BetrayalEngine.trust.get(cid, 0.0)),
		]
		name_l.add_theme_font_size_override("font_size", 16)
		name_l.add_theme_color_override("font_color", col)
		party_box.add_child(name_l)

		var bar := ProgressBar.new()
		bar.min_value = 0.0
		bar.max_value = 100.0
		bar.value = float(BetrayalEngine.trust.get(cid, 0.0))
		bar.show_percentage = false
		bar.custom_minimum_size = Vector2(240, 10)
		bar.modulate = col
		party_box.add_child(bar)

	if BetrayalEngine.pending_transitions.size() > 0:
		var pending := Label.new()
		pending.text = "Право слова ожидает решения..."
		pending.add_theme_font_size_override("font_size", 13)
		pending.add_theme_color_override("font_color", Color(0.95, 0.55, 0.3))
		party_box.add_child(pending)


func _level_color(level: int) -> Color:
	if level >= 4:
		return Color(0.95, 0.3, 0.25)
	if level == 3:
		return Color(0.95, 0.55, 0.25)
	if level == 2:
		return Color(0.9, 0.75, 0.35)
	if level == 1:
		return Color(0.8, 0.8, 0.5)
	return Color(0.55, 0.85, 0.55)
