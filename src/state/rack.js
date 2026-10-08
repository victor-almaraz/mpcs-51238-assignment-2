// Rack state: widgets (type, params, part, mute/solo, volume, live arming) and its reducer.
// Arming and widget names are session state; patches store the rest (patch-format.md).

import { SYNTH_INFO, VOLUME, coerceParam, defaultParams, getDef } from '../audio/synths/param-defs.js';

let nextId = 1;

export const initialRack = { widgets: [] };

function nextName(widgets, type) {
  let n = 0;
  const prefix = `${SYNTH_INFO[type].label} `;
  for (const w of widgets) {
    if (w.type !== type || !w.name.startsWith(prefix)) continue;
    const k = Number(w.name.slice(prefix.length));
    if (Number.isInteger(k) && k > n) n = k;
  }
  return `${prefix}${n + 1}`;
}

/** Builds a widget for the rack; `fields` comes from parsePatch or is empty for a new widget. */
export function createWidget(type, widgets, fields = {}) {
  return {
    id: `w${nextId++}`,
    type,
    name: nextName(widgets, type),
    muted: fields.muted === true,
    solo: fields.solo === true,
    armed: false,
    volumeDb: fields.volumeDb ?? VOLUME.widgetDefault,
    part: fields.part ?? 'all',
    requestedPart: fields.requestedPart ?? null,
    partLabel: fields.partLabel ?? null,
    params: fields.params ?? defaultParams(type),
  };
}

export function rackReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const w = createWidget(action.synth, state.widgets);
      // A newly added widget is armed when no other widget is armed (live-input.md).
      if (!state.widgets.some((x) => x.armed)) w.armed = true;
      return { widgets: [...state.widgets, w] };
    }
    case 'remove':
      return { widgets: state.widgets.filter((w) => w.id !== action.id) };
    case 'restore': {
      const widgets = state.widgets.slice();
      widgets.splice(Math.min(action.index, widgets.length), 0, action.widget);
      return { widgets };
    }
    case 'update':
      return { widgets: state.widgets.map((w) => (w.id === action.id ? { ...w, ...action.fields } : w)) };
    case 'param': {
      return {
        widgets: state.widgets.map((w) => {
          if (w.id !== action.id) return w;
          const def = getDef(w.type, action.name);
          if (!def) return w;
          return { ...w, params: { ...w.params, [action.name]: coerceParam(def, action.value) } };
        }),
      };
    }
    case 'harmonic': {
      return {
        widgets: state.widgets.map((w) => {
          if (w.id !== action.id) return w;
          const h = w.params.harmonics.slice();
          h[action.index] = action.value;
          return { ...w, params: { ...w.params, harmonics: coerceParam(getDef(w.type, 'harmonics'), h) } };
        }),
      };
    }
    case 'replace': {
      const widgets = [];
      for (const f of action.widgets) widgets.push(createWidget(f.type, widgets, f));
      if (widgets.length > 0) widgets[0].armed = true;
      return { widgets };
    }
    case 'parts': {
      // Re-resolve every widget's part against a newly loaded song.
      return { widgets: state.widgets.map((w) => ({ ...w, ...action.resolve(w) })) };
    }
    default:
      return state;
  }
}
