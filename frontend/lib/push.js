import api from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Registers the service worker, asks for notification permission, and
// sends the push subscription to the backend. Safe to call multiple
// times — it's a no-op if already subscribed. Silently does nothing on
// browsers/contexts (e.g. iOS Safari without "Add to Home Screen") that
// don't support the Push API, rather than throwing.
export async function enablePushNotifications() {
  if (typeof window === "undefined") return { ok: false, reason: "no-window" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    await api.post("/push/subscribe", subscription.toJSON());
    return { ok: true };
  } catch (error) {
    console.error("enablePushNotifications failed:", error);
    return { ok: false, reason: "error" };
  }
}
