const RATE_STEP = 0.25;
const MIN_RATE = 0.1;
const OVERLAY_DURATION_MS = 900;

let lastRequestedRate = null;
let overlayTimer = null;

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
  video.playbackRate = targetRate;
  lastRequestedRate = targetRate;
  showOverlay(video, targetRate);

  requestAnimationFrame(() => {
    if (Math.abs(video.playbackRate - targetRate) > 0.001) {
      video.playbackRate = targetRate;
    }
  });
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
  if (!lastRequestedRate) {
    return;
  }

  if (video.playbackRate < lastRequestedRate) {
    applyPlaybackRate(video, lastRequestedRate);
  }
}

window.addEventListener("keydown", handleKeydown, true);
document.addEventListener("ratechange", handleRateChange, true);
