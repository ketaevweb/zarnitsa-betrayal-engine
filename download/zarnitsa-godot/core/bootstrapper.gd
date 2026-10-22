extends RefCounted
## Bootstrapper — идемпотентная привязка данных к автолоадам.
## Вызывается из _ready() любой стартовой сцены (меню или лагерь),
## поэтому проект можно запускать с любой сцены (F5 или F6).
##
## Архитектурное правило: ядро (autoload-скрипты) не ссылается друг на друга
## лексически — связи собирает только Bootstrapper. UI-скрипты могут обращаться
## к автолоадам напрямую (они зарегистрированы в project.godot).

static func ensure() -> void:
	if GameState.initialized and BetrayalEngine.is_ready():
		return
	var DataLoaderS := preload("res://core/data_loader.gd")
	var comps: Dictionary = DataLoaderS.companions_by_id()
	BetrayalEngine.setup(MemoryLog, comps)
	DialogueManager.setup({
		"memory_log": MemoryLog,
		"betrayal_engine": BetrayalEngine,
		"game_state": GameState,
		"event_log": EventLog,
		"time_system": TimeSystem,
	})
	DialogueManager.load_dialogue_dir("res://data/dialogues")
	if not GameState.initialized:
		GameState.new_game()
		TimeSystem.reset_to_new_game()
