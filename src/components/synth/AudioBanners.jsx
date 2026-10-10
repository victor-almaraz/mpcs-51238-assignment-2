'use client';

import { useDesignSystem } from './design-system-context';
import { rowInner } from './layout';

/**
 * Audio state banners and error alerts under the transport (controls-and-accessibility.md
 * "UI states catalogue"). Banners announced through the live regions use live={false}.
 */
export default function AudioBanners({ ui, alerts, actions }) {
  const { Alert, Button } = useDesignSystem();
  return (
    <div className={`${rowInner} flex flex-col gap-2 empty:hidden`}>
      {ui.audioState === 'paused' && (
        <Alert tone="warning" action={<Button onClick={actions.resumeAudio}>Resume Audio</Button>}>
          Audio is paused by the browser.
        </Alert>
      )}
      {ui.audioState === 'failed' && (
        <Alert tone="error" live={false} action={<Button onClick={actions.restartAudio}>Restart Audio</Button>}>
          The audio safety stage stopped, so output is silent.
        </Alert>
      )}
      {ui.ducked && (
        <Alert tone="warning" live={false} action={<Button onClick={actions.restoreLevel}>Restore Level</Button>}>
          Level reduced — sustained loud output.
        </Alert>
      )}
      {alerts.map((a) => (
        <Alert key={a.key} tone={a.tone} onDismiss={() => actions.dismissAlert(a.key)}>
          {a.text}
        </Alert>
      ))}
    </div>
  );
}
