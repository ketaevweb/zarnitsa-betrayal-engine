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
- Next ideas: M1.4 — see session notes (deepening betrayal / third night finale prep).
