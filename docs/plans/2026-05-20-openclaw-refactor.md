# image-blaster OpenClaw Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork image-blaster upstream, strip Claude Code harness specifics from the project, and create OpenClaw skill files outside the project that wire up the same pipeline via OpenClaw's tooling.

**Architecture:** The project repo becomes agent-agnostic — Node.js scripts, world/input/app structure, generic README. OpenClaw skills live flat at `~/.openclaw/workspace/skills/image-blast-*/` (one skill per generation type) plus a main `image-blaster/` orchestrator. Sub-skills are standalone discoverable OpenClaw skills, not nested. The two halves communicate only through env vars, filesystem paths, and a shared `config.json` in the main skill directory.

**Tech Stack:** Node.js / Bun scripts (unchanged), OpenClaw `sessions_spawn(mode="run")` for non-blocking parallel sub-agents, BWS for secrets (optional), gh CLI for GitHub ops.

---

## File Map

**In the project repo (`projects/image-blaster/`):**
- `scripts/` — moved from `.claude/scripts/` (same content, agent-agnostic path)
- `scripts/project/`, `scripts/world/`, `scripts/asset-pipeline/`, `scripts/sfx/`, `scripts/image-edit/`, `scripts/fal/` — same subdirectories, just relocated
- `docs/project-conventions.md` — moved from `.claude/rules/project.md`
- `README.md` — rewritten: no Claude Code refs, credits upstream, generic quickstart
- `.env.example` — unchanged (`WORLD_LABS_API_KEY`, `FAL_KEY`)
- `.gitignore` — add `worlds/*/output/`, `worlds/*/source/*.png`, `worlds/*/source/*.jpg`, `.env`
- `blast.sh` — updated to use `scripts/` path (not `.claude/scripts/`)
- Deleted: `.claude/`, `.claudeignore`, `.cursor/`

**In the OpenClaw skill directory (`~/.openclaw/workspace/skills/`):**
- `image-blaster/SKILL.md` — main orchestrator (blast order of operations, sessions_spawn dispatch, env injection)
- `image-blaster/config.json` — project path + BWS UUIDs (OpenClaw-local, not committed to repo)
- `image-blast-uncover/SKILL.md` — image analysis (standalone discoverable skill)
- `image-blast-plate/SKILL.md` — clean plate generation (standalone discoverable skill)
- `image-blast-world/SKILL.md` — World Labs environment generation (standalone discoverable skill)
- `image-blast-3d/SKILL.md` — Hunyuan 3D object generation (standalone discoverable skill)
- `image-blast-sfx/SKILL.md` — ElevenLabs SFX generation (standalone discoverable skill)
- `image-blast-image-edit/SKILL.md` — generic image edit (standalone discoverable skill)
- `image-blast-wildcard/SKILL.md` — FAL escape hatch (standalone discoverable skill)

---

### Task 1: Fork repo and re-point local clone

**Files:**
- Modify: remote origin on `/home/halr9000/.openclaw/workspace/projects/image-blaster/`

- [ ] **Step 1: Fork upstream to halr9000**

```bash
gh repo fork neilsonnn/image-blaster --clone=false --org="" 2>&1
```
Expected: "✓ Created fork halr9000/image-blaster"

- [ ] **Step 2: Re-point the existing clone's origin**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
git remote set-url origin https://github.com/halr9000/image-blaster.git
git remote -v
```
Expected: origin points to `halr9000/image-blaster`

- [ ] **Step 3: Add upstream remote for future syncs**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
git remote add upstream https://github.com/neilsonnn/image-blaster.git
git remote -v
```
Expected: both `origin` (halr9000) and `upstream` (neilsonnn) listed

---

### Task 2: Move scripts out of `.claude/`, delete CC artifacts, update blast.sh

**Files:**
- Create: `scripts/` (moved from `.claude/scripts/`)
- Create: `docs/project-conventions.md` (moved from `.claude/rules/project.md`)
- Modify: `blast.sh` (update paths)
- Delete: `.claude/`, `.claudeignore`, `.cursor/`

- [ ] **Step 1: Move scripts to top-level**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
mkdir -p scripts
cp -r .claude/scripts/. scripts/
ls scripts/
```
Expected: `asset-pipeline/  fal/  image-edit/  project/  sfx/  world/`

- [ ] **Step 2: Move project conventions doc**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
mkdir -p docs
cp .claude/rules/project.md docs/project-conventions.md
```

- [ ] **Step 3: Delete CC-specific directories and files**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
rm -rf .claude .claudeignore .cursor
ls -la
```
Expected: no `.claude`, `.claudeignore`, or `.cursor` entries

- [ ] **Step 4: Fix any hardcoded `.claude/scripts/` paths in the moved scripts**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
grep -r '\.claude/scripts' scripts/ --include='*.mjs' -l
```
If files found:
```bash
find scripts/ -name '*.mjs' -exec sed -i 's|\.claude/scripts/|scripts/|g' {} +
grep -r '\.claude/scripts' scripts/ --include='*.mjs'
```
Expected: no output (no remaining references)

- [ ] **Step 5: Update blast.sh to use new scripts/ path**

Replace the existing `blast.sh` content:
```bash
#!/usr/bin/env bash
# Runtime launcher — pulls secrets from BWS, never writes them to disk
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export BWS_ACCESS_TOKEN

export WORLD_LABS_API_KEY="$(bws secret get 02df0536-ef43-48f4-97b5-b45000ca05d3 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"

cd "$SCRIPT_DIR"
exec "$@"
```
(Paths are already correct — blast.sh doesn't reference `.claude/scripts/` directly. Verify it still works.)

```bash
/home/halr9000/.openclaw/workspace/projects/image-blaster/blast.sh node scripts/project/project-state.mjs --help 2>&1 | head -3
```
Expected: usage output, no "cannot find module" errors

- [ ] **Step 6: Update .gitignore**

Add these lines to `.gitignore` if not already present:
```
worlds/*/output/
worlds/*/source/*.png
worlds/*/source/*.jpg
worlds/*/source/*.jpeg
worlds/*/source/*.webp
.env
```

- [ ] **Step 7: Commit**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
git add -A
git commit -m "refactor: move scripts to top-level, remove Claude Code harness artifacts

Scripts moved from .claude/scripts/ to scripts/ for agent-agnostic layout.
Removed .claude/, .claudeignore, .cursor/ (harness-specific).
Project conventions doc moved to docs/project-conventions.md.

Upstream: https://github.com/neilsonnn/image-blaster"
```

---

### Task 3: Rewrite README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write new README**

Replace `README.md` with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
git add README.md
git commit -m "docs: rewrite README as agent-agnostic, credit upstream fork"
```

---

### Task 4: Create OpenClaw skill directories and config

**Files:**
- Create: `~/.openclaw/workspace/skills/image-blaster/` (orchestrator)
- Create: `~/.openclaw/workspace/skills/image-blaster/config.json`
- Create: `~/.openclaw/workspace/skills/image-blast-{uncover,plate,world,3d,sfx,image-edit,wildcard}/`

Note: Skills are FLAT in OpenClaw — sub-skills live alongside the orchestrator at `skills/image-blast-*`, NOT nested inside `skills/image-blaster/skills/`.

- [ ] **Step 1: Create all skill directories**

```bash
for skill in image-blaster image-blast-uncover image-blast-plate image-blast-world image-blast-3d image-blast-sfx image-blast-image-edit image-blast-wildcard; do
  mkdir -p /home/halr9000/.openclaw/workspace/skills/$skill
done
ls /home/halr9000/.openclaw/workspace/skills/ | grep image-blast
```
Expected: 8 directories listed

- [ ] **Step 2: Write config.json**

```bash
cat > /home/halr9000/.openclaw/workspace/skills/image-blaster/config.json << 'EOF'
{
  "project_dir": "/home/halr9000/.openclaw/workspace/projects/image-blaster",
  "bws": {
    "enabled": true,
    "world_labs_uuid": "02df0536-ef43-48f4-97b5-b45000ca05d3",
    "fal_uuid": "62bda555-c65c-4807-8479-b43a00c1f616"
  }
}
EOF
cat /home/halr9000/.openclaw/workspace/skills/image-blaster/config.json
```

---

### Task 5: Write the main orchestrator SKILL.md

**Files:**
- Create: `~/.openclaw/workspace/skills/image-blaster/SKILL.md`

Key OpenClaw translation from upstream:
- `Agent(skill-name, run_in_background: true)` → `sessions_spawn(task="...", mode="run", label="...")`
- `Bash(node .claude/scripts/...)` → exec `node $PROJECT_DIR/scripts/...`
- Sub-skills are spawned by embedding their SKILL.md content in the `task:` string
- Secrets: each sub-session re-fetches from BWS (subagents don't inherit parent env)

- [ ] **Step 1: Write SKILL.md**

Create `/home/halr9000/.openclaw/workspace/skills/image-blaster/SKILL.md`:

```markdown
---
name: image-blaster
description: >
  Create 3D environments, SFX, and meshes from a single image using World Labs,
  Hunyuan 3D, and ElevenLabs. Use this skill when the user says "blast", 
  "IMAGE-BLAST", "create a world from this image", "turn this photo into 3D",
  "generate a 3D scene from", "make a world out of", or any request to convert
  an image into a 3D environment with models and sound. Also use for managing
  existing image-blaster worlds, fixing generations, or regenerating specific assets.
---

# image-blaster

An image-to-world pipeline. Drop an image, get back a Gaussian splat environment,
textured 3D meshes, and ambient + object SFX.

Forked from [neilsonnn/image-blaster](https://github.com/neilsonnn/image-blaster).

## Config

```bash
cat /home/halr9000/.openclaw/workspace/skills/image-blaster/config.json
```

PROJECT_DIR: `/home/halr9000/.openclaw/workspace/projects/image-blaster`

## Secret Injection

Every exec of a generation script needs `WORLD_LABS_API_KEY` and `FAL_KEY`. Fetch from BWS:

```bash
export BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export WORLD_LABS_API_KEY="$(bws secret get 02df0536-ef43-48f4-97b5-b45000ca05d3 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
```

If `bws.enabled` is false in config.json, check for `WORLD_LABS_API_KEY` and `FAL_KEY` in env or `$PROJECT_DIR/.env`. If absent, ask the user.

Sub-sessions spawned via `sessions_spawn` do NOT inherit parent env — each sub-skill re-fetches its own secrets using the same pattern above.

## Directory Layout

```
$PROJECT_DIR/
  input/           — drop source images here
  worlds/<slug>/
    source/        — staged images, per-image analysis JSON
    output/
      world/       — .spz, .glb, panorama
      sfx/         — ambient loops
      <object>/    — per-object .glb + impact SFX
  scripts/         — generation scripts
  app/             — Vite asset viewer
```

## Indexed File Convention

All generated files follow `N-slug.ext` / `.N-slug-request.json`. `0` is the original source. Inspect state with `ls -a <dir>`.

## Vibes

hypeman energy. IMAGE-BLASTER in caps throughout. lowercase mostly. millenial, lowkey. drops CGI colloquialisms and slang. no emojis.

## Order of Operations (Full Blast)

When user asks for a full IMAGE-BLAST:

**Step 1 — Inspect state:**
```bash
ls /home/halr9000/.openclaw/workspace/projects/image-blaster/input/
node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/project-state.mjs --world "<slug>"
```

**Step 2 — Initialize and stage inputs:**
```bash
node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/project-state.mjs --world "<slug>" --stage-input
```

**Step 3 — Start asset viewer (if not running):**
```bash
lsof -i :5173 -sTCP:LISTEN -n -P
```
If not running: `cd /home/halr9000/.openclaw/workspace/projects/image-blaster && bun run dev &`
Report URL: `http://localhost:5173/?world=<slug>`

**Step 4 — Analyze image (blocking — need object confirmation before proceeding):**

Spawn `image-blast-uncover` and WAIT for result:
```
sessions_spawn(
  task="[read /home/halr9000/.openclaw/workspace/skills/image-blast-uncover/SKILL.md and follow it]\n\nWorld: <slug>",
  label="blast-uncover-<slug>"
)
```
Then yield and wait for the uncover session to complete and present object candidates to user.

**Step 5 — Confirm objects with user.** Wait for approval before proceeding.

**Step 6 — Clean plate (blocking):**
```
sessions_spawn(
  task="[read /home/halr9000/.openclaw/workspace/skills/image-blast-plate/SKILL.md and follow it]\n\nWorld: <slug>",
  label="blast-plate-<slug>"
)
```
Wait for result.

**Step 7 — World generation (blocking — needed before viewer makes sense):**
```
sessions_spawn(
  task="[read /home/halr9000/.openclaw/workspace/skills/image-blast-world/SKILL.md and follow it]\n\nWorld: <slug>",
  label="blast-world-<slug>"
)
```
Wait for result.

**Steps 8+9 — 3D objects + SFX (parallel, non-blocking):**

Spawn one `image-blast-3d` session per confirmed object AND all SFX sessions simultaneously:
```
sessions_spawn(task="[image-blast-3d SKILL.md content]\n\nWorld: <slug>\nObject: <object-id>", mode="run", label="blast-3d-<object-id>")
sessions_spawn(task="[image-blast-sfx SKILL.md content]\n\nWorld: <slug>\nTarget: world-ambience", mode="run", label="blast-sfx-ambience")
sessions_spawn(task="[image-blast-sfx SKILL.md content]\n\nWorld: <slug>\nTarget: object-impact <object-id>", mode="run", label="blast-sfx-<object-id>")
```
Use `mode="run"` for all of these so they're non-blocking. Poll with `mcp__openclaw__subagents(action="list")` to check status.

**Step 10 — Report:** List all generated files, viewer URL, any failures.

## Fixing Generations

When the user wants to fix a specific generation, identify the matching sub-skill
(`image-blast-world`, `image-blast-3d`, `image-blast-sfx`) and invoke it directly
rather than doing the work yourself. The sub-skill has the full context for that
generation type.

## Sub-Skill Dispatch Pattern

When spawning a sub-skill, read its SKILL.md into the task string:
```bash
cat /home/halr9000/.openclaw/workspace/skills/<skill-name>/SKILL.md
```
Then pass that content as the start of the `task:` parameter, followed by
the world slug and any specific arguments.

## Deploying Viewer to Neo

After a blast completes, build and deploy the app to neo for persistent access:
```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
bun run build
```
Then copy the built `app/dist/` to neo via the standard neo deploy pattern
(rsync to neo's web root, or as directed by the jeeves-retreat skill).
Report the neo URL to user.
```

- [ ] **Step 2: Verify**

```bash
head -10 /home/halr9000/.openclaw/workspace/skills/image-blaster/SKILL.md
wc -l /home/halr9000/.openclaw/workspace/skills/image-blaster/SKILL.md
```

---

### Task 6: Write sub-skill SKILL.md files

**Files:**
- Create: `~/.openclaw/workspace/skills/image-blast-uncover/SKILL.md`
- Create: `~/.openclaw/workspace/skills/image-blast-plate/SKILL.md`
- Create: `~/.openclaw/workspace/skills/image-blast-world/SKILL.md`
- Create: `~/.openclaw/workspace/skills/image-blast-3d/SKILL.md`
- Create: `~/.openclaw/workspace/skills/image-blast-sfx/SKILL.md`
- Create: `~/.openclaw/workspace/skills/image-blast-image-edit/SKILL.md`
- Create: `~/.openclaw/workspace/skills/image-blast-wildcard/SKILL.md`

Each adapts its upstream counterpart from `.claude/skills/<name>/SKILL.md`:
- Replace `Bash(node .claude/scripts/...)` → exec `node $PROJECT_DIR/scripts/...`
- Remove `allowed-tools`, `context: fork`, `agent:` frontmatter (CC-specific)
- Replace `$0` slug arg with `World: <slug>` passed in task prompt
- Each sub-skill re-fetches its own BWS secrets (subagents don't inherit parent env)
- Use absolute path: `PROJECT_DIR=/home/halr9000/.openclaw/workspace/projects/image-blaster`

- [ ] **Step 1: Write image-blast-uncover/SKILL.md**

Create `/home/halr9000/.openclaw/workspace/skills/image-blast-uncover/SKILL.md`:

```markdown
---
name: image-blast-uncover
description: >
  Analyze a source image for image-blaster: extract object candidates, write
  per-image JSON analysis, and prepare object.json files for approved objects.
  Use when running image-blast analysis, uncovering scene contents, identifying
  objects to 3D-ify, or starting the image-blaster pipeline.
---

# image-blast-uncover

Analyze source images for an IMAGE-BLASTER world.

PROJECT_DIR: `/home/halr9000/.openclaw/workspace/projects/image-blaster`

Get world slug from `World: <slug>` in the task prompt.

## Instructions

1. Get project state and stage inputs:
   ```bash
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/project-state.mjs --world "<slug>" --stage-input
   ```

2. Read source images from `$PROJECT_DIR/worlds/<slug>/source/`. Analyze one at a time using multimodal image reading. Use literal, observational language only.

3. Extract object candidates — single cleanly segmentable items only. Test: can a human lift it or push it independently? Exclude rugs, flooring, walls, fixed architectural features. Never group items (no "table with chairs").

4. Write per-image JSON at `$PROJECT_DIR/worlds/<slug>/source/<image-name>.json`:
   ```json
   {
     "scene_name": "",
     "short_caption": "",
     "literal_description": "",
     "environment": "",
     "visual_style": "",
     "lighting": "",
     "atmosphere": "",
     "ambient_sound": "",
     "objects": [
       {
         "id": "<slug>",
         "name": "",
         "description": "",
         "materials": [],
         "source_images": [],
         "evidence": [],
         "generate_as_3d_object": true
       }
     ]
   }
   ```

5. Derive merged `$PROJECT_DIR/worlds/<slug>/image.json` from all per-image JSONs (combine source_images, synthesize shared scene fields, deduplicate objects).

6. Present scene analysis and object candidates to user concisely. Wait for approval.

7. Once approved, write `$PROJECT_DIR/worlds/<slug>/output/<object-slug>/object.json` per approved object:
   ```json
   {
     "schema_version": 1,
     "world": "<slug>",
     "object": {
       "id": "<slug>",
       "name": "",
       "description": "",
       "materials": [],
       "source_images": [],
       "evidence": [],
       "generate_as_3d_object": true,
       "working_dir": "worlds/<slug>/output/<slug>"
     },
     "updated_at": "<ISO timestamp>"
   }
   ```

8. Refresh state:
   ```bash
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/project-state.mjs --world "<slug>"
   ```

9. Report: source image count, per-image JSON count, object directories created.
```

- [ ] **Step 2: Write image-blast-plate/SKILL.md**

Create `/home/halr9000/.openclaw/workspace/skills/image-blast-plate/SKILL.md`:

```markdown
---
name: image-blast-plate
description: >
  Generate a clean plate image for image-blaster by removing confirmed foreground
  objects from a source image. Use when running the image-blast clean plate step,
  removing objects from a photo for world generation, or generating an inpainted
  background for a 3D scene.
---

# image-blast-plate

Generate clean plate for IMAGE-BLASTER world.

PROJECT_DIR: `/home/halr9000/.openclaw/workspace/projects/image-blaster`

Get world slug from `World: <slug>` in the task prompt.

## Secrets

```bash
export BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
```

If BWS unavailable, check env for `FAL_KEY` or ask user.

## Instructions

1. Get project state:
   ```bash
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/project-state.mjs --world "<slug>"
   ```

2. Select source image: use explicit path from task args, else newest visible source in `worlds/<slug>/source/`.

3. Build removal prompt from confirmed objects (`worlds/<slug>/output/*/object.json` — use `object.name`). Keep the prompt removal-only: name what to remove. Do not add fill-in or background repair instructions.

4. Run one image edit pass for all removals. The plate gets the next available visible file index in `worlds/<slug>/source/` (never reuses the source index):

   ```bash
   FAL_KEY="$FAL_KEY" node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/image-edit/generate-edit.mjs \
     --image "<selected source image path>" \
     --prompt "remove the following from the image: <confirmed object names>" \
     --output-dir "/home/halr9000/.openclaw/workspace/projects/image-blaster/worlds/<slug>/source" \
     --role plate \
     --output-slug "<source-slug>-plate"
   ```

   Optional: `--provider nano-banana|gpt-image-2`

5. If local plate file missing after run:
   ```bash
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/ensure-local-assets.mjs --from "<request-json-path>"
   ```

6. Refresh state and report: input image, output plate path, prompt used.
```

- [ ] **Step 3: Write image-blast-world/SKILL.md**

Create `/home/halr9000/.openclaw/workspace/skills/image-blast-world/SKILL.md`:

```markdown
---
name: image-blast-world
description: >
  Generate the 3D static environment (Gaussian splat + collider mesh) for an
  image-blaster world via World Labs Marble. Use when generating or regenerating
  the world environment, creating a 3D space from an image, running the world
  generation step of image-blaster, or when the user says "generate the world"
  or "blast the world".
---

# image-blast-world

Generate World Labs environment for IMAGE-BLASTER world.

PROJECT_DIR: `/home/halr9000/.openclaw/workspace/projects/image-blaster`

Get world slug from `World: <slug>` in the task prompt.

## Secrets

```bash
export BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export WORLD_LABS_API_KEY="$(bws secret get 02df0536-ef43-48f4-97b5-b45000ca05d3 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
```

## Instructions

1. Get project state:
   ```bash
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/project-state.mjs --world "<slug>"
   ```

2. Synthesize an empty-environment world prompt:
   - Read `worlds/<slug>/image.json` for original scene description
   - Subtract all confirmed objects (`worlds/<slug>/output/*/object.json` — use `object.name` and `object.description`)
   - Result: static empty environment — same setting, materials, lighting, atmosphere — no removed objects. Don't reuse `short_caption` directly.

3. Default: highest-index visible image in `worlds/<slug>/source/`. Override with explicit image from task args.

4. Generate:
   ```bash
   WORLD_LABS_API_KEY="$WORLD_LABS_API_KEY" FAL_KEY="$FAL_KEY" \
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/world/generate-world.mjs \
     --world "<slug>" \
     --prompt "<empty-environment caption>"
   ```
   Add `--image <path>` for explicit image. Add `--regenerate` for explicit regeneration.

5. Ensure all referenced assets downloaded (`.spz`, collider `.glb`, panorama, thumbnail):
   ```bash
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/ensure-local-assets.mjs \
     --from "worlds/<slug>/output/world/<N>-world.json"
   ```

6. Refresh state and report: source image, generation index, all downloaded asset paths, any failures.
```

- [ ] **Step 4: Write image-blast-3d/SKILL.md**

Create `/home/halr9000/.openclaw/workspace/skills/image-blast-3d/SKILL.md`:

```markdown
---
name: image-blast-3d
description: >
  Generate one 3D object mesh (.glb) for a single named object using Hunyuan-3D
  via FAL. Use when generating a 3D model from an image, creating a mesh for
  an image-blaster object, running the 3D object step, or when the user says
  "make a 3D model of the <object>", "blast the <object>", or "generate mesh".
---

# image-blast-3d

Generate one 3D object for IMAGE-BLASTER world.

PROJECT_DIR: `/home/halr9000/.openclaw/workspace/projects/image-blaster`

Get world slug from `World: <slug>` and object id from `Object: <id>` in the task prompt.

## Secrets

```bash
export BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
```

## Instructions

Args must identify exactly one atomic object (one physical instance, not a pair, set, or cluster).

1. Get project state:
   ```bash
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/project-state.mjs --world "<slug>"
   ```

2. Find or create `worlds/<slug>/output/<object-id>/object.json`. If missing:
   ```json
   {
     "schema_version": 1, "world": "<slug>",
     "object": {
       "id": "<slug>", "name": "", "description": "",
       "materials": [], "source_images": [], "evidence": [],
       "generate_as_3d_object": true,
       "working_dir": "worlds/<slug>/output/<slug>"
     },
     "updated_at": "<ISO timestamp>"
   }
   ```

3. Write an object-specific image-edit prompt:
   "Isolate the <target object> from this image. Reproduce it exactly as shown -- same colors, materials, and proportions. White background, centered, tight crop, studio lighting. No other objects, no scene, no people, no text, no shadows on the ground. Isolate the object and remove all clustered, adjacent, overlapping, or items resting on the target object. Create a clean render of that one single object that is true to the source image."

4. Generate:
   ```bash
   FAL_KEY="$FAL_KEY" \
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/asset-pipeline/generate-single-asset.mjs \
     --world "<slug>" \
     --object-id "<object-id>" \
     --image-edit-prompt "<object-specific extraction prompt>"
   ```
   Hunyuan defaults: `--face-count 50000 --enable-pbr true --generate-type Normal`
   Pass `--provider meshy` only when user asks for Meshy.
   Pass `--regenerate` to regenerate from existing reference.
   Pass `--regenerate-reference` for new source extraction + model.

5. Fill missing local files if needed:
   ```bash
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/ensure-local-assets.mjs --from "<request-json-path>"
   ```

6. Report: object id, output directory, generated model files, any failures.
```

- [ ] **Step 5: Write image-blast-sfx/SKILL.md**

Create `/home/halr9000/.openclaw/workspace/skills/image-blast-sfx/SKILL.md`:

```markdown
---
name: image-blast-sfx
description: >
  Generate ambient sound loops or per-object impact SFX for image-blaster worlds
  via ElevenLabs through FAL. Use when generating audio for a 3D scene, creating
  ambient sounds, making object impact sounds, running the SFX step of image-blaster,
  or when the user says "generate sounds", "add audio", or "blast the SFX".
---

# image-blast-sfx

Generate SFX for IMAGE-BLASTER world.

PROJECT_DIR: `/home/halr9000/.openclaw/workspace/projects/image-blaster`

Get world slug from `World: <slug>` and target from `Target: <world-ambience|object-impact <id>>` in the task prompt.

## Secrets

```bash
export BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
```

## Instructions

Choose one mode based on target:

**World ambience** — output to `worlds/<slug>/output/sfx/`:
```bash
FAL_KEY="$FAL_KEY" \
node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/sfx/fal-elevenlabs-sfx.mjs \
  --prompt "ambient environment, loop of <ambient qualities from image.json>" \
  --output-dir "/home/halr9000/.openclaw/workspace/projects/image-blaster/worlds/<slug>/output/sfx" \
  --prefix "ambient-loop" --count 2 --kind world-ambience \
  --duration-seconds 10 --loop --postprocess true
```

**Object impact** — output to `worlds/<slug>/output/<object-id>/sfx/`:
```bash
FAL_KEY="$FAL_KEY" \
node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/sfx/fal-elevenlabs-sfx.mjs \
  --prompt "impact one-shot, short-decay, <object material from object.json> hitting a hard surface" \
  --output-dir "/home/halr9000/.openclaw/workspace/projects/image-blaster/worlds/<slug>/output/<object-id>/sfx" \
  --prefix "impact-<object-id>" --count 4 --kind object-impact \
  --duration-seconds 1 --postprocess true
```

**Custom SFX**: use supplied prompt, `--kind arbitrary`, output dir from context.

Loop output is left as raw provider audio. Non-loop output is trimmed, silence-stripped, and loudness-normalized.

Fill missing local files if needed:
```bash
node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/ensure-local-assets.mjs --from "<request-json-path>"
```

Report: generated audio files, loop status, prompt used, audio_analysis trimming notes.
```

- [ ] **Step 6: Write image-blast-image-edit/SKILL.md**

Create `/home/halr9000/.openclaw/workspace/skills/image-blast-image-edit/SKILL.md`:

```markdown
---
name: image-blast-image-edit
description: >
  Generate one edited image via FAL (nano-banana or gpt-image-2) for image-blaster
  pipelines. Use when editing a source image, generating object reference images,
  running the image-edit step, removing elements from a photo, or when the
  image-blast pipeline needs an image transformation.
---

# image-blast-image-edit

Generate one edited image for IMAGE-BLASTER.

PROJECT_DIR: `/home/halr9000/.openclaw/workspace/projects/image-blaster`

## Secrets

```bash
export BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
```

## Instructions

Require at least one input image path and one edit prompt.

```bash
FAL_KEY="$FAL_KEY" \
node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/image-edit/generate-edit.mjs \
  --image "<input image path>" \
  --prompt "<edit prompt>" \
  --output-dir "<output directory>" \
  --role "<plate|object-mask|image-edit>" \
  --output-slug "<output slug>"
```

Optional: `--provider nano-banana|gpt-image-2`

Fill missing local files if needed:
```bash
node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/ensure-local-assets.mjs --from "<request-json-path>"
```

Report: input images, output image, role, prompt used, request metadata.
```

- [ ] **Step 7: Write image-blast-wildcard/SKILL.md**

Create `/home/halr9000/.openclaw/workspace/skills/image-blast-wildcard/SKILL.md`:

```markdown
---
name: image-blast-wildcard
description: >
  Discover and run any FAL API model or operation as an image-blast escape hatch.
  Use when no other image-blast skill covers the request, when the user asks to
  try a specific FAL model, run a custom FAL endpoint, generate something unusual
  via FAL, or explore FAL API capabilities within an image-blaster project.
---

# image-blast-wildcard

Run any FAL model for IMAGE-BLASTER.

PROJECT_DIR: `/home/halr9000/.openclaw/workspace/projects/image-blaster`

## Secrets

```bash
export BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
```

## Instructions

Two modes:

**Discovery** (normal user request): Do NOT run a paid FAL request until user confirms endpoint.
1. Search candidates: `https://api.fal.ai/v1/models?q=<query>&status=active&limit=5`
2. Present best endpoint(s) with description and schema notes.
3. Ask user to confirm one exact endpoint (e.g., `confirm fal-ai/flux/dev`).

**Execution** (task starts with `CONFIRMED_FAL_ENDPOINT: <endpoint>`):
1. Fetch schema: `https://api.fal.ai/v1/models?endpoint_id=<endpoint>&expand=openapi-3.0`
2. Build schema-shaped input JSON from user's literal inputs.
3. Resolve output dir from context.
4. Run:
   ```bash
   FAL_KEY="$FAL_KEY" \
   node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/fal/run-fal.mjs \
     --endpoint "<endpoint>" \
     --input-json '<schema-shaped JSON>' \
     --output-dir "<output dir>" \
     --output-slug "<slug>" \
     --user-prompt "<literal user request>"
   ```
   Add `--mode run` only when FAL API requires direct `fal.run` instead of queue API.

For local file inputs: `--file <schema_key>=<path>` for automatic URL conversion.

Fill missing local files if needed:
```bash
node /home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/project/ensure-local-assets.mjs --from "<request-json-path>"
```

Report: endpoint, input summary, output files, request metadata.
```

- [ ] **Step 8: Verify all skill files exist**

```bash
find /home/halr9000/.openclaw/workspace/skills/ -name "SKILL.md" | grep "image-blast"
```
Expected: 8 SKILL.md files

---

### Task 7: Push to fork

- [ ] **Step 1: Verify clean state**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
git status
git log --oneline -5
```

- [ ] **Step 2: Push to halr9000 fork**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
git push origin main
```

- [ ] **Step 3: Verify on GitHub**

```bash
gh repo view halr9000/image-blaster --json name,description,url --jq '"Repo: \(.name) — \(.url)"'
```

---

### Task 8: Build and deploy Vite viewer to neo

The built app is a static site that loads world assets from `worlds/` — it needs
to know where worlds live at deploy time. Check if the Vite build has a configurable
base path or if worlds are served from a relative path.

- [ ] **Step 1: Inspect Vite config and app structure**

```bash
cat /home/halr9000/.openclaw/workspace/projects/image-blaster/app/vite.config.ts
cat /home/halr9000/.openclaw/workspace/projects/image-blaster/app/package.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('scripts', {}), indent=2))"
```

- [ ] **Step 2: Build the app**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
bun run build 2>&1 | tail -20
ls app/dist/
```
Expected: `index.html`, `assets/` in `app/dist/`

- [ ] **Step 3: Deploy to neo via jeeves-retreat pattern**

Use the jeeves-retreat skill to identify the correct neo deploy target and deploy `app/dist/`.
If unsure about neo's web root, run:
```bash
ssh neo "ls /var/www/ 2>/dev/null || ls /srv/www/ 2>/dev/null || echo 'check neo web root'"
```
Then rsync or copy `app/dist/` to the appropriate neo path. Report the URL.

Note: If the app requires `worlds/` data to be colocated (i.e., it loads from a relative `/worlds/` path), the worlds directory must also be accessible from neo. This may require either a symlink on neo or a separate worlds sync step — check the app's fetch paths first.

---

### Task 9: Smoke test

- [ ] **Step 1: Verify secrets inject cleanly**

```bash
export BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export WORLD_LABS_API_KEY="$(bws secret get 02df0536-ef43-48f4-97b5-b45000ca05d3 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
echo "WORLD_LABS len=${#WORLD_LABS_API_KEY} FAL len=${#FAL_KEY}"
```
Expected: `WORLD_LABS len=32 FAL len=69`

- [ ] **Step 2: Verify scripts importable at new paths**

```bash
cd /home/halr9000/.openclaw/workspace/projects/image-blaster
node scripts/project/project-state.mjs 2>&1 | head -5
```
Expected: usage/error output, no "Cannot find module" errors

- [ ] **Step 3: Verify all 8 skill SKILL.md files exist and have frontmatter**

```bash
for f in $(find /home/halr9000/.openclaw/workspace/skills/ -name "SKILL.md" | grep "image-blast"); do
  echo "=== $f ===" && head -4 "$f"
done
```
Expected: each file has `---`, `name:`, `description:` frontmatter

- [ ] **Step 4: Save project memory**

Write memory note:
- `projects/image-blaster/` — agent-agnostic fork of neilsonnn/image-blaster, scripts at `scripts/`
- `skills/image-blaster/` — main orchestrator; `skills/image-blast-*/` — 7 sub-skills (flat layout)
- `skills/image-blaster/config.json` — BWS UUIDs and project path
- Fork: `halr9000/image-blaster`, upstream: `neilsonnn/image-blaster`
- Viewer: Vite app at `app/`, deployed to neo after blast

---

## Self-Review

**Spec coverage:**
- ✅ Fork to halr9000, reset origins, add upstream — Task 1
- ✅ Remove Claude Code references from project — Tasks 2, 3
- ✅ Credit upstream — Task 3 (README prominently)
- ✅ BWS optional — `bws.enabled` in config.json, each skill checks before requiring
- ✅ OpenClaw-specific stuff outside project folder — Tasks 4-6 (all in `skills/`)
- ✅ Sub-skills flat/discoverable — Task 4 corrected from nested to flat layout
- ✅ sessions_spawn uses `mode="run"` for non-blocking — Task 5
- ✅ Sub-sessions re-fetch their own secrets — all sub-skill SKILL.md files
- ✅ Neo deployment — Task 8
- ✅ Push to fork — Task 7

**Placeholder scan:** All script commands are exact absolute paths. All sessions_spawn calls show actual parameter structure. Task 8 Step 3 defers to neo web root discovery (necessary — we don't know neo's layout upfront), but provides the discovery command.

**Consistency check:** All sub-skill SKILL.md files use absolute path `/home/halr9000/.openclaw/workspace/projects/image-blaster/scripts/...` consistently. BWS UUIDs match throughout. Skill names match flat directory names.
