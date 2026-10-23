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

