// Cloudinary serves transformed images on the fly just by editing the
// URL — no re-upload, no extra storage. This turns an original delivery
// URL into a small/compressed version for chat bubbles, and can build a
// larger one for the full-screen viewer.
//
// Original: https://res.cloudinary.com/<cloud>/image/upload/v123/tasks/abc.jpg
// Thumb:    https://res.cloudinary.com/<cloud>/image/upload/w_600,q_auto,f_auto/v123/tasks/abc.jpg
//
// Only touches image URLs — documents and voice notes are returned as-is.

const withTransform = (url, transform) => {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url; // not a Cloudinary delivery URL
  return url.replace("/upload/", `/upload/${transform}/`);
};

// Chat bubble size — this is what actually saves the bandwidth, since
// a 4MB original was previously downloaded in full just to render at
// ~280px wide.
const chatThumbUrl = (url) => withTransform(url, "w_600,q_auto,f_auto");

// Full-screen viewer — still capped and compressed, just bigger.
const viewerUrl = (url) => withTransform(url, "w_1600,q_auto,f_auto");

// Tiny blurred placeholder, useful if you add a blur-up loading effect
// later. Cheap enough to always compute.
const tinyPlaceholderUrl = (url) => withTransform(url, "w_24,q_auto,f_auto,e_blur:1000");

module.exports = { chatThumbUrl, viewerUrl, tinyPlaceholderUrl };