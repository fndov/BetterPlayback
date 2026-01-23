# YouTube Unlimited Playback Rate

This Chrome extension removes the 2x limit from YouTube's Ctrl+> / Ctrl+< speed controls.

## Install (unpacked)
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder

## Use
- `Ctrl` + `>` increases playback speed by 0.25x
- `Ctrl` + `<` decreases playback speed by 0.25x (min 0.1x)

Adjust `RATE_STEP` or `MIN_RATE` in `content.js` if you want different values.
