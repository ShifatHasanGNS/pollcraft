const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export async function checkAndIncrement(
  key: string,
  max = 1,
  ttlSec = 3600,
): Promise<boolean> {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (existing && existing.expiresAt > now) {
    if (existing.count >= max) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  memoryStore.set(key, { count: 1, expiresAt: now + ttlSec * 1000 });
  return true;
}
