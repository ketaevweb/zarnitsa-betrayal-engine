extends Node
## EventLog — «Летопись Милуты»: автоматически собирает ключевые события
## (смена ступени лестницы, ключевые моменты, предательства).

signal entry_recorded(day: int, text: String)

var entries: Array = []


func record(text: String, day: int = 1) -> void:
	entries.append({"day": day, "text": text})
	entry_recorded.emit(day, text)


func get_chronicle() -> Array:
	return entries.duplicate(true)


func clear_all() -> void:
	entries.clear()
