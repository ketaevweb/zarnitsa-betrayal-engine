extends RefCounted
## DataLoader — загрузка JSON-данных проекта.
## Используется через preload("res://core/data_loader.gd") — без class_name,
## чтобы ядро собиралось даже до первого импорта в редакторе.

static func load_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("DataLoader: файл не найден: %s" % path)
		return null
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("DataLoader: не удалось открыть: %s" % path)
		return null
	var text := f.get_as_text()
	var parsed = JSON.parse_string(text)
	if parsed == null:
		push_error("DataLoader: ошибка разбора JSON: %s" % path)
	return parsed


static func companions_by_id(path: String = "res://data/companions.json") -> Dictionary:
	var data = load_json(path)
	var out: Dictionary = {}
	if data == null or not data.has("companions"):
		return out
	for c in data["companions"]:
		if c is Dictionary and c.has("id"):
			out[str(c["id"])] = c
	return out


static func moments_list(path: String = "res://data/pivotal_moments.json") -> Array:
	var data = load_json(path)
	if data == null or not data.has("moments"):
		return []
	return data["moments"]
