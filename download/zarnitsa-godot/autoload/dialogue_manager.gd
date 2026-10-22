extends Node
## DialogueManager — диалоги из JSON + применение эффектов выбора.
##
## Схема диалога (JSON):
## {
##   "id": "camp_gavrila", "entry": "start",
##   "nodes": [
##     {"id": "start", "speaker": "Гаврила", "text": "...",
##      "choices": [
##        {"text": "...", "next": "other_node | END",
##         "effects": {
##           "memories": [{"tag": "bravery", "valence": 1, "source_id": "player",
##                         "target_id": "gavrila", "description": "...",
##                         "irreversible": false, "chronicle": false}],
##           "trust": {"gavrila": 5},        # прямые дельты доверия
##           "flags": ["saw_oath"],          # флаги GameState
##           "gold": 1,                       # проклятые монеты
##           "speech_right_success": true,    # результат диалога права слова
##           "result_note": "текст для сцены"
##         }}
##      ]}
##   ]
## }
##
## Плейсхолдер "{companion}" в speaker/text/target_id подставляется
## из context["companion_id"] (для универсального права слова).
##
## ПРАВИЛО СВЯЗНОСТИ: зависимости передаются через setup() (инъекция).

signal dialogue_started(dialogue_id: String)
signal node_entered(node: Dictionary)
signal dialogue_finished(dialogue_id: String, result: Dictionary)

const DataLoaderS := preload("res://core/data_loader.gd")

var memory_log = null
var betrayal_engine = null
var game_state = null
var event_log = null
var time_system = null

var _dialogues: Dictionary = {}
var _current: Dictionary = {}
var _current_node: Dictionary = {}
var _current_id: String = ""
var _context: Dictionary = {}
var _result: Dictionary = {}
var active: bool = false


func setup(deps: Dictionary) -> void:
	memory_log = deps.get("memory_log", null)
	betrayal_engine = deps.get("betrayal_engine", null)
	game_state = deps.get("game_state", null)
	event_log = deps.get("event_log", null)
	time_system = deps.get("time_system", null)


func load_dialogue_file(path: String) -> bool:
	var data = DataLoaderS.load_json(path)
	if data == null or not data.has("id"):
		return false
	_dialogues[str(data["id"])] = data
	return true


func load_dialogue_dir(dir_path: String) -> int:
	var dir := DirAccess.open(dir_path)
	if dir == null:
		push_error("DialogueManager: нет папки %s" % dir_path)
		return 0
	var loaded: int = 0
	dir.list_dir_begin()
	var fname := dir.get_next()
	while fname != "":
		if not dir.current_is_dir() and fname.ends_with(".json"):
			if load_dialogue_file(dir_path + "/" + fname):
				loaded += 1
		fname = dir.get_next()
	dir.list_dir_end()
	return loaded


func is_loaded(dialogue_id: String) -> bool:
	return _dialogues.has(dialogue_id)


func start(dialogue_id: String, context: Dictionary = {}) -> bool:
	if not _dialogues.has(dialogue_id):
		push_error("DialogueManager: диалог не загружен: %s" % dialogue_id)
		return false
	_current = _dialogues[dialogue_id]
	_current_id = dialogue_id
	_context = context
	_result = {}
	active = true
	dialogue_started.emit(dialogue_id)
	_enter_node(str(_current.get("entry", "start")))
	return true


func choose(index: int) -> void:
	if not active or _current_node.is_empty():
		return
	var choices: Array = _current_node.get("choices", [])
	if index < 0 or index >= choices.size():
		return
	var choice: Dictionary = choices[index]
	_apply_effects(choice.get("effects", {}))
	var next_id := str(choice.get("next", "END"))
	if next_id == "" or next_id == "END":
		_finish()
	else:
		_enter_node(next_id)


func _finish() -> void:
	active = false
	var did := _current_id
	_current_id = ""
	_current_node = {}
	dialogue_finished.emit(did, _result.duplicate())


func _find_node(node_id: String) -> Dictionary:
	for n in _current.get("nodes", []):
		if str(n.get("id", "")) == node_id:
			return n
	return {}


func _enter_node(node_id: String) -> void:
	var node: Dictionary = _find_node(node_id)
	if node.is_empty():
		push_error("DialogueManager: узел не найден: %s" % node_id)
		_finish()
		return
	_current_node = node
	var shown: Dictionary = node.duplicate(true)
	var cid := str(_context.get("companion_id", ""))
	if cid != "" and betrayal_engine != null and betrayal_engine.companions.has(cid):
		var cname := str(betrayal_engine.companions[cid].get("name", cid))
		shown["text"] = str(shown.get("text", "")).replace("{companion}", cname)
		shown["speaker"] = str(shown.get("speaker", "")).replace("{companion}", cname)
	node_entered.emit(shown)


func _apply_effects(effects: Dictionary) -> void:
	if effects.is_empty():
		return
	var day: int = time_system.day if time_system != null else 1
	for m in effects.get("memories", []):
		var target := str(m.get("target_id", ""))
		if target == "{companion}" and _context.has("companion_id"):
			target = str(_context["companion_id"])
		var desc := str(m.get("description", ""))
		var entry: Dictionary = memory_log.add_memory(
			str(m.get("tag", "")), int(m.get("valence", 0)),
			str(m.get("source_id", "player")), target, desc,
			_current_id, day, bool(m.get("irreversible", false)))
		if betrayal_engine != null:
			betrayal_engine.apply_memory(entry)
		if bool(m.get("chronicle", false)) and event_log != null:
			event_log.record(desc, day)
	var trust_map = effects.get("trust", {})
	for cid in trust_map:
		if betrayal_engine != null:
			betrayal_engine.adjust_trust(str(cid), float(trust_map[cid]))
	for f in effects.get("flags", []):
		if game_state != null:
			game_state.set_flag(str(f))
	var g: int = int(effects.get("gold", 0))
	if g != 0 and game_state != null:
		game_state.add_gold(g)
	if effects.has("speech_right_success"):
		_result["speech_right_success"] = bool(effects["speech_right_success"])
	if effects.has("result_note"):
		_result["note"] = str(effects["result_note"])
