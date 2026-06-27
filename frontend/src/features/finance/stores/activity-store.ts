import { create } from "zustand";

export interface Activity {
  id: number;
  label: string;
}

interface ActivityState {
  activities: Activity[];
  start: (label: string) => number;
  stop: (id: number) => void;
}

let counter = 0;

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  start: (label) => {
    const id = ++counter;
    set((s) => ({ activities: [...s.activities, { id, label }] }));
    return id;
  },
  stop: (id) =>
    set((s) => ({ activities: s.activities.filter((a) => a.id !== id) })),
}));

// Keep each activity on screen for at least this long so even instant
// operations produce a visible flash rather than blinking out unseen.
const MIN_VISIBLE_MS = 450;

/**
 * Run a promise while showing a labelled entry in the global activity indicator.
 * The entry is always cleared, even on error, and stays visible for at least
 * MIN_VISIBLE_MS.
 */
export async function track<T>(label: string, work: Promise<T>): Promise<T> {
  const id = useActivityStore.getState().start(label);
  const started = Date.now();
  try {
    return await work;
  } finally {
    const elapsed = Date.now() - started;
    if (elapsed < MIN_VISIBLE_MS) {
      await new Promise((r) => setTimeout(r, MIN_VISIBLE_MS - elapsed));
    }
    useActivityStore.getState().stop(id);
  }
}
