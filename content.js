const RATE_STEP = 0.25;
const MIN_RATE = 0.1;
const OVERLAY_DURATION_MS = 900;
const STORAGE_KEY = "ytUnlimitedPlaybackRate";
const RATE_EPSILON = 0.001;
const ENFORCE_WINDOW_MS = 1200;

let lastRequestedRate = null;
let lastEnforceUntil = 0;
let overlayTimer = null;
let savedRate = null;
let currentVideo = null;

function getActiveVideo() {
  return document.querySelector("video");
}

function getOverlayElement(video) {
  const player =
    document.querySelector(".html5-video-player") ||
    document.querySelector("#movie_player") ||
    video?.parentElement ||
    document.documentElement;
  let overlay = document.getElementById("yt-unlimited-rate-overlay");
  if (overlay) {
    return overlay;
  }

  overlay = document.createElement("div");
  overlay.id = "yt-unlimited-rate-overlay";
  overlay.style.position = "absolute";
  overlay.style.top = "5%";
  overlay.style.right = "5%";
  overlay.style.padding = "8px 14px";
  overlay.style.borderRadius = "6px";
  overlay.style.background = "rgba(0, 0, 0, 0.75)";
  overlay.style.color = "#fff";
  overlay.style.font = "600 16px/1.2 Arial, sans-serif";
  overlay.style.zIndex = "2147483647";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 120ms ease";
  if (getComputedStyle(player).position === "static") {
    player.style.position = "relative";
  }
  player.appendChild(overlay);
  return overlay;
}

function showOverlay(video, rate) {
  const overlay = getOverlayElement(video);
  overlay.textContent = `${rate.toFixed(2).replace(/\.00$/, "")}x`;
  overlay.style.opacity = "1";

  if (overlayTimer) {
    clearTimeout(overlayTimer);
  }

  overlayTimer = setTimeout(() => {
    overlay.style.opacity = "0";
  }, OVERLAY_DURATION_MS);
}

function getStoredRate() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve(null);
      return;
    }
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const value = result?.[STORAGE_KEY];
      resolve(typeof value === "number" ? value : null);
    });
  });
}

function saveStoredRate(rate) {
  if (!chrome?.storage?.local) {
    return;
  }
  chrome.storage.local.set({ [STORAGE_KEY]: rate });
}

function broadcastRate(rate) {
  if (savedRate !== null && Math.abs(savedRate - rate) < RATE_EPSILON) {
    return;
  }
  savedRate = rate;
  saveStoredRate(rate);
}

function isSpeedHotkey(event) {
  if (event.altKey || event.metaKey) {
    return null;
  }

  const isIncrease =
    event.key === ">" ||
    event.code === "Period" ||
    (event.code === "Period" && event.shiftKey);
  const isDecrease =
    event.key === "<" ||
    event.code === "Comma" ||
    (event.code === "Comma" && event.shiftKey);

  if (!isIncrease && !isDecrease) {
    return null;
  }

  if (!event.shiftKey && !event.ctrlKey) {
    return null;
  }

  return isIncrease ? 1 : -1;
}

function applyPlaybackRate(video, targetRate) {
  if (Math.abs(video.playbackRate - targetRate) < RATE_EPSILON) {
    return;
  }
  video.playbackRate = targetRate;
  lastRequestedRate = targetRate;
  lastEnforceUntil = performance.now() + ENFORCE_WINDOW_MS;
  broadcastRate(targetRate);
  showOverlay(video, targetRate);

  requestAnimationFrame(() => {
    if (Math.abs(video.playbackRate - targetRate) > RATE_EPSILON) {
      video.playbackRate = targetRate;
    }
  });
}

function ensureVideoRate(video) {
  if (!video) {
    return;
  }
  if (savedRate === null) {
    return;
  }
  if (Math.abs(video.playbackRate - savedRate) > RATE_EPSILON) {
    applyPlaybackRate(video, savedRate);
  }
}

function attachVideo(video) {
  if (!video || video === currentVideo) {
    return;
  }

  currentVideo = video;
  ensureVideoRate(video);
  video.addEventListener(
    "loadedmetadata",
    () => {
      ensureVideoRate(video);
    },
    { once: true }
  );
}

function handleKeydown(event) {
  const direction = isSpeedHotkey(event);
  if (!direction) {
    return;
  }

  const video = getActiveVideo();
  if (!video) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  const delta = direction * RATE_STEP;
  const nextRate = Math.max(MIN_RATE, video.playbackRate + delta);
  applyPlaybackRate(video, nextRate);
}

function handleRateChange(event) {
  const video = event.target;
  const now = performance.now();
  if (
    lastRequestedRate !== null &&
    now < lastEnforceUntil &&
    video.playbackRate + RATE_EPSILON < lastRequestedRate
  ) {
    applyPlaybackRate(video, lastRequestedRate);
    return;
  }

  lastRequestedRate = null;
  broadcastRate(video.playbackRate);
}

window.addEventListener("keydown", handleKeydown, true);
document.addEventListener("ratechange", handleRateChange, true);

document.addEventListener(
  "yt-navigate-finish",
  () => attachVideo(getActiveVideo()),
  true
);
document.addEventListener(
  "yt-page-data-updated",
  () => attachVideo(getActiveVideo()),
  true
);
window.addEventListener("load", () => attachVideo(getActiveVideo()), true);

const videoObserver = new MutationObserver(() => {
  attachVideo(getActiveVideo());
});
videoObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

getStoredRate().then((rate) => {
  savedRate = rate;
  attachVideo(getActiveVideo());
});

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }
    const nextRate = changes[STORAGE_KEY].newValue;
    if (typeof nextRate !== "number") {
      return;
    }
    if (savedRate !== null && Math.abs(savedRate - nextRate) < RATE_EPSILON) {
      return;
    }
    savedRate = nextRate;
    const video = getActiveVideo();
    if (video) {
      ensureVideoRate(video);
    }
  });
}
