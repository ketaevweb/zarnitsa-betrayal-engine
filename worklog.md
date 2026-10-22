# Worklog

---
Task ID: 1
Agent: Z.ai (main agent)
Task: Переработать концепт и план разработки игры «ЗАРНИЦА: The Oath» (из zarnitsa-main.zip) в реалистичный план для соло-разработчика; сделать DOCX + PDF

Work Log:
- Изучил архив upload/zarnitsa-main.zip: README, GDD (30 стр, ZARNITSA_GDD.pdf), питч-деки, веб-прототип
- Исходный план: AAA ($210M, 450 чел, 100+ ч, UE5, кооп, 6 языков дубляжа, безубыточность 5.2M копий)
- Уточнил требования через AskUserQuestion: соло-дев, демо для питча, low-poly 3D, выбор движка в документе, вырезать кооп/открытый мир/озвучку/консоли, self-funded + EA, оба формата, полный 30+ стр
- Загрузил навык docx; прочитал полностью: SKILL.md, routes/create.md, references/design-system.md, common-rules.md, docx-js-core.md, docx-js-advanced.md, toc.md, chart-templates.md, scenes/report.md
- Зафиксировал Outline: 14 разделов, стиль «северный гризайль» (бордовый акцент #7B2D35)
- Сгенерировал 3 диаграммы matplotlib (scripts/zarnitsa/charts.py): бюджет $30k, Гант 36 мес, сценарии выручки
- Код генерации: scripts/zarnitsa/{lib,content_a,content_b,content_c,generate}.js (обложка R1 с кириллическим расчётом ширины, 3 секции: обложка/TOC roman/тело arabic)
- Пайплайн: generate.js → add_toc_placeholders.py --auto (77 записей) → patch_footers.py (ROMAN/arabic instrText, удаление пустых pgNumType, дедуп первой записи TOC) → postcheck.py
- Исправлено в процессе: CJK-мусор в тексте; потеря всех таблиц (push массива без spread → flat(2)); дубль первой записи TOC; перенос «Месяцы» в узкой колонке; английский лейбл обложки
- postcheck: 0 ошибок (1 предупреждение о межстрочных интервалах — TOC-плейсхолдеры и обложка, норма)
- PDF: LibreOffice headless, 41 страница, визуальная проверка обложки, TOC, таблиц, рисунков, финальной страницы

Stage Summary:
- Готово: download/ZARNITSA_Realistic_Dev_Plan_v2.0.docx (327 KB, 41 стр в PDF-рендере) и download/ZARNITSA_Realistic_Dev_Plan_v2.0.pdf (14 разделов, 32 таблицы, 3 рисунка)
- Содержание: аудит AAA-плана → стратегия 3 этапов (демо «Три ночи» 1–2 ч → EA 9–12 ч → 1.0 на 15–20 ч) → скоуп было/стало → 5 систем под соло → Godot 4 (рекомендация) + сравнение движков → low-poly арт ($8k аутсорса) → нарратив (4 компаньона, Ink) → дорожная карта 36 мес с gate-критериями → бюджет ≤$30k и экономика EA ($17.99, безубыточность 2–3k копий) → риски соло → маркетинг/Steam → питч-пакет → приложения (чек-лист демо, стек, глоссарий, анти-список)
- УТП сохранено: движок предательства (память с тэгами/валентностью, порог, узел случая, лестница 5 ступеней, право слова) — перенесён из GDD 1.0 без потери сути

---
Task ID: 2
Agent: Z.ai (main agent)
Task: «Начать разработку» — старт M0 по плану v2.0: создать реальный Godot 4 проект вертикального среза ЗАРНИЦА: КЛЯТВА

Work Log:
- Создал download/zarnitsa-godot/ — каркас Godot 4.3 (GL Compatibility, 1280×720, 6 автолоадов)
- Ядро (инъекция зависимостей, без кросс-ссылок автолоадов):
  - memory_log.gd — память отряда: тег+валентность −3..+3, без затухания, save/load
  - betrayal_engine.gd — доверие 0..100, лестница I–V (пороги 60/40/25/10), личные веса тегов × чувствительность, право слова на III–IV (заморозка перехода, 1 использование на уровень), ключевые моменты с выбором предателя, force_break (V только сюжет)
  - time_system.gd — сутки, фазы (утро/день/вечер/ночь), Мгла: полная 22:00–05:00, рампы ±3 ч
  - dialogue_manager.gd — JSON-диалоги, эффекты: memories/trust/flags/gold/speech_right_success, плейсхолдер {companion}
  - game_state.gd (акт, монеты, флаги, отряд, save в user://) + event_log.gd («Летопись Милуты»)
- core/: data_loader.gd (без class_name — headless-безопасно), bootstrapper.gd (идемпотентная привязка, запуск с любой сцены)
- Данные: 4 профиля спутников (Гаврила/Ходата/Милута/Ратмир с весами тегов и betrayal_behavior), 11 тегов, 2 ключевых момента, 5 диалогов JSON
- Сцены: Main (меню, save/load, кнопка тестов), Camp (3D-заглушки капсул, костёр с флиecker, свет от суток, оверлей Мглы), UI: HUD (время/Мгла/бары доверия), dialogue_ui, debug_panel F1 (память/доверие/летопись)
- Тесты: tests/run_tests.gd (godot --headless -s) + test_suite.gd — 11 групп, ~40 проверок правил плана; исправлен тест Разрыва (право слова замораживает IV)
- Валидация: scripts/zarnitsa/validate.py — 8 JSON + 15 GD через gdparse (gdtoolkit) — 0 ошибок; Godot-бинарника в среде нет, рантайм-тесты — на машине пользователя
- Документация в проекте: README (быстрый старт/управление/экспорт *.json), docs/ARCHITECTURE.md, docs/BETRAYAL_ENGINE.md (тюнинг), docs/ROADMAP_M0.md (недели 3–6 + gate)
- Упаковка: download/ZARNITSA_Godot_M0_v0.1.0.zip (48 KB)

Stage Summary:
- Готово: download/zarnitsa-godot/ (играбельный каркас M0) и download/ZARNITSA_Godot_M0_v0.1.0.zip
- Правила плана v2.0 закреплены кодом и тестами: память не тускнеет; I–II без права слова; III–IV через право слова; V только сюжет; Мгла 22:00–05:00; delta = валентность × вес × чувствительность
- Следующий шаг по ROADMAP_M0: недели 3–4 — InteractionSystem (CharacterBody3D, Area3D), котёл монет, туман/аудио, low-poly модели

