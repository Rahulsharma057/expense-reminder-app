// lib/pushSubscribe.js
//
// Call subscribeThisDevice() once after login (e.g. a button in
// Settings, or automatically after the user grants notification
// permission). Requires public/sw.js (below) to be served from your
// site root.

import { fetchPushPublicKey, subscribeToPush } from "./chatApi";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export async function subscribeThisDevice() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const registration = await navigator.serviceWorker.register("/sw.js");

  const { data } = await fetchPushPublicKey();
  const publicKey = data?.publicKey;
  if (!publicKey) return { ok: false, reason: "not-configured" };

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await subscribeToPush(subscription.toJSON());

  return { ok: true };
}