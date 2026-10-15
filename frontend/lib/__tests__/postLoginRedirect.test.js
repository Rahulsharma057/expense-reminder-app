// Run with: node --test lib/__tests__/postLoginRedirect.test.js
//
// Covers: a logged-out user who shares a payment screenshot and gets
// bounced to /login must land back on the import screen after signing
// in, not the dashboard — the scenario explicitly required by the spec
// ("Do not lose the saved share draft when the user must log in").

const test = require("node:test");
const assert = require("node:assert/strict");

// sessionStorage doesn't exist in plain Node — fake just enough of the
// Web Storage API for rememberReturnTo/consumeReturnTo to use.
function installFakeSessionStorage() {
  const store = new Map();
  global.sessionStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  return store;
}

test("a shared-import destination is remembered and consumed exactly once", () => {
  installFakeSessionStorage();
  delete require.cache[require.resolve("../postLoginRedirect")];
  const { rememberReturnTo, consumeReturnTo } = require("../postLoginRedirect");

  rememberReturnTo("/transactions/import?shared=1");

  // First read gets the real destination...
  assert.equal(consumeReturnTo("/dashboard"), "/transactions/import?shared=1");
  // ...and it's gone after that, so a second login attempt (or any other
  // consumer) doesn't replay a stale redirect.
  assert.equal(consumeReturnTo("/dashboard"), "/dashboard");
});

test("falls back to the dashboard when nothing was remembered", () => {
  installFakeSessionStorage();
  delete require.cache[require.resolve("../postLoginRedirect")];
  const { consumeReturnTo } = require("../postLoginRedirect");

  assert.equal(consumeReturnTo("/dashboard"), "/dashboard");
});

test("never remembers the login page itself as a destination", () => {
  installFakeSessionStorage();
  delete require.cache[require.resolve("../postLoginRedirect")];
  const { rememberReturnTo, consumeReturnTo } = require("../postLoginRedirect");

  rememberReturnTo("/login");
  assert.equal(consumeReturnTo("/dashboard"), "/dashboard");
});

test("never remembers an empty path", () => {
  installFakeSessionStorage();
  delete require.cache[require.resolve("../postLoginRedirect")];
  const { rememberReturnTo, consumeReturnTo } = require("../postLoginRedirect");

  rememberReturnTo("");
  rememberReturnTo(null);
  assert.equal(consumeReturnTo("/dashboard"), "/dashboard");
});

test("a sessionStorage that throws (private browsing, locked-down webview) never blocks navigation", () => {
  global.sessionStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  delete require.cache[require.resolve("../postLoginRedirect")];
  const { rememberReturnTo, consumeReturnTo } = require("../postLoginRedirect");

  assert.doesNotThrow(() => rememberReturnTo("/transactions/import?shared=1"));
  assert.equal(consumeReturnTo("/dashboard"), "/dashboard");
});
