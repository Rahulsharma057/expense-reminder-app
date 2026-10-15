"use client";

import { useEffect } from "react";

// Registers the service worker unconditionally, on every page load,
// regardless of login state or notification permission.
//
// Why this exists: lib/push.js's enablePushNotifications() also calls
// navigator.serviceWorker.register(), but only from inside the login
// page's submit handler, or on /reminders and /checklists mount. Since
// this app's start_url (/dashboard) is behind auth, a first-time or
// logged-out visitor lands on /login where — until now — nothing
// registered the service worker until AFTER they signed in. That's a
// real gap for:
//   - Chrome's installability signal (an active SW is what the browser
//     checks for before it can even be added to the home screen in the
//     first place, which is a prerequisite for Android to register the
//     app's Web Share Target at all)
//   - the Web Share Target's own receiving logic, which depends on this
//     exact SW already controlling the page the moment a share happens
//     (see the "fetch" handler in public/service-worker.js)
//
// registering twice is harmless — the browser de-dupes by scriptURL —
// so this doesn't conflict with or duplicate the existing calls in
// lib/push.js, which still own the actual push-subscription flow
// (permission prompt, VAPID subscribe) that this component does NOT do.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Best-effort — e.g. unsupported context, or served over plain
      // HTTP in local dev on a non-localhost host. Never block rendering.
    });
  }, []);

  return null;
}
