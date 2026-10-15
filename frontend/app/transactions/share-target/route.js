import { NextResponse } from "next/server";

// Safety net only. The normal path for the Web Share Target POST is to be
// intercepted entirely client-side by the service worker's "fetch" handler
// (see public/service-worker.js) — it never reaches this server route,
// because the SW stashes the shared file/text in IndexedDB and redirects
// before any network request is made.
//
// This route only runs if that interception didn't happen (service worker
// not yet active/registered on this device, or an unsupported browser).
// It has no authenticated user and no browser storage available to it, so
// it can't recover the shared file for the user automatically, and it
// can't know the transaction's direction either — it just redirects to
// the review screen with a flag so the UI can explain that the import
// didn't come through, and point at the manual import option instead.
export async function POST(request) {
  return NextResponse.redirect(
    new URL("/transactions/import?shared=unsupported", request.url),
    303
  );
}
