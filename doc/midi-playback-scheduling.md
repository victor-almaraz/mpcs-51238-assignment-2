# MIDI playback scheduling

## Scope
Turning `Song.notes` into `noteOn`/`noteOff` calls on widgets, timed on the `AudioContext` clock. Covers transport, routing, mute/solo and the offline scheduling mode. Parsing is in `midi-decoding.md`; live keyboard and MIDI input in `live-input.md`.

## Pattern: lookahead scheduler ("A Tale of Two Clocks")
- The JS timer only *wakes* the scheduler. The audio clock (`ctx.currentTime`) decides *when* things happen.
- Defaults from the article's metronome: **timer interval 25 ms, schedule-ahead window 100 ms**.
```ts
const INTERVAL_MS = 25;
let lookahead = 0.1;              // seconds
let songStartCtxTime = 0;         // ctx time corresponding to song time 0
let songOffset = 0;               // song seconds at which playback began (seek)
let nextIndex = 0;                // index into notes sorted by start

function tick() {
  const now = ctx.currentTime;
  const horizon = now + lookahead;
  while (nextIndex < notes.length) {
    const n = notes[nextIndex];
    const t = songStartCtxTime + (n.start - songOffset);
    if (t > horizon) break;
    if (t >= now - 0.005) dispatch(n, Math.max(t, now));   // skip notes already late by > 5 ms
    nextIndex++;
  }
  if (nextIndex >= notes.length && now > songStartCtxTime + (endTime - songOffset)) stop();
}
timer = setInterval(tick, INTERVAL_MS);
```
- `dispatch` calls `noteOn(pitch, vel, t, 'file')` **and** `noteOff(pitch, t + duration, 'file')` at the same moment; instruments accept a `noteOff` with a future time (`audio-engine-core.md`).
- Playback starts with a 50 ms offset: `songStartCtxTime = ctx.currentTime + 0.05`.

## Transport
| Action | Implementation |
|---|---|
| Play | `await ensureRunning()` inside the click handler; set `songStartCtxTime = now + 0.05`; `songOffset = position`; `nextIndex = lowerBound(notes, position)`; start the timer |
| Pause | `position = currentSongTime()`; clear the timer; `releaseAll()`; keep `position` |
| Stop | clear the timer; `releaseAll()`; `position = 0` |
| Seek | if playing: clear the timer, `releaseAll()`, restart at the new position; if paused: set `position` |
| Position for UI | `currentSongTime = songOffset + (ctx.currentTime - songStartCtxTime)`, read in `requestAnimationFrame`; never drive audio from rAF |

- Notes already sounding at the seek point (`start < pos < start+duration`) are not re-triggered.
- Pause stops the scheduler; it does not suspend the AudioContext. Suspending freezes `currentTime`, which cuts release tails and complicates resume.

## Releasing all voices
- `releaseAll(at = ctx.currentTime)` calls `widget.allNotesOff(at)` on every widget, releasing file and live voices. Each widget cancels scheduled automation, ramps every voice gain to 0 over ~10 ms, then stops its sources.
- Notes are scheduled up to 100 ms ahead, so instruments also **discard voices whose start time is in the future** by calling `stop()` on them. For oscillators and AudioBufferSourceNodes that haven't started, calling `stop()` before start is legal.
- `releaseAll()` runs on: Stop, Pause, Seek, widget removal, and the Panic control (`audio-safety.md`). Part reassignment releases only the affected widget.

## Background tabs and timer throttling
- Chrome's behaviour:
  - Hidden pages get their timers aligned to once per second.
  - "Intensive throttling" (timers checked once per minute) applies when all of these hold:
    - the page has been hidden for more than 5 minutes (Chrome has proposed shortening this for fully loaded pages on desktop),
    - the timer chain count is 5 or greater,
    - the page has been silent for at least 30 seconds,
    - WebRTC is not in use.
  - Pages that made sound in that window are exempt, but a silent audio track doesn't count.
- Consequence: during long silent passages in a hidden tab, `setInterval` can stall for longer than a 100 ms lookahead.
- Mitigation:
  - On `visibilitychange` to hidden, raise `lookahead` to 1.5 s (exceeds the 1 s alignment). Restore 0.1 s when visible.
  - While hidden, parameter changes take effect up to 1.5 s late.
  - If a gap is detected (`now - lastTick > lookahead`), skip notes that are now in the past instead of playing them in a burst.

## Routing by part
- Each widget has a `part` field: `"all"` or a part key from `Song.parts` (`midi-decoding.md`). The user sets it with the widget's part select.
- One widget plays one part or all parts. Several widgets may play the same part (layering).
```ts
const partKey = (n: Note) => `t${n.track}c${n.channel}`;
function dispatch(n: Note, t: number) {
  for (const w of widgets) {
    if (!isAudible(w)) continue;
    if (w.part !== 'all' && w.part !== partKey(n)) continue;
    w.instrument.noteOn(n.pitch, n.velocity, t, 'file');
    w.instrument.noteOff(n.pitch, t + n.duration, 'file');
  }
}
```
- Reassigning a widget's part during playback calls `allNotesOff(now)` for that widget. The new routing applies from the next scheduled note.
- Parts with no widget assigned (and no widget on `"all"`) are silent.

## Mute / solo
- `anySolo = widgets.some(w => w.solo)`.
- `isAudible(w) = !w.muted && (!anySolo || w.solo)`.
- Apply this in **two** places:
  1. In `dispatch`, skip non-audible widgets so they spend no CPU on voices.
  2. On the widget's output gain, ramp to 0 (or back to its volume) over 10 ms, so notes already sounding are cut cleanly.
- Mute wins over solo when both are set on the same widget.
- The same `isAudible` rule applies to live input (`live-input.md`).

## Tempo accuracy
- Tempo is applied at parse time (`midi-decoding.md`), so the scheduler works only in seconds.
- Times are computed from `songStartCtxTime + n.start - songOffset`, never accumulated per note.

## Offline mode
Used by offline render (`recording.md`).
- No timer and no lookahead. `scheduleRange(from, to)` dispatches every note with `from ≤ n.start < to`, at context time `n.start` (song time 0 = context time 0).
- Routing, mute/solo and part assignment apply as in live playback. Live arming is ignored.
- Granular grain emission for notes in the range is scheduled in the same call.
- `releaseAll()` and the transport are not used.

## Sources
- Chris Wilson, "A Tale of Two Clocks", web.dev (https://web.dev/articles/audio-scheduling)
- Chrome for Developers, "Heavy throttling of chained JS timers beginning in Chrome 88" (https://developer.chrome.com/blog/timer-throttling-in-chrome-88/)
- Chrome for Developers, "Background tabs in Chrome 57" (https://developer.chrome.com/blog/background_tabs)
