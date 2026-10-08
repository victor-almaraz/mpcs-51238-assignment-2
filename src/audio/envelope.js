// Click-free envelope helpers (audio-engine-core.md). `.value` is never set while audio runs.
//
// A voice carries a model of its envelope so the value at any time can be computed without
// reading AudioParam.value (which lags automation and cannot see the future):
//   start, attack, peak          linear attack to a held peak
//   offTime, relFrom, tau        exponential release from relFrom starting at offTime

export const MIN_ATTACK = 0.002;
export const MIN_RELEASE = 0.01;
export const FAST_TAU = 0.0033;     // allNotesOff: ~10 ms fast release
export const STEAL_TAU = 0.0015;    // stolen voice: 5 ms fade

/** cancelAndHoldAtTime when available (not in Firefox), else cancel + set from the model. */
export function holdAt(param, t, valueAtT) {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(t);
  else { param.cancelScheduledValues(t); param.setValueAtTime(valueAtT, t); }
}

function attackValue(v, t) {
  if (t <= v.start) return 0;
  const x = (t - v.start) / v.attack;
  return x >= 1 ? v.peak : x * v.peak;
}

export function envValueAt(v, t) {
  if (!(t > v.offTime)) return attackValue(v, t);
  return v.relFrom * Math.exp(-(t - v.offTime) / v.tau);
}

export function scheduleAttack(param, v) {
  param.setValueAtTime(0, v.start);
  param.linearRampToValueAtTime(v.peak, v.start + v.attack);
}

/** Starts an exponential release on `param` at `t` with time constant `tau`; updates the model. */
export function scheduleRelease(param, v, t, tau) {
  const from = envValueAt(v, t);
  holdAt(param, t, from);
  param.setTargetAtTime(0, t, tau);
  v.offTime = t;
  v.relFrom = from;
  v.tau = tau;
}
