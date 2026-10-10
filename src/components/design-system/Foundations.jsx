'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Entry, Panel } from './parts';

/** Colour tokens, with the literal swatch class for Tailwind's scanner. */
const COLOURS = [
  ['bg', 'bg-bg'],
  ['surface', 'bg-surface'],
  ['surface-2', 'bg-surface-2'],
  ['hover', 'bg-hover'],
  ['active', 'bg-active'],
  ['fg', 'bg-fg'],
  ['muted', 'bg-muted'],
  ['border', 'bg-border'],
  ['border-strong', 'bg-border-strong'],
  ['level-low', 'bg-level-low'],
  ['level-mid', 'bg-level-mid'],
  ['level-high', 'bg-level-high'],
  ['accent', 'bg-accent'],
  ['accent-fg', 'bg-accent-fg'],
  ['accent-hover', 'bg-accent-hover'],
  ['selected', 'bg-selected'],
  ['selected-fg', 'bg-selected-fg'],
  ['focus', 'bg-focus'],
  ['danger', 'bg-danger'],
  ['danger-bg', 'bg-danger-bg'],
  ['warning', 'bg-warning'],
  ['warning-bg', 'bg-warning-bg'],
  ['success', 'bg-success'],
  ['success-bg', 'bg-success-bg'],
];

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Resolved rgb() of a swatch element's background, as [r, g, b]. */
function backgroundOf(el) {
  const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
  return m ? m.slice(0, 3).map(Number) : null;
}

function hex(rgb) {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Swatches with each token's resolved value and its contrast against bg. */
function Swatches() {
  const refs = useRef({});
  const bgRef = useRef(null);
  const [info, setInfo] = useState({});

  useLayoutEffect(() => {
    const bg = backgroundOf(bgRef.current);
    const next = {};
    for (const [name] of COLOURS) {
      const rgb = backgroundOf(refs.current[name]);
      if (rgb && bg) next[name] = { hex: hex(rgb), ratio: contrast(rgb, bg).toFixed(1) };
    }
    setInfo(next);
  }, []);

  return (
    <ul ref={bgRef} className="grid grid-cols-2 gap-3 bg-bg sm:grid-cols-3 lg:grid-cols-4">
      {COLOURS.map(([name, cls]) => (
        <li key={name} className="flex items-center gap-3">
          <span
            ref={(el) => {
              refs.current[name] = el;
            }}
            aria-hidden="true"
            className={`h-10 w-10 shrink-0 border border-border ${cls}`}
          />
          <span className="flex min-w-0 flex-col text-xs">
            <span className="font-bold">{name}</span>
            <span className="text-muted tabular-nums">
              {info[name] ? `${info[name].hex} · ${info[name].ratio}:1 on bg` : '\u00a0'}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Colour and type: the tokens every component is built from. */
export default function Foundations({ ds, style }) {
  const { Badge, Button, Chip, Heading, fontClassName } = ds;
  return (
    <>
      <Entry
        id="colour"
        title="Colour"
        note="Semantic tokens from the style's tokens.css. Contrast is measured in the browser against bg; text needs 4.5:1 and control boundaries 3:1. border is a divider only."
      >
        <Panel style={style} fontClassName={fontClassName}>
          <Swatches />
        </Panel>
      </Entry>

      <Entry id="type" title="Type" note="Display face for headings, interface face for everything else.">
        <Panel style={style} fontClassName={fontClassName}>
          <div className="flex flex-col gap-1">
            <Heading level={1}>Synthesizer Rack</Heading>
            <span className="text-xs text-muted">Heading level 1 (page title)</span>
          </div>
          <div className="flex flex-col gap-1">
            <Heading level={2}>Subtractive 1</Heading>
            <span className="text-xs text-muted">Heading level 2 (widget and dialog titles)</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <Button>Load File…</Button>
              <Chip>Live</Chip>
              <Badge>Limit</Badge>
            </div>
            <span className="text-xs text-muted">Control labels</span>
          </div>
          <div className="flex max-w-prose flex-col gap-1">
            <p className="text-sm">
              Loaded nocturne.mid — 6 parts, 3:10. Cutoff 2.0 kHz, Release 350 ms, Volume −6.0 dB.
            </p>
            <p className="text-sm text-muted">Muted text: field labels, captions and hints.</p>
            <span className="text-xs text-muted">Body and readouts (tabular figures: 0123456789)</span>
          </div>
        </Panel>
      </Entry>
    </>
  );
}
