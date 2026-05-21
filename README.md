# image-blaster

Creates 3D environments, SFX, and meshes from a single image.

Provide an image → get back a Gaussian splat environment (`.spz`), textured 3D object meshes (`.glb`), and ambient + per-object sound effects (`.mp3`) in under 5 minutes.

> **Upstream:** Forked from [neilsonnn/image-blaster](https://github.com/neilsonnn/image-blaster). This fork adapts the project for use as an [OpenClaw](https://openclaw.dev) skill, with agent-harness specifics moved outside the project tree. The core generation scripts are unchanged.

---

## Requirements

- [Bun](https://bun.sh) — script runtime
- `WORLD_LABS_API_KEY` — [platform.worldlabs.ai](https://platform.worldlabs.ai/)
- `FAL_KEY` — [fal.ai](https://fal.ai/)

## Quick Setup

```bash
git clone https://github.com/halr9000/image-blaster
cd image-blaster
bun install
cp .env.example .env   # fill in your keys
```

Drop an image into `input/` and run the generation pipeline using your agent or directly via the scripts in `scripts/`.

## Directory Layout

```
input/          # drop source images here
worlds/
  <slug>/
    project.json
    image.json
    source/       # staged source images and per-image analysis JSON
    output/
      world/      # .spz, .glb, panorama, thumbnail
      sfx/        # ambient loop .mp3
      <object>/   # per-object .glb, impact SFX
app/            # Vite/React asset viewer (bun run dev → port 5173)
scripts/        # generation scripts (world, 3D, SFX, image-edit, FAL)
docs/           # project conventions and generation rules
```

## Generation Models

| Asset | Provider | Model |
|---|---|---|
| Environment | World Labs | `marble-1.1` |
| 3D objects | FAL → Hunyuan | `hunyuan-3d` |
| Image editing / clean plates | FAL | `nano-banana` or `gpt-image-2` |
| Sound effects | FAL → ElevenLabs | `elevenlabs-sfx` |

## Scripts

All scripts in `scripts/` are synchronous — they block until complete and print results to stdout. Set `WORLD_LABS_API_KEY` and `FAL_KEY` in env or `.env`.

```bash
# Generate a world from a source image
node scripts/world/generate-world.mjs --world <slug> --prompt "<empty environment caption>"

# Generate a 3D object
node scripts/asset-pipeline/generate-single-asset.mjs --world <slug> --object-id <id> --image-edit-prompt "<prompt>"

# Generate SFX
node scripts/sfx/fal-elevenlabs-sfx.mjs --prompt "<sound>" --output-dir worlds/<slug>/output/sfx --prefix ambient-loop --count 2 --kind world-ambience --duration-seconds 10 --loop --postprocess true

# Generate a clean plate (remove objects from source image)
node scripts/image-edit/generate-edit.mjs --image <path> --prompt "<removal prompt>" --output-dir worlds/<slug>/source --role plate --output-slug <slug>-plate
```

## Asset Viewer

```bash
bun run dev   # starts Vite dev server on port 5173
```

The viewer loads assets from local `worlds/` paths only — provider URLs in JSON sidecars are provenance metadata, not load targets.

## Using with OpenClaw

OpenClaw skill files and BWS secret integration are maintained separately at the OpenClaw workspace level and are not part of this repository. See your OpenClaw skills directory for `image-blaster` orchestration skills.

## License

See `LICENSE.md`. Upstream work by [@neilsonnn](https://github.com/neilsonnn).
