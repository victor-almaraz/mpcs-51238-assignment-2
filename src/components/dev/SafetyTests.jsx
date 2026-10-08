'use client';

import { useState } from 'react';
import { Button, Heading } from '@/design-systems/meta';
import { runSafetySuite } from './safety-cases';

const fmt = (v) => (typeof v === 'number' ? (Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(2) : v.toFixed(4)) : String(v));

/** Development-only runner for the audio-safety acceptance renders. */
export default function SafetyTests() {
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return <p className="text-sm">The safety test runner is available in development builds only.</p>;
  }

  const run = async () => {
    setRunning(true);
    setRows([]);
    const results = await runSafetySuite((row) => setRows((r) => [...r, row]));
    window.__safetyResults = results;
    setRunning(false);
  };

  const failures = rows.filter((r) => r.error || (r.checks && r.checks.some((c) => !c.pass))).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button size="lg" onClick={run} disabled={running}>
          {running ? 'Running…' : 'Run safety tests'}
        </Button>
        {!running && rows.length > 0 && (
          <span className="text-sm font-semibold" data-testid="summary">
            {failures === 0 ? '✓ All cases passed' : `${failures} case(s) failed`}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={`${r.id}-${r.sampleRate}`} className="border border-border p-3 text-sm">
            <Heading level={2}>
              Case {r.id} · {r.sampleRate / 1000} kHz — {r.name}
            </Heading>
            {r.skipped && <p>Skipped: {r.skipped}</p>}
            {r.error && <pre className="whitespace-pre-wrap">{r.error}</pre>}
            {r.reduced && <p>Reduced safety mode (fallback stage)</p>}
            {r.checks && (
              <ul>
                {r.checks.map((c) => (
                  <li key={c.name} className="tabular-nums">
                    {c.pass ? '✓ pass' : '✗ FAIL'} — {c.name}: {fmt(c.value)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
