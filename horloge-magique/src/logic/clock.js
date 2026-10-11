// Logique pure de l'horloge : t = minutes depuis minuit, angles en radians (sens horaire depuis 12 h).
const TWO_PI = Math.PI * 2;

export function normMinutes(t) {
  return ((t % 1440) + 1440) % 1440;
}

export function timeToAngles(t) {
  const n = normMinutes(t);
  return {
    minute: ((n % 60) / 60) * TWO_PI,
    hour: ((n % 720) / 720) * TWO_PI,
  };
}

export function angleDelta(a, b) {
  let d = (b - a) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  else if (d <= -Math.PI) d += TWO_PI;
  return d;
}

export function dragMinuteHand(t, prevAngle, newAngle) {
  return normMinutes(t + (angleDelta(prevAngle, newAngle) * 60) / TWO_PI);
}

export function dragHourHand(t, prevAngle, newAngle) {
  return normMinutes(t + (angleDelta(prevAngle, newAngle) * 720) / TWO_PI);
}

export function pointerAngle(x, y) {
  const a = Math.atan2(x, y);
  return a < 0 ? a + TWO_PI : a;
}

export function snap(t, step) {
  return normMinutes(Math.round(t / step) * step);
}

function hour12(t) {
  const h = Math.floor(normMinutes(t) / 60) % 12;
  return h === 0 ? 12 : h;
}

export function formatDigital(t) {
  const n = Math.round(normMinutes(t)) % 1440;
  const m = n % 60;
  return `${hour12(n)}:${String(m).padStart(2, '0')}`;
}

function hourName(h24) {
  const h = ((h24 % 24) + 24) % 24;
  if (h === 0) return 'minuit';
  if (h === 12) return 'midi';
  const n = h % 12;
  return `${n} ${n === 1 ? 'heure' : 'heures'}`;
}

export function sayTime(t) {
  const n = Math.round(normMinutes(t)) % 1440;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (m === 0) return hourName(h);
  if (m === 30) return `${hourName(h)} et demie`.replace('midi et demie', 'midi et demi').replace('minuit et demie', 'minuit et demi');
  if (m === 15) return `${hourName(h)} et quart`;
  if (m === 45) return `${hourName(h + 1)} moins le quart`;
  return `${hourName(h)} ${m}`;
}

export function sameOnDial(a, b) {
  return Math.round(normMinutes(a)) % 720 === Math.round(normMinutes(b)) % 720;
}
