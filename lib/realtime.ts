export type PollEvent = { type: "votes:updated" };

type Listener = (event: PollEvent) => void;

type Registry = Map<string, Set<Listener>>;

const globalKey = Symbol.for("pollcraft.realtime");

const listeners: Registry = (() => {
  const globalObj = globalThis as typeof globalThis & { [globalKey]?: Registry };
  if (!globalObj[globalKey]) {
    globalObj[globalKey] = new Map();
  }
  return globalObj[globalKey]!;
})();

export function subscribeToPoll(pollId: string, listener: Listener) {
  const set = listeners.get(pollId) ?? new Set();
  set.add(listener);
  listeners.set(pollId, set);
  return () => {
    const next = listeners.get(pollId);
    if (!next) return;
    next.delete(listener);
    if (next.size === 0) {
      listeners.delete(pollId);
    }
  };
}

export function publishPollEvent(pollId: string, event: PollEvent) {
  const set = listeners.get(pollId);
  if (!set || set.size === 0) return;
  for (const listener of Array.from(set)) {
    try {
      listener(event);
    } catch (error) {
      console.error("[realtime] listener error", error);
    }
  }
}
