extends CanvasLayer
## Диалоговый интерфейс: показывает узлы DialogueManager, отправляет выборы.

var panel: PanelContainer
var speaker_label: Label
var text_label: RichTextLabel
var choices_box: VBoxContainer


func _ready() -> void:
	layer = 20
	_build()
	visible = false
	DialogueManager.node_entered.connect(_on_node_entered)
	DialogueManager.dialogue_finished.connect(_on_dialogue_finished)


func _build() -> void:
	panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(920, 0)
	panel.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BEGIN
	panel.offset_bottom = -36.0

	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.09, 0.085, 0.12, 0.96)
	sb.border_color = Color(0.85, 0.68, 0.4)
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(8)
	sb.set_content_margin_all(14)
	panel.add_theme_stylebox_override("panel", sb)
	add_child(panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)

	speaker_label = Label.new()
	speaker_label.add_theme_font_size_override("font_size", 20)
	speaker_label.add_theme_color_override("font_color", Color(0.94, 0.78, 0.45))
	box.add_child(speaker_label)

	text_label = RichTextLabel.new()
	text_label.bbcode_enabled = false
	text_label.fit_content = true
	text_label.scroll_active = false
	text_label.custom_minimum_size = Vector2(0, 64)
	text_label.add_theme_font_size_override("normal_font_size", 18)
	text_label.add_theme_color_override("default_color", Color(0.92, 0.9, 0.86))
	box.add_child(text_label)

	choices_box = VBoxContainer.new()
	choices_box.add_theme_constant_override("separation", 6)
	box.add_child(choices_box)


func _on_node_entered(node: Dictionary) -> void:
	visible = true
	speaker_label.text = str(node.get("speaker", ""))
	text_label.text = str(node.get("text", ""))
	for c in choices_box.get_children():
		c.queue_free()
	var choices: Array = node.get("choices", [])
	var i: int = 0
	for ch in choices:
		var idx := i
		var b := Button.new()
		b.text = str(ch.get("text", "..."))
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.add_theme_font_size_override("font_size", 16)
		b.pressed.connect(func(): DialogueManager.choose(idx))
		choices_box.add_child(b)
		i += 1


func _on_dialogue_finished(_dialogue_id: String, _result: Dictionary) -> void:
	visible = false
