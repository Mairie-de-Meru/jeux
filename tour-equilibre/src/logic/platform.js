export function platformTilt(t, platform) {
  if (!platform) return 0;
  return platform.amplitude * Math.sin((2 * Math.PI * t) / platform.period);
}
