// Reads (and clears) the payment draft the service worker stashes in
// IndexedDB when Android's share sheet sends a screenshot/text into this
// app — see the "WEB SHARE TARGET" section of public/service-worker.js.
//
// Deliberately defensive: the service worker may not be registered yet,
// may be an older version without the share-draft store, or there may
// simply be no pending draft (someone opened /received-payments/new
// directly). All of these are normal, not errors — every function here
// resolves to null/void rather than throwing.

const DB_NAME = "push-notification-db";
const SHARE_DRAFT_STORE = "payment-share-drafts";
const SHARE_DRAFT_KEY = "latest";

const openDB = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    // No explicit version: open whatever version already exists. If the
    // service worker hasn't created the share-draft store yet, we simply
    // won't find it below — handled by the try/catch in getSharedDraft.
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// Returns the pending draft, or null if there isn't one. Shape:
// { text, title, url, file, fileName, fileType, createdAt }
export async function getSharedDraft() {
  try {
    const db = await openDB();

    if (!db.objectStoreNames.contains(SHARE_DRAFT_STORE)) {
      db.close();
      return null;
    }

    return await new Promise((resolve) => {
      const tx = db.transaction(SHARE_DRAFT_STORE, "readonly");
      const store = tx.objectStore(SHARE_DRAFT_STORE);
      const req = store.get(SHARE_DRAFT_KEY);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

// Call once the draft has been loaded into the form, so refreshing the
// page or sharing again later doesn't re-apply stale data.
export async function clearSharedDraft() {
  try {
    const db = await openDB();

    if (!db.objectStoreNames.contains(SHARE_DRAFT_STORE)) {
      db.close();
      return;
    }

    await new Promise((resolve) => {
      const tx = db.transaction(SHARE_DRAFT_STORE, "readwrite");
      tx.objectStore(SHARE_DRAFT_STORE).delete(SHARE_DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });

    db.close();
  } catch {
    // Non-critical — worst case the same draft gets reloaded once more.
  }
}
