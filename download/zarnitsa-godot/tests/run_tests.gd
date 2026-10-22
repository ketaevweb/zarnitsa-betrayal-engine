extends SceneTree
## Запуск юнит-тестов ядра без редактора:
##   godot --headless --path . -s tests/run_tests.gd
## Код возврата 0 — все тесты прошли, 1 — есть провалы.

func _init() -> void:
	print("=== ЗАРНИЦА: КЛЯТВА — юнит-тесты ядра (M0) ===")
	var suite = load("res://tests/test_suite.gd").new()
	var failures: Array = suite.run_all()
	print("Проверок выполнено: %d" % suite.tests_run)
	if failures.is_empty():
		print("=== ВСЕ ТЕСТЫ ПРОШЛИ ===")
		quit(0)
	else:
		print("=== ПРОВАЛЕНО ПРОВЕРОК: %d ===" % failures.size())
		for f in failures:
			print("  * " + str(f))
		quit(1)
