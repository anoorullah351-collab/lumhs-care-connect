// Unscoped legacy caches are intentionally not imported: their owner is unknown.
export function createWardStorage(storage, accountId, wardCode) {
  if (!accountId || !wardCode) throw new Error('A signed-in account and verified ward are required');
  const prefix = `ward_cache_v1:${encodeURIComponent(accountId)}:${encodeURIComponent(wardCode.trim().toUpperCase())}:`;
  return {
    read(key, fallback) {
      try { const value = storage.getItem(prefix + key); return value === null ? fallback : JSON.parse(value); }
      catch { return fallback; }
    },
    write(key, value) { storage.setItem(prefix + key, JSON.stringify(value)); },
    remove(key) { storage.removeItem(prefix + key); },
  };
}