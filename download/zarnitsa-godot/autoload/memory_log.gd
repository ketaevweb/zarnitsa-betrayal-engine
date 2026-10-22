extends Node
## MemoryLog — память отряда. Ядро «движка предательства».
## ПРАВИЛО ПРОЕКТА: память не тускнеет — записи никогда не удаляются
## и не ослабляются со временем (закреплено юнит-тестом).
##
## Запись памяти (entry):
##   id          — уникальный номер
##   tag         — тег поступка (см. data/memory_tags.json)
##   valence     — валентность −3..+3 (как поступок Feeling воспринят свидетелем)
##   source_id   — кто совершил поступок ("player" или id спутника)
##   target_id   — в чью память записываем (чьё отношение меняется)
##   description — текст для отладки/летописи
##   scene_id    — где произошло (id диалога/сцены)
##   day         — игровой день
##   irreversible— непоправимое событие (удвоенный вес, не смягчается словом)

signal memory_added(entry: Dictionary)

const VALENCE_MIN: int = -3
const VALENCE_MAX: int = 3

var memories: Array = []
var _next_id: int = 1


func add_memory(tag: String, valence: int, source_id: String, target_id: String,
		description: String, scene_id: String = "", day: int = 1,
		irreversible: bool = false) -> Dictionary:
	var v: int = clampi(valence, VALENCE_MIN, VALENCE_MAX)
	var entry: Dictionary = {
		"id": _next_id,
		"tag": tag,
		"valence": v,
		"source_id": source_id,
		"target_id": target_id,
		"description": description,
		"scene_id": scene_id,
		"day": day,
		"irreversible": irreversible,
	}
	_next_id += 1
	memories.append(entry)
	memory_added.emit(entry)
	return entry


func memories_about(target_id: String) -> Array:
	var out: Array = []
	for m in memories:
		if str(m.get("target_id", "")) == target_id:
			out.append(m)
	return out


func memories_from(source_id: String) -> Array:
	var out: Array = []
	for m in memories:
		if str(m.get("source_id", "")) == source_id:
			out.append(m)
	return out


func count() -> int:
	return memories.size()


func to_save_data() -> Array:
	return memories.duplicate(true)


func load_save_data(arr: Array) -> void:
	memories = arr.duplicate(true)
	var max_id: int = 0
	for m in memories:
		max_id = maxi(max_id, int(m.get("id", 0)))
	_next_id = max_id + 1


func clear_all() -> void:
	memories.clear()
	_next_id = 1
