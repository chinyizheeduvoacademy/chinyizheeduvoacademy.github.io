// LvxPaths — per-item lesson cache

const KEY_PREFIX = "lvxpaths_lesson_";
const CATALOG_VERSION_KEY = "lvxpaths_lesson_v";

export interface Lesson {
  learningObjectives: string[];
  focusAreas: { topic: string; why: string }[];
  commonPitfalls: { mistake: string; fix: string }[];
  selfCheck: string[];
  prerequisites: string;
  nextStep: string;
  estimatedTime: string;
}

interface CachedLesson {
  generatedAt: string;
  payload: Lesson;
}

function versionedKey(itemId: string, version: number): string {
  return `${KEY_PREFIX}${CATALOG_VERSION_KEY}${version}_${itemId}`;
}

// Read a cached lesson
export function readLesson(itemId: string, version: number): Lesson | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(versionedKey(itemId, version));
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedLesson;
    if (!cached || typeof cached !== "object" || !cached.payload) return null;
    return cached.payload;
  } catch {
    return null;
  }
}

// Persist a lesson
export function writeLesson(
  itemId: string,
  version: number,
  lesson: Lesson
): void {
  if (typeof window === "undefined") return;
  try {
    const cached: CachedLesson = {
      generatedAt: new Date().toISOString(),
      payload: lesson,
    };
    window.localStorage.setItem(
      versionedKey(itemId, version),
      JSON.stringify(cached)
    );
  } catch {
    /* Quota exceeded / disabled storage — silently ignore. */
  }
}

// Drop every cached lesson (used by the reset button)
export function clearAllLessons(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export { KEY_PREFIX, CATALOG_VERSION_KEY };
