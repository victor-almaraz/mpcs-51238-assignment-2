'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { EmptyState, Heading } from '@/design-systems/meta';
import { VOLUME } from '@/audio/synths/param-defs';
import { audioSessionSupported } from '@/audio/context';
import { parseMidi, MAX_MIDI_BYTES } from '@/midi/parse';
import { parsePatch, resolvePart } from '@/patch/validate';
import { readPatchFile, savePatch } from '@/patch/file-io';
import { decodeSample, SampleError, MAX_SAMPLE_SECONDS } from '@/audio/sample';
import { initialRack, rackReducer } from '@/state/rack';
import { Session } from '@/state/session';
import Transport from './Transport';
import FileMenu from './FileMenu';
import AddSynthMenu from './AddSynthMenu';
import AudioBanners from './AudioBanners';
import StatusRegions from './StatusRegions';
import StartNotice from './StartNotice';
import WidgetCard from './widgets/WidgetCard';
import { formatClock } from './format';
import { rackPanel, rowInner, rowPad } from './layout';

const INITIAL_UI = {
  audioState: 'idle',          // idle | starting | running | paused | failed | error
  reducedSafety: false,
  ducked: false,
  masterDb: VOLUME.masterDefault,
  masterMuted: false,
  maxMasterDb: VOLUME.max,
  caps: { ks: null, recorder: null },
  playing: false,
  keyboardOn: false,
  octave: 'C4',
  canOctaveDown: true,
  canOctaveUp: true,
  midiStatus: null,
  recState: 'idle',            // idle | recording | saving
  recPeakDb: -Infinity,
  recClipped: false,
  renderState: 'idle',         // idle | rendering | saving
  renderProgress: null,
};

let messageId = 0;

function isOldIOS() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !audioSessionSupported();
}

export default function SynthApp() {
  const [rack, dispatch] = useReducer(rackReducer, initialRack);
  const [ui, setUi] = useState(INITIAL_UI);
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(null);           // { song, name }
  const [readingMidi, setReadingMidi] = useState(false);
  const [format, setFormat] = useState('pcm16');
  const [polite, setPolite] = useState(null);
  const [assertive, setAssertive] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [oldIOS, setOldIOS] = useState(false);
  const noticeAck = useRef(false);
  const pendingAction = useRef(null);
  const headings = useRef(new Map());
  const focusNew = useRef(false);
  const undo = useRef(null);           // { id, run }: offered while toast `id` is visible

  /** Shows a status toast and returns its id. */
  const say = useCallback((text, opts = {}) => {
    const msg = { id: ++messageId, text, action: opts.action ?? null, details: opts.details ?? null };
    if (opts.assertive) setAssertive(msg);
    else setPolite(msg);
    return msg.id;
  }, []);

  /** Shows a toast with Undo; `run` stays available until that toast is gone. */
  const sayWithUndo = (text, run, opts = {}) => {
    undo.current = { id: say(text, { ...opts, action: 'undo' }), run };
  };

  const dismissMessage = useCallback((id) => {
    setPolite((m) => (m && m.id === id ? null : m));
    setAssertive((m) => (m && m.id === id ? null : m));
    if (undo.current?.id === id) undo.current = null;
  }, []);

  const showAlert = useCallback(({ key, tone = 'error', text }) => {
    setAlerts((list) => {
      const rest = list.filter((a) => a.key !== key);
      return text ? [...rest, { key, tone, text }] : rest;
    });
  }, []);

  // The session lives outside React; created after mount (never during prerender).
  useEffect(() => {
    const s = new Session({
      onUi: (patch) => setUi((u) => ({ ...u, ...patch })),
      onMessage: ({ text, assertive: a, action }) => say(text, { assertive: a, action }),
      onAlert: showAlert,
    });
    setSession(s);
    setOldIOS(isOldIOS());
    if (process.env.NODE_ENV !== 'production') window.__synthSession = s;   // dev debugging only
    return () => s.dispose();
  }, [say, showAlert]);

  useEffect(() => {
    session?.setWidgets(rack.widgets);
    if (focusNew.current && rack.widgets.length > 0) {
      focusNew.current = false;
      const last = rack.widgets[rack.widgets.length - 1];
      const el = headings.current.get(last.id);
      if (el) {
        el.focus({ preventScroll: true });
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.closest('li')?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'instant' : 'smooth' });
      }
    }
  }, [session, rack.widgets]);

  // Escape triggers Panic when no menu or dialog is open (controls-and-accessibility.md).
  useEffect(() => {
    if (!session) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('dialog[open], [data-menu-open]')) return;
      session.panic();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  /** Runs `fn` with audio starting; the first start in a session goes through the notice. */
  const withAudio = (fn) => {
    if (!session) return;
    if (noticeAck.current) {
      session.startAudio();
      fn();
      return;
    }
    pendingAction.current = fn;
    setNoticeOpen(true);
  };

  const startFromNotice = () => {
    noticeAck.current = true;
    setNoticeOpen(false);
    session.startAudio();
    const fn = pendingAction.current;
    pendingAction.current = null;
    fn?.();
  };

  const cancelNotice = () => {
    pendingAction.current = null;
    setNoticeOpen(false);
  };

  const song = loaded ? loaded.song : null;

  // ----- rack actions -----

  const addSynth = (type) => withAudio(() => {
    focusNew.current = true;
    dispatch({ type: 'add', synth: type });
  });

  const widgetActions = {
    update: (id, fields) => dispatch({ type: 'update', id, fields }),
    param: (id, name, value) => dispatch({ type: 'param', id, name, value }),
    harmonic: (id, index, value) => dispatch({ type: 'harmonic', id, index, value }),
    arm: (id, armed) => {
      if (!armed) session?.disarm(id);
      dispatch({ type: 'update', id, fields: { armed } });
    },
    /** Decodes and conditions a granular sample (sample.js); it becomes the widget's source. */
    loadSample: (id, file) => {
      decodeSample(file)
        .then(({ buffer, name, seconds, truncated }) => {
          dispatch({ type: 'sample', id, sample: { name, buffer, seconds } });
          showAlert({ key: 'sample', text: null });
          say(`Loaded sample ${name} (${seconds.toFixed(1)} s${truncated ? `, first ${MAX_SAMPLE_SECONDS} s kept` : ''})`);
        })
        .catch((err) => {
          const reason = err instanceof SampleError ? err.message : 'unknown error';
          showAlert({ key: 'sample', text: `Couldn't load ${file.name}: ${reason}` });
        });
    },
    remove: (id) => {
      const index = rack.widgets.findIndex((w) => w.id === id);
      if (index < 0) return;
      const widget = rack.widgets[index];
      dispatch({ type: 'remove', id });
      const restored = { ...widget, armed: false };
      sayWithUndo(`Removed ${widget.name}`, () => {
        dispatch({ type: 'restore', widget: restored, index });
        say(`Restored ${widget.name}`);
      });
    },
  };

  const onStatusAction = (action, id) => {
    if (action === 'undo') {
      const u = undo.current;
      if (!u || u.id !== id) return;
      undo.current = null;
      u.run();
    } else if (action === 'download-again') {
      session?.downloadAgain();
    }
  };

  // ----- files -----

  const loadMidi = (file) => {
    if (file.size > MAX_MIDI_BYTES) {
      showAlert({ key: 'midi', text: `Couldn't read ${file.name}: the file is larger than 4 MB.` });
      return;
    }
    setReadingMidi(true);
    file.arrayBuffer()
      .then((buf) => {
        const parsed = parseMidi(buf);
        session?.setSong(parsed, file.name);
        setLoaded({ song: parsed, name: file.name });
        showAlert({ key: 'midi', text: null });
        const partWarnings = [];
        dispatch({
          type: 'parts',
          resolve: (w) => resolvePart(w.requestedPart ?? w.part, parsed, partWarnings, w.partLabel),
        });
        const n = parsed.parts.length;
        const warn = parsed.warnings.length ? ` (${parsed.warnings.length} warning${parsed.warnings.length === 1 ? '' : 's'})` : '';
        say(`Loaded ${file.name} — ${n} part${n === 1 ? '' : 's'}, ${formatClock(parsed.durationSeconds)}${warn}`, {
          details: parsed.warnings.length ? parsed.warnings : null,
        });
      })
      .catch((err) => {
        showAlert({ key: 'midi', text: `Couldn't read ${file.name}: ${err?.message || 'unknown error'}` });
      })
      .finally(() => setReadingMidi(false));
  };

  /** Replaces the rack at once; a non-empty rack can be brought back with Undo (GNOME HIG). */
  const applyPatch = (parsed) => {
    const previous = rack.widgets;
    session.replaceRack(() => dispatch({ type: 'replace', widgets: parsed.widgets }));
    const n = parsed.warnings.length;
    const text = n ? `Patch loaded (${n} setting${n === 1 ? '' : 's'} adjusted)` : 'Patch loaded';
    const details = n ? parsed.warnings : null;
    if (previous.length === 0) {
      say(text, { details });
      return;
    }
    sayWithUndo(text, () => {
      session.replaceRack(() => dispatch({ type: 'restoreAll', widgets: previous }));
      say('Previous rack restored');
    }, { details });
  };

  const loadPatch = (file) => {
    readPatchFile(file)
      .then((text) => {
        const parsed = parsePatch(text, song);
        showAlert({ key: 'patch', text: null });
        applyPatch(parsed);
      })
      .catch((err) => showAlert({ key: 'patch', text: `Couldn't load patch: ${err?.message || 'unknown error'}` }));
  };

  // ----- transport actions -----

  const actions = {
    playToggle: () => {
      if (!session || !song) return;
      if (ui.playing) session.stop();
      else withAudio(() => session.play());
    },
    recordToggle: () => {
      if (!session) return;
      if (ui.recState === 'recording') session.stopRecording();
      else session.startRecording(format);
    },
    master: (db) => session?.setMaster(db),
    panic: () => session?.panic(),
    unmute: () => session?.unmute(),
    loadMidi,
    loadPatch,
    savePatch: () => {
      savePatch(rack.widgets);
      say('Download started');
    },
    render: () => session?.renderWav(format),
    cancelRender: () => session?.cancelRender(),
    keyboardToggle: () => {
      if (!session) return;
      if (ui.keyboardOn) session.setKeyboard(false);
      else withAudio(() => session.setKeyboard(true));
    },
    octave: (dir) => session?.shiftOctave(dir),
    connectMidi: () => withAudio(() => session.connectMidi()),
    resumeAudio: () => session?.resumeAudio(),
    restartAudio: () => session?.restartAudio(),
    restoreLevel: () => session?.restoreLevel(),
    dismissAlert: (key) => showAlert({ key, text: null }),
  };

  const pluckEngine = ui.audioState === 'starting' ? 'loading' : ui.caps.ks === false ? 'unavailable' : 'ready';
  const empty = rack.widgets.length === 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className={`border-b border-border ${rowPad} py-6 md:py-10`}>
        <div className={`${rowInner} flex flex-wrap items-end justify-between gap-x-6 gap-y-2`}>
          <Heading level={1}>Synthesizer Rack</Heading>
          <Link href="/" className="text-sm underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            Back to Hub
          </Link>
        </div>
      </header>

      <Transport
        session={session}
        ui={ui}
        song={song}
        songName={loaded ? loaded.name : null}
        readingMidi={readingMidi}
        fileMenu={
          <FileMenu
            ui={ui}
            hasWidgets={!empty}
            readingMidi={readingMidi}
            format={format}
            onFormat={setFormat}
            actions={actions}
          />
        }
        actions={actions}
      />

      <main className={`flex flex-1 flex-col gap-4 ${rowPad} pt-6 pb-40 lg:pb-8`}>
        <AudioBanners ui={ui} alerts={alerts} actions={actions} />

        <section aria-label="Synth rack" className={`${rowInner} ${rackPanel} flex flex-col gap-4`}>
          {empty ? (
            <EmptyState title="No synths yet. Add a synth to start.">
              <AddSynthMenu onAdd={addSynth} pluckAvailable={ui.caps.ks} />
            </EmptyState>
          ) : (
            <AddSynthMenu onAdd={addSynth} pluckAvailable={ui.caps.ks} className="w-full md:w-auto md:self-start" />
          )}
          {!empty && (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rack.widgets.map((w) => (
                <li key={w.id}>
                  <WidgetCard
                    widget={w}
                    song={song}
                    pluckEngine={pluckEngine}
                    headingRef={(el) => {
                      if (el) headings.current.set(w.id, el);
                      else headings.current.delete(w.id);
                    }}
                    actions={widgetActions}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <StatusRegions polite={polite} assertive={assertive} onAction={onStatusAction} onDismiss={dismissMessage} />
      </main>

      <StartNotice open={noticeOpen} onStart={startFromNotice} onCancel={cancelNotice} silentSwitchNote={oldIOS} />
    </div>
  );
}
