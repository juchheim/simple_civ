# Era Music Pipeline

Simple Civ now supports era-aware background music loops in-game.  
The client reads the current player era and switches loop tracks automatically:

- `Primitive` -> `client/public/audio/eras/primitive-loop.ogg`
- `Hearth` -> `client/public/audio/eras/hearth-loop.ogg`
- `Banner` -> `client/public/audio/eras/banner-loop.ogg`
- `Engine` -> `client/public/audio/eras/engine-loop.ogg`
- `Aether` -> `client/public/audio/eras/aether-loop.ogg`

## Generate Tracks With Stable Audio Open (Replicate)

The repo includes `scripts/generate-era-music.mjs` for batch generation.

### 1. Set environment variables

```bash
export REPLICATE_API_TOKEN="r8_..."
```

Optional:

```bash
export REPLICATE_MODEL_OWNER="stackadoc"
export REPLICATE_MODEL_NAME="stable-audio-open-1.0"
export ERA_MUSIC_DURATION_SECONDS="24"
export STABLE_AUDIO_SEED_BASE="1337"
export STABLE_AUDIO_NEGATIVE_PROMPT="lyrics, vocals, spoken word, atonal noise, distortion, glitch, harsh dissonance, sound effects, trailer hit, abrupt ending, hard stop"
export STABLE_AUDIO_INPUT_PATCH='{"output_format":"wav"}'
export REPLICATE_CREATE_RETRY_ATTEMPTS="8"
export REPLICATE_CREATE_RETRY_DELAY_MS="11000"
export REPLICATE_NETWORK_RETRY_ATTEMPTS="5"
export REPLICATE_NETWORK_RETRY_DELAY_MS="3000"
```

Notes:
- The script auto-resolves the model `latest_version.id` before creating predictions.
- Optional `REPLICATE_VERSION` can be either:
  - a 64-char version ID hash (pinned exact version), or
  - an `owner/name` model slug (the script resolves latest version for that model).
- Default prompts target an acoustic trio style: felt piano + acoustic guitar + upright bass.
- The generator applies stronger quality defaults (`steps=130`, `cfg_scale=7`) unless overridden in `STABLE_AUDIO_INPUT_PATCH`.
- Polling and output downloads now auto-retry transient network errors (e.g. `ECONNRESET`).

### 2. Preview without calling the API

```bash
npm run music:generate:dry-run
```

### 3. Generate tracks

```bash
npm run music:generate
npm run music:transcode:ogg
```

Generated files are saved to `client/public/audio/eras/` and a manifest is written to:

- `client/public/audio/eras/era-music-manifest.json`

## In-Game Behavior

- Music starts after first user interaction (browser autoplay policy).
- Music loops continuously while in-game.
- Era changes switch tracks automatically.
- Preferences menu includes:
  - Background music on/off
  - Music volume slider
