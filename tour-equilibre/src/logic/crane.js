export function craneX(t, crane) {
  return crane.amplitude * Math.sin((2 * Math.PI * t) / crane.period);
}
export function craneHeight(towerHeight) {
  return towerHeight + 3;
}
