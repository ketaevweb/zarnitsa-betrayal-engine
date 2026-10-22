extends Node
## GameState — акт, флаги сюжета, проклятые монеты, отряд, сохранение.

signal gold_changed(value: int)
signal flag_set(flag: String)
signal party_changed

const SAVE_PATH := "user://zarnitsa_save_v1.json"
const START_PARTY: Array = ["gavrila", "khodata", "miluta", "ratmir"]

var initialized: bool = false
var act: int = 1
var gold: int = 0
var flags: Dictionary = {}
var party: Array = []
var current_scene_id: String = "menu"


func new_game() -> void:
	act = 1
	gold = 0
	flags = {}
	party = START_PARTY.duplicate()
	current_scene_id = "camp"
	initialized = true
	party_changed.emit()
	gold_changed.emit(gold)


func set_flag(flag: String) -> void:
	if not flags.has(flag):
		flags[flag] = true
		flag_set.emit(flag)


func has_flag(flag: String) -> bool:
	return flags.has(flag)


func add_gold(amount: int) -> void:
	if amount == 0:
		return
	gold += amount
	gold_changed.emit(gold)


func spend_gold(amount: int) -> bool:
	if gold < amount:
		return false
	gold -= amount
	gold_changed.emit(gold)
	return true


func remove_from_party(cid: String) -> void:
	if party.has(cid):
		party.erase(cid)
		party_changed.emit()


func to_save_data() -> Dictionary:
	return {
		"act": act,
		"gold": gold,
		"flags": flags.duplicate(),
		"party": party.duplicate(),
		"scene": current_scene_id,
	}


func load_save_data(d: Dictionary) -> void:
	act = int(d.get("act", 1))
	gold = int(d.get("gold", 0))
	var f = d.get("flags", {})
	flags = f.duplicate() if f is Dictionary else {}
	var p = d.get("party", START_PARTY)
	party = p.duplicate() if p is Array else START_PARTY.duplicate()
	current_scene_id = str(d.get("scene", "camp"))
	initialized = true
	party_changed.emit()
	gold_changed.emit(gold)


## Записывает своё состояние + любые доп. блоки (time, memories, betrayal, chronicle).
func write_save(extra: Dictionary) -> bool:
	var data: Dictionary = to_save_data()
	for k in extra:
		data[k] = extra[k]
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		push_error("GameState: не удалось записать сохранение")
		return false
	f.store_string(JSON.stringify(data, "\t"))
	return true


func read_save() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return {}
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return {}
	var parsed = JSON.parse_string(f.get_as_text())
	return parsed if parsed is Dictionary else {}
