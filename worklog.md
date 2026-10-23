# Zarnitsa: Oath — Worklog

3D browser prototype (Next.js + R3F), script "Three Nights under the Mist". Engine of betrayal.

> Restored from git history (container was recycled, original file lost before being committed).

---

Task ID: 1..6 (sessions 1–3)
Agent: main
Task: M0 foundation → M0.9

Stage Summary:
- M0: Next.js 15 + TS + zustand + R3F + drei; title screen, camp scene, HUD, day/night loop core.
- Classic 2D version preserved in src/components/zarnitsa/ClassicGame.tsx (upload/zarnitsa-extracted source of texts).
- Commits: M0 series (see git log).

---

Task ID: 7 (session 4)
Agent: main
Task: M0.9 "Ring of Cold" + M1.0 "Whispers of the Mist" + M1.1 "Morning Round" + M1.2 "Echo of the Night"

Work Log:
- M0.9 (7fcd616): the Mist responds to fire — living ring (approach based on fuel, dash when the fire is blazing), eyes fill with, wind/heart via setDread, Shift sprint with FOV kick, shield status in HUD, red threat rim on the map, dawn line "The Mist came within N steps".
- M1.0 (cd985ad): the Mist tempts the player through cold (dread exposure → whisper, ≤2/night); 5 temptations based on companions' scars go through eternal memory (applyMemory); acceptance = sting + shake, rejection = resolve +1; WhisperOverlay with typed text; simulate3d green.
- M1.1 (611a299): day phase between nights — warm camp without the Mist, day's tasks (4 morning conversations via eternal memory + 3 bundles of firewood = +8..24 fuel), "Wait for Dusk" button; save/resume of the day phase, day mini-map and firewood markers; DayBar, day's tasks chip, "the fire sleeps"; night→day→night cycle verified in the browser.
- M1.2 (f976ac3): the squad remembers whispers — morning memory lines based on wounds (accept the temptation — cold based on whisper tag, reject — quiet warmth); mass whispers fall on everyone; day audio layer (birds, sleeping fire, quiet wind, setDayMode); echo bubble above the prompt in camp; persist whisperDone + echo into the save (EchoEntry {cid, spared, tag}); day.ts: ECHO_SCORNED / ECHO_SCORNED_ANY / ECHO_SPARED / ECHO_IDLE, echoLine(cid, echo, day) with deterministic hash; audio.ts: setDayMode/applyDayMix/chirp (birds 2500–4300 Hz); verified in the browser: scorned (Gavrila), spared (Ratmir), mass w_hodata (echo ×4), Night 3 reset, save/resume. Screens: shot_m12_*.png.

---

Task ID: 8 (session 5)
Agent: main
Task: M1.3 "Crow over the Camp" + push to GitHub

Work Log:
- M1.3 (da13052): crow omen of the day phase — lands closer to the fire the more whispers were accepted (forest edge → woodpile → fire), hops/pecking/gaze at the player, caw sfxCaw the more frequent the closer; crow line at dawn; echo of the night in the first phrase of morning talks (scorned/spared per companion); EchoEntry moved to types.ts; crowLive in dev hook; screens shot_m13_*.png (crow, crow2, crow3, crow_fire, dawn, dtalk).
- Container recycled between sessions: worklog.md lost from disk (was not committed), file execution bits changed to 755; a stray UUID-message commit reworded to "chore: file execution permissions + M1.3 binary screens (crow)" (dcdf64e); this worklog restored from git history.
- Push to GitHub with the token provided by the user (see next section upon completion).

Stage Summary:
- Milestones in git: M0.9 7fcd616, M1.0 cd985ad, M1.1 611a299, M1.2 f976ac3, M1.3 da13052.
- Push to GitHub done in session 6 (origin/main = fe57c14); token removed from remote URL after push.

---

Task ID: 9 (session 6)
Agent: main
Task: push to GitHub + M1.4 "Knife Under the Oath" (finale scene)

Work Log:
- History cleanup: stray UUID-message commit reworded to "chore: file execution permissions + M1.3 binary screens (crow)" (dcdf64e); worklog.md restored from git history and force-added (fe57c14; it was in .gitignore — hence lost in the recycle).
- Push to GitHub with the user token: origin/main now = fe57c14; token removed from remote URL after push (recommend rotation — token is in chat history).
- M1.4 implemented:
  - types.ts: Choice.finaleAct ("release" | "hold" | "confess") + finaleTarget.
  - engine.ts: releaseBreak() (V without knife, betrayedAtFinale=false); applyChoice finale block — target fate by act, confession writes honesty +3 (rescue only if memory allows, level recomputed honestly); other level-4 companions forceBreak as before; buildEnding verdict for V-without-knife: "Lowered the knife and walked into the Mist alive."
  - scenario3d.ts: FINALE_EVENT_ID, finaleCandidates (level >=3, not frozen/gone; darkest first), makeFinaleEvent(state, echo) — dynamic text: Mist presses the Pillar, named betrayer steps out with a knife, Мгла speaks his worst memory; echo-aware lines (scorned → "returns the debt", spared → "you did not answer"), run-wide accepted-whisper counter via state.flags wh_*; NAME_GEN map for genitive ("against Gavrila's"); three choices with per-companion reaction memories.
  - store.ts: openEvent("e12") intercept → finale scene when candidates exist (fuel gate unchanged); resolveWhisper accept sets flags[`wh_${id}`].
  - Player.tsx / World.tsx: during finale — setDread(1), mglLive.closest ≤ 5.2, watchers close to r≈7.4 at fast rate (Mist presses the Pillar).
  - Hud.tsx: finale badge "⸸ denouement", red border + glow on panel, katalizator badge suppressed for finale; version M1.4.
  - GameCanvas.tsx: dev hook finale(cid, trust=8) — forces level 4/3 without freeze for tests.
  - simulate3d.ts: section 4 — knife (V+betrayal), release (V, alive), confession rescues at trust 8 (→15.2, level 3), confession fails at trust 2 (→9.2, knife anyway), echo lines; invariant updated: level 5 ⇒ state.finished.
- Browser verification (all green): finale scene opens on e12 with candidate (screens shot_m14_finale*.png); whisper counter "answered 1 time"; worst-memory line; hold → end screen "Stuck the knife under the oath" (shot_m14_end_hold.png); release → Ratmir gone lvl5 betrayed=false (shot_m14_end_release.png); confession → Miluta rescued lvl3 trust 15.5 (shot_m14_end_confess.png); clean path (no candidates) → ordinary "OATH AT THE PILLAR"; genitive fix verified "against Gavrila's" (shot_m14_echo.png); scene shot shot_m14_scene.png; console clean (only old THREE.Clock deprecation). Test save cleared, browser closed. tsc (src) + eslint clean.

Stage Summary:
- M1.4 closed: the promise of the betrayal engine ("V — only through the plot") became a live scene; whispers/echo got their payoff at the Pillar.
- Next ideas: M1.5 — crow lands on the Pillar during the finale; companion departure in the day phase (level IV walks at dawn); endings polish (per-ending titles).


---

Task ID: 10 (session 7)
Agent: main
Task: M1.5 "Crow on the Pillar" (crow at the finale + dawn walk-away + ending titles) + push

Work Log:
- Git/GitHub state verified first: origin/main = 002ca7a (M1.4) — session 6 push had landed; stray chmod noise (worklog.md + shot_m14_*.png modes) restored to 644 instead of a junk commit.
- M1.5 implemented:
  - engine.ts: walkAway() — V without knife, no witnesses (betrayedAtFinale=false, walkedAtDawn=true, own chronicle line "ушёл в Мглу сам — на рассвете, до клятвы"); applyDawnWalkaways() — dawn takes every level-4 unfrozen companion; buildEnding now returns per-ending title+subtitle (НОЖ ПОД КЛЯТВОЙ / УШЛИ ЖИВЫМИ / КЛЯТВА В ТРЕЩИНАХ / ТРИ НОЧИ ПОД МГЛОЙ / КЛЯТВА ДЕРЖИТ) and level-5 verdict distinguishes walkedAtDawn.
  - types.ts: CompanionState.walkedAtDawn?: boolean.
  - store.ts: maybeWalkAtDawn() gate (all night events done, night < NIGHT_COUNT, not dayMode) wired into choose() and chooseSpeech(); transient dawnWalked: string[] shown on dawn screen, cleared in dawnGo/startNight/start/resume; sfxCaw on finale open.
  - scenario3d.ts: finale text gained the crow paragraph ("Падальщики приходят раньше ножей").
  - Crow.tsx: finale mode — renders during the finale scene, fly-in along a quadratic bezier from behind the forest (2.6 s, continuous flapping), lands on the Pillar cap (PILLAR_ANCHOR 0.38/4.52/-19.5) beside the ritual flame; perched = no hops/pecks, frequent caws (3.4–9.5 s), head tracks the player; eyes glow 1.6; shadow only in day mode. Day-mode gaze fixed: model faces −z, so look-at now uses atan2(−dx,−dz) (bird actually faces the player/hop direction now).
  - Hud.tsx: dawn overlay panel "РАССВЕТ ЗАБРАЛ СВОЁ" for dawnWalked; version M1.5. EndScreen.tsx: h1 = ending.title (fallback "Три ночи прошли"), subtitle prepended to stats line.
  - simulate3d.ts: run() applies applyDawnWalkaways between nights; invariant relaxed (level 5 OK when walkedAtDawn); section 5 — walk-away (unfrozen IV walks, frozen doesn't, walked can't be finale candidate, level III stays candidate), ending titles, crow mentioned in finale text; title checks hoisted sHold/sRel.
- Browser verification (all green): ratmir forced to lvl 4 unfrozen before the last night-1 event → dawn panel "Ратмир ушёл в Мглу прямо на рассвете" (shot_m15_walk_dawn2.png); camp shows 6/7 tasks (his talk gone), 3 party cards, log keeps V line (shot_m15_walk_camp.png); night 2 starts with 3 alive. Night 3: finale opens, crow paragraph in text (shot_m15_crow_fly.png, shot_m15_crow_wide2.png); crowLive lands exactly at PILLAR_ANCHOR after fly-in; close-up shows the crow silhouette with glowing eye beside the ritual flame (shot_m15_crow_top_zoom.png); hold → end screen titled "НОЖ ПОД КЛЯТВОЙ" (shot_m15_end_hold.png). Console clean; save cleared; browser closed. tsc (src) + eslint clean; simulate3d — ALL CHECKS PASSED.
- Push to GitHub with the user token (direct URL push, token not stored in config).

Stage Summary:
- M1.5 closed: the omen crow completes its arc (forest edge → camp → Pillar cap), betrayal now has a pre-echo at dawn (stage IV leaves before the oath), and every run ends under its own title.
- Next ideas: M1.6 — дневной след ворона (ворон на мини-карте), реплики отряда об ушедшем на рассвете (эхо ухода в dtalk), титульная заставка концовки (полноэкранный титул перед летописью).

---

Task ID: 11 (session 8)
Agent: main
Task: M1.6 "Dawn Memory" (crow on the minimap + walked-away talk openings + ending title gate)

Work Log:
- GitHub state verified first: origin/main = e166652 (M1.5 push landed in session 7); token still valid, nothing to push.
- M1.6 implemented:
  - day.ts: WALKED_TALK_OPENING (per walked companion × remaining talker, 12 unique lines) + WALKED_ANY fallback; makeDayTalk(cid, night, echo?, walked = []) — walked-echo overrides whisper-echo as the opening line; a walked companion returns null (no talk).
  - store.ts: openDayTalk collects walked ids from state.party.walkedAtDawn and passes them to makeDayTalk.
  - Minimap.tsx: crow marker in day mode — dark dot from live crowLive position, pulsing gold rim + pale eye-dot; drawn only when the bird is in camp (crowLive.x/z non-zero).
  - EndingTitle.tsx (new): full-screen ending title gate before the chronicle — "РАЗВЯЗКА" overline, ending title with per-ending palette (НОЖ → ember red, ЖИВЫМИ → moss green, ТРЕЩИНАХ/ДЕРЖИТ → gold, МГЛОЙ → cold steel), letter-spacing collapse animation, divider growth, subtitle fade-in; click / Enter / Space opens EndScreen (sfxOpen). Wired into Hud.tsx (replaces direct EndScreen render; EndScreen import moved to the new component).
  - Hud.tsx: version "3D-прототип · M1.6 «Память рассвета»".
  - simulate3d.ts: section 6 — walked companion has no morning talk; remaining three open with the walked one's name; walked-echo wins over whisper-echo; no walked → old whisper opening; several walked → first in list.
- Static checks: tsc (src + scripts/zarnitsa-web) clean; eslint clean; simulate3d ALL CHECKS PASSED (sections 1–6).
- Browser verification (all green): forced Ratmir dawn walk (walkedAtDawn via state) → camp day II with 6/7 tasks and 3 party cards; minimap shows the crow marker NE at the forest edge (crowLive 21.0, −15.0) — shot_m16_map_crow.png; Gavrila day talk opens with "…будто Ратмир может услышать…" — shot_m16_dtalk_walked.png; Miluta opens with her ledger-south line; finale (finale hook, e12) → hold → end → title gate "НОЖ ПОД КЛЯТВОЙ" in ember palette — shot_m16_title_gate.png; click → chronicle opens — shot_m16_chronicle.png; console clean (only the old THREE.Clock deprecation). Test save cleared, browser closed.

Stage Summary:
- M1.6 closed: dawn walk-away now echoes through the morning (the squad speaks of the one who left), the omen bird has a day-phase footprint on the map, and every run ends under its own full-screen title before the chronicle.
- Push to GitHub after commit (origin/main → M1.6).

---

Task ID: 12 (session 8, continued)
Agent: main
Task: M1.7 "Chronicle of Runs" (meta-memory between runs) + LogTicker leak fix

Work Log:
- chronicle.ts (new): ChronicleEntry {at, title, subtitle, gold, memoryCount, whispers (flags wh_* count), rows[{cid, level, gone, betrayed, walked}]}; loadChronicle / recordRun (cap 8, oldest leaves first) / clearChronicle; useSyncExternalStore plumbing — cached stable snapshot (getChronicle/getChronicleServer), subscribeChronicle (zarnitsa-chronicle + storage events), emitChronicle on every record/clear.
- store.ts: all four end-transitions (choose, chooseSpeech, drain, resolveWhisper) now call recordRun(next, ending) — every finished run lands in the chronicle (works from both 3D and classic shells: shared store).
- Hud.tsx: ChroniclePanel on the title screen — "ЛЕТОПИСЬ ПРОШЛЫХ ПОХОДОВ · N", up to 3 recent entries: date (ru-RU), ending title in its palette (titleTone exported from EndingTitle), whispers count, party dots (level colors as minimap; V = dark core, gone = rim, tooltip names knife/dawn-walk); hint "старшие записи уходят в Мглу первыми"; version M1.7.
- Fix: LogTicker rendered on title/end screens (semi-transparent overlays let the log bleed through) — now guarded: screen !== "title" && screen !== "end".
- Static checks: tsc + eslint clean; simulate3d still ALL CHECKS PASSED.
- Browser verification (all green): run 1 (release at finale) → end "УШЛИ ЖИВЫМИ" → chronicle entry written (gold 0, rows 4); restart → title panel shows "23 окт. УШЛИ ЖИВЫМИ" with 3 green dots + dark-rimmed dot (Ratmir walked) — shot_m17_title_chronicle.png; run 2 (hold the oath) → "НОЖ ПОД КЛЯТВОЙ" → entries=2; panel shows both titles in their palettes with correct dots — shot_m17_title_two.png; after reload the panel survives (persistence verified) and the title screen is clean of the log bleed — shot_m17_title_clean.png; console clean. Test data cleared, browser closed.

Stage Summary:
- M1.7 closed: the betrayal engine remembers its own runs — each denouement becomes a line in the meta-chronicle on the title screen; players now see their past oaths (and knives) before entering the Mist again.
- Push to GitHub after commit (origin/main → M1.7).

---

Task ID: 13 (session 8, continued)
Agent: main
Task: M1.8 "The Oath" (intro ritual + hesitation echo + finale caw) + classic-shell chronicle fix

Work Log:
- Session start: verified GitHub state — M1.7 (8584c5b) was already pushed; local ref was stale (ahead 2), fixed via fetch to origin/main. Worktree clean.
- M1.8 implemented:
  - store.ts: Screen gains "oath"; start() now lands on the oath screen (fresh state prepared, NO save written yet — the oath is not sworn); new action oathSay(hesitated) — sets flags.oath_hesitated on silence, sfxWhisper on silence / sfxCaw on a spoken oath ("the omen answers the vow"), then screen play + NIGHT_TITLES[1] + persist + hasSave. Sounds arch: the crow caws at the finale choice moment too (choose() checks FINALE_EVENT_ID → sfxCaw).
  - scenario3d.ts: makeFinaleEvent — if flags.oath_hesitated, Мгла recalls the silence at the Pillar ("Клятва дрожала с первого слова") before the crow line.
  - chronicle.ts: ChronicleEntry.oath — the meta-chronicle marks the trembling oath.
  - OathScreen.tsx (new): full-screen ritual before night 1 — overline "СТОЛП ПРИСЯГИ · ПЕРЕД ПЕРВОЙ НОЧЬЮ", four gold oath lines fading in sequentially, italic closing "Это клятва. Пусть проверит её Мгла.", divider growth; main button "Произнести обет" (Enter/Space) and a quiet "…молчать" link; silence shows "Ты промолчал. Ночь заметила. Летопись тоже." for 1.7 s, then starts the run with the flag. Footnote: "то, что прозвучало в тишине, тоже [помнят]".
  - Hud.tsx: OathScreen wired at screen === "oath"; TopBar/Pult/LogTicker/Vignette guarded for the new screen; ChroniclePanel shows ⸸ (dark red, tooltip "обет был произнесён молчанием") for entries with oath; version M1.8 «Обет».
  - ClassicGame.tsx: classic shell now calls recordRun on finish too (chronicle is shared across shells — gap from M1.7 closed).
  - simulate3d.ts: window/localStorage shim for bun + section 7 — spoken oath is silent in the finale; the silence returns ("дрожала") before the crow line; chronicle marks oath=true/false correctly.
- Static checks: tsc (src + scripts) clean; eslint clean (fixed one unused eslint-disable in OathScreen); simulate3d ALL CHECKS PASSED (sections 1–7).
- Browser verification (all green): title shows «M1.8 «Обет»»; "Выйти в ночь" → oath screen with all four lines, NO save in localStorage before swearing — shot_m18_oath.png; "Произнести обет" → night 1 (screen play, no flag, save written); reload → "…молчать" → "Ты промолчал" notice — shot_m18_silence.png — then screen play with flags.oath_hesitated=true; jump to night III (startNight, fuel 90, finale hook) → finale text contains "дрожала" and the crow line follows it — shot_m18_finale_hes.png; choose(0) hold → "НОЖ ПОД КЛЯТВОЙ" — shot_m18_title_end.png; restart to title → chronicle panel shows the entry with the ⸸ mark and whisper count — shot_m18_chronicle_oath.png; console clean (only the old THREE.Clock deprecation). Test data cleared, browser closed.

Stage Summary:
- M1.8 closed: the game finally speaks its own name — the oath is spoken (or swallowed) at the Pillar before night one, and the engine of betrayal keeps the receipt: Мгла quotes the silence in the denouement, the chronicle stamps the trembling oath with ⸸.
- Push to GitHub after commit (origin/main → M1.8).

---

Task ID: 14 (session 8, continued)
Agent: main
Task: M1.9 "Shadow of the Oath" (the first morning remembers the silence at the Pillar)

Work Log:
- M1.9 implemented — the oath arc now spans the whole run: обет → утро → развязка → летопись.
  - day.ts: OATH_HESITATED_OPENING — four unique morning openings (gavrila hears how many words were in the vow vs silence; khodata counts words like a banner-bearer; miluta can't write the oath down; ratmir's southern roads call silent oaths a bad omen). makeDayTalk gains oathHesitated param; priority: walked-echo > oath-shadow > whisper-echo; the shadow applies only to the first morning (night === 1).
  - store.ts: openDayTalk passes oathHesitated = (night === 1 && flags.oath_hesitated).
  - Hud.tsx: version M1.9 «Тень обета».
  - simulate3d.ts: section 8 (9 checks) — all four companions open with the Pillar line; second morning forgets; shadow beats whisper-echo; walked beats shadow; the walked one stays silent; clean oath → old opening.
- Static checks: tsc + eslint clean; simulate3d ALL CHECKS PASSED (sections 1–8).
- Browser verification (all green): silence path → day II forced → Gavrila's talk opens with "Гаврила встречает тебя молча, но оберег шепчет громче обычного…" (shot_m19_oath_echo.png); sworn path → same talk opens with the standard угли line; console clean. Test data cleared, browser closed.

Stage Summary:
- M1.9 closed: the trembling oath now haunts the camp's first morning — the squad stood at the Pillar and heard the silence; the betrayal engine keeps every receipt of weakness.
- Push to GitHub after commit (origin/main → M1.9).
