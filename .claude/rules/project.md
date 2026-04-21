# Project: Compendium

## First-time setup

1. Copy `.env.example` to `.env` at the project root and fill in both keys:
   - `WORLD_LABS_API_KEY` — required for `/create-world`
   - `GEMINI_API_KEY` — required for `/video-understanding`
2. From `app/`: run `bun install`
3. `worlds/` and `input/` are gitignored — create them if missing: `mkdir -p worlds input`

## Skills

Invokable as slash commands. Full instructions in `.claude/skills/<name>/SKILL.md`.

- `/create-world [description]` — generates a world via World Labs API, checks `input/` for source images automatically
- `/threejs-edit [world-name] [instructions]` — add/modify/remove Three.js objects in a world's scene

## Working directory structure

```
worlds/
  <world-slug>/
    source/    User-supplied input (images, prompts). Used by /create-world as generation source.
    world/     World Labs API output: world.json, operation.json
    output/    Skill outputs: audio, edited images, etc. Loops in background while world is active.
    scene/     project.json — Three.js editor App-format scene file

input/         Staging area for files before they're associated with a world (gitignored)
```

`<world-slug>` is lowercase and hyphenated (e.g. `snowy-mountain-cabin`).

## Key files

- `worlds/<slug>/world/world.json` — World Labs world object. Required for the React app to load the world.
- `worlds/<slug>/scene/project.json` — Three.js editor scene. Written by `/threejs-edit`, loaded by the React app.

## `input/` staging

Drop images, audio, or other assets into `input/`, then tell Claude what to do with them. Claude checks this folder automatically when running `/create-world`. After use, files move to `worlds/<slug>/source/` or `worlds/<slug>/output/`.
