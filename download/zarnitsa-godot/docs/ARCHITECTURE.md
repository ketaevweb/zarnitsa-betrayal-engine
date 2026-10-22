# Архитектура M0

## Автолоады

| Синглтон | Ответственность | Связи |
|---|---|---|
| GameState | акт, флаги, монеты, отряд, сохранение | нет |
| TimeSystem | сутки, фазы, Мгла | нет |
| MemoryLog | память отряда (записи без затухания) | нет |
| BetrayalEngine | доверие, лестница I–V, право слова, ключевые моменты | получает MemoryLog через setup() |
| DialogueManager | JSON-диалоги, эффекты выборов | получает все системы через setup() |
| EventLog | «Летопись Милуты» | нет |

**Правило связности:** ядро не ссылается на другие автолоады лексически —
все зависимости вводит `core/bootstrapper.gd` (идемпотентный `ensure()`).
Благодаря этому тесты создают изолированные экземпляры систем, а проект
запускается с любой сцены. UI-скрипты (hud, dialogue_ui, debug_panel, camp)
могут обращаться к автолоадам напрямую — они зарегистрированы в project.godot.

## Поток данных

```
выбор игрока (DialogueUI)
   → DialogueManager.choose(index)
   → _apply_effects: memories[] / trust{} / flags[] / gold / speech_right_success
   → MemoryLog.add_memory  (запись навсегда)
   → BetrayalEngine.apply_memory
        delta = valence × tag_weight × sensitivity (×2 для irreversible)
   → adjust_trust → _reevaluate_level
        уровень ниже порога? → I–II: сразу
        III–IV: пауза → speech_right_requested → диалог → resolve_speech_right
        V: недостижим очками (только force_break)
   → сигналы: trust_changed / level_changed
        → HUD (бары доверия)
        → camp._on_level_changed → EventLog («Летопись Милуты»)
```

## Право слова (полный цикл)

1. `speech_right_requested(cid, from, to)` — переход заморожен в
   `pending_transitions`.
2. `camp.gd` открывает универсальный диалог `speech_right_default`
   (плейсхолдер `{companion}` подставляется из контекста).
3. Итог выбора попадает в `result.speech_right_success`.
4. `resolve_speech_right(cid, success)`:
   успех → доверие = порог уровня + 5, ступень −1; отказ → переход вступает.
5. Повторный переход на тот же уровень без права слова
   (`speech_rights_used[cid][level]`).

## Сцены

- `Main.tscn` — меню, save/load, запуск юнит-тестов.
- `Camp.tscn` — 3D-заглушка хаба (капсулы, костёр, свет), CanvasLayer-и:
  Мгла-оверлей (5), HUD (10), диалоги (20), отладка (30).

## Сохранение

`user://zarnitsa_save_v1.json` — объединённый словарь: GameState (акт, золото,
флаги, отряд) + time + memories + betrayal + chronicle. Запись —
`GameState.write_save(extra)` из main.gd; чтение — `read_save()` + разбор блоков.

## Точки расширения M1

- InteractionSystem: Area3D + Input Map вместо клавиш 1–4, ходьба персонажа.
- Инвентарь/котёл проклятых монет (экономика из GDD).
- Энкаунтеры Мглы: правило «вход в Мглу» в TimeSystem + encounter-таблица.
- Low-poly модели и анимации (аутсорс, $8k по плану v2.0).
- Локализация: строки диалогов вынести в ключи (UI уже читает JSON).
