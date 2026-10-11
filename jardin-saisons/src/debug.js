// Crochet de débogage : window.__jardin
export function installDebug(ctrl) {
  window.__jardin = {
    state: () => ctrl.state(),
    goto: (activity, level) => ctrl.goto(activity, level),
    solve: () => ctrl.solve(),
    season: (s) => ctrl.season(s),
  };
}
