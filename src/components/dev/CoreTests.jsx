'use client';

import { useState } from 'react';
import { Button, Heading } from '@/design-systems/meta';
import { runCoreSuite } from './core-cases';

const fmt = (v) => (typeof v === 'number' ? (Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(2) : v.toFixed(4)) : String(v));

/** Development-only runner for the audio-core functional tests. */
export default function CoreTests() {
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return <p className="text-sm">The audio-core test runner is available in development builds only.</p>;
  }

  const run = async () => {
    setRunning(true);
    setRows([]);
    const results = await runCoreSuite((row) => setRows((r) => [...r, row]));
    window.__coreResults = results;
    setRunning(false);
  };

  // Dev hook: window.__runCore(/pattern/) runs the matching tests and resolves with the rows.
  if (typeof window !== 'undefined') window.__runCore = (filter) => runCoreSuite(null, filter);

  const failures = rows.filter((r) => r.error || (r.checks && r.checks.some((c) => !c.pass))).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button size="lg" onClick={run} disabled={running}>
          {running ? 'Running…' : 'Run audio-core tests'}
        </Button>
        {!running && rows.length > 0 && (
          <span className="text-sm font-semibold" data-testid="summary">
            {failures === 0 ? `✓ All ${rows.length} tests passed` : `${failures} of ${rows.length} tests failed`}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id} className="border border-border p-3 text-sm">
            <Heading level={2}>{r.name}</Heading>
            {r.error && <pre className="whitespace-pre-wrap">{r.error}</pre>}
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
