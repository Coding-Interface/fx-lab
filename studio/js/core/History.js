/**
 * History — undo / redo for one editor. Stores snapshots (strings) of the
 * editor state. Rapid changes, like dragging a slider, are grouped into one
 * step: a snapshot is only committed once edits pause.
 */
class History {
  constructor(limit = 150, settleMs = 400) {
    this.limit = limit;
    this.settleMs = settleMs;
    this.undoStack = [];
    this.redoStack = [];
    this.present = null;
    this.timer = null;
    this.pending = null;
    this.listeners = [];
  }

  /** Start fresh from this state (opening a preset). */
  reset(snapshot) {
    clearTimeout(this.timer);
    this.pending = null;
    this.undoStack = [];
    this.redoStack = [];
    this.present = snapshot;
    this.emit();
  }

  /** Something changed; take() is called once edits settle. */
  touch(take) {
    this.pending = take;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.settleMs);
    this.emit();
  }

  /** Commit a waiting change now (before undo, save, switching). */
  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.pending) return;
    const snap = this.pending();
    this.pending = null;
    if (snap === this.present) { this.emit(); return; }
    if (this.present != null) this.undoStack.push(this.present);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.present = snap;
    this.redoStack = [];
    this.emit();
  }

  canUndo() { return this.undoStack.length > 0 || !!this.pending; }

  canRedo() { return !this.pending && this.redoStack.length > 0; }

  /** Returns the snapshot to restore, or null. */
  undo() {
    this.flush();
    if (!this.undoStack.length) return null;
    this.redoStack.push(this.present);
    this.present = this.undoStack.pop();
    this.emit();
    return this.present;
  }

  redo() {
    this.flush();
    if (!this.redoStack.length) return null;
    this.undoStack.push(this.present);
    this.present = this.redoStack.pop();
    this.emit();
    return this.present;
  }

  onChange(fn) { this.listeners.push(fn); }

  emit() { this.listeners.forEach((fn) => fn(this)); }
}
