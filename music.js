// Plays "My Silly Boy" audio — works with mp3 OR video files (mp4/mov/webm)
// Drop your file into assets/ as one of the names below.

const SONG_SOURCES = [
  "./assets/my-silly-boy.m4a",
  "./assets/my-silly-boy.mp3",
  "./assets/my-silly-boy.ogg",
  "./assets/my-silly-boy.mp4",
  "./assets/my-silly-boy.mov",
  "./assets/my-silly-boy.webm",
];

let player = null;
let playing = false;
let resolvedSrc = null;

async function findAvailableSource() {
  if (resolvedSrc) return resolvedSrc;

  for (const src of SONG_SOURCES) {
    try {
      const res = await fetch(src, { method: "HEAD" });
      if (res.ok) {
        resolvedSrc = src;
        return src;
      }
    } catch {
      // try next
    }
  }

  // Fallback: try GET on first video/audio names (some servers block HEAD)
  for (const src of SONG_SOURCES) {
    try {
      const res = await fetch(src, { method: "GET", headers: { Range: "bytes=0-1" } });
      if (res.ok || res.status === 206) {
        resolvedSrc = src;
        return src;
      }
    } catch {
      // try next
    }
  }

  return null;
}

function createPlayer(src) {
  const isVideo = /\.(mp4|mov|webm|mkv)(\?|$)/i.test(src);

  // Hidden video element can play audio from a video file without showing picture
  const el = isVideo ? document.createElement("video") : new Audio();
  el.src = src;
  el.preload = "auto";
  el.playsInline = true;
  el.controls = false;
  el.loop = false;
  el.volume = 0.85;

  if (isVideo) {
    el.muted = false;
    el.setAttribute("playsinline", "");
    el.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none;";
    document.body.appendChild(el);
  }

  el.addEventListener("ended", () => {
    playing = false;
  });

  el.addEventListener("error", () => {
    console.warn('Could not play song from', src);
    playing = false;
  });

  return el;
}

export async function playMySillyBoy() {
  if (playing && player) return;

  const src = await findAvailableSource();
  if (!src) {
    console.warn(
      'Add your song/video as assets/my-silly-boy.mp4 (or .mp3) — audio will play, video stays hidden.'
    );
    return;
  }

  if (!player || player.getAttribute("data-src") !== src) {
    if (player && player.parentNode) player.parentNode.removeChild(player);
    player = createPlayer(src);
    player.setAttribute("data-src", src);
  }

  playing = true;
  player.currentTime = 0;

  try {
    await player.play();
  } catch (err) {
    console.warn("Audio play blocked or file missing:", err);
    playing = false;
  }
}

export function stopMusic() {
  if (!player) return;
  player.pause();
  player.currentTime = 0;
  playing = false;
}
