"use client";

export interface VaultEntry {
  trackId: string;
  title: string;
  artist: string;
  artworkUrl: string;
  mimeType: string;
  sizeBytes: number;
  savedAt: number;
  blob: Blob;
}

const DB_NAME = "NSpaceLiquidVault";
const DB_VERSION = 1;
const STORE = "audio";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("Offline vault needs IndexedDB"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "trackId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToVault(entry: VaultEntry): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFromVault(trackId: string): Promise<VaultEntry | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(trackId);
      req.onsuccess = () => resolve((req.result as VaultEntry) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function listVault(): Promise<Omit<VaultEntry, "blob">[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = (req.result as VaultEntry[]) || [];
        resolve(rows.map(({ blob: _blob, ...meta }) => meta));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeFromVault(trackId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function downloadWithProgress(
  url: string,
  onProgress?: (pct: number) => void
): Promise<{ blob: Blob; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const contentType = res.headers.get("content-type") || "audio/mp4";
  const total = Number(res.headers.get("content-length") || 0);

  if (!res.body) {
    const blob = await res.blob();
    onProgress?.(100);
    return { blob, mimeType: contentType };
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (total > 0) onProgress?.(Math.min(99, Math.round((received / total) * 100)));
    }
  }
  const blob = new Blob(chunks as BlobPart[], { type: contentType });
  onProgress?.(100);
  return { blob, mimeType: contentType };
}

export function saveBlobToDevice(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
