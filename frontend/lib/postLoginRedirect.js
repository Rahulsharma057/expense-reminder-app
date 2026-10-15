// Remembers where a logged-out user was trying to go (e.g. the
// shared-import review screen reached via the Android share sheet) so
// the login page can send them back there instead of always defaulting
// to the dashboard. Used by components/ProtectedRoute.js (saves) and
// app/login/page.js (consumes).
//
// Plain functions wrapping sessionStorage, kept separate from both call
// sites so this logic can be unit-tested without a browser (see
// lib/__tests__/postLoginRedirect.test.js, which injects a fake
// sessionStorage). Written as CommonJS so it can be `require()`'d
// directly by that test file, same reasoning as lib/ocrParser.js.

const STORAGE_KEY = "postLoginRedirect";

// Never worth remembering — going "back" to the login page itself, or to
// nothing at all, isn't a useful destination.
function isRememberable(path) {
  return Boolean(path) && path !== "/login";
}

function rememberReturnTo(path) {
  if (!isRememberable(path)) return;

  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // sessionStorage can throw in some locked-down contexts (private
    // browsing, embedded webviews) — never let that block navigation.
  }
}

// Reads AND clears the saved destination in one call — it's meant to be
// used exactly once, right after a successful login.
function consumeReturnTo(fallback = "/dashboard") {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      sessionStorage.removeItem(STORAGE_KEY);
      return saved;
    }
  } catch {
    // Fall through to the fallback below.
  }

  return fallback;
}

module.exports = { rememberReturnTo, consumeReturnTo };
