// Historique annuler/refaire : instantanés opaques (la logique n'en lit pas le contenu).
export function createHistory(limit = 30) {
  let undoStack = [];
  let redoStack = [];
  return {
    /** Enregistre l'état AVANT une action ; vide la pile « refaire ». */
    push(s) {
      undoStack.push(s);
      if (undoStack.length > limit) undoStack.shift();
      redoStack = [];
    },
    /** Renvoie l'état précédent (ou null), et garde `current` pour refaire. */
    undo(current) {
      if (!undoStack.length) return null;
      redoStack.push(current);
      return undoStack.pop();
    },
    redo(current) {
      if (!redoStack.length) return null;
      undoStack.push(current);
      return redoStack.pop();
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() { undoStack = []; redoStack = []; },
  };
}
