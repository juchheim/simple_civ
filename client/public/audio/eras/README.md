Place generated era loop tracks in this folder.

Expected files:
- `*.wav` source masters:
  - `primitive-loop.wav`
  - `hearth-loop.wav`
  - `banner-loop.wav`
  - `engine-loop.wav`
  - `aether-loop.wav`
- `*.ogg` runtime assets used by the client:
  - `primitive-loop.ogg`
  - `hearth-loop.ogg`
  - `banner-loop.ogg`
  - `engine-loop.ogg`
  - `aether-loop.ogg`

Generate them with:

```bash
npm run music:generate
npm run music:transcode:ogg
```

Use `npm run music:generate:dry-run` first to preview prompts and inputs.
