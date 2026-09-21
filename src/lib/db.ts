import type { LocalCommentary } from "./types";

/**
 * Read-only access to recordings saved by the earlier local-only version of the app, so they
 * can be uploaded to your account once (see components/LocalImport.tsx). New recordings never
 * go to IndexedDB.
 */
const DB_NAME = "marginalia";
const STORE = "commentaries";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("byChapter", ["book", "chapter"]);
      store.createIndex("byCreated", "createdAt");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function getAllLocalCommentaries(): Promise<LocalCommentary[]> {
  return run("readonly", (s) => s.getAll() as IDBRequest<LocalCommentary[]>);
}

export function deleteLocalCommentary(id: string): Promise<void> {
  return run("readwrite", (s) => s.delete(id)) as Promise<void>;
}
