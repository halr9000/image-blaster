---
name: image-blast-uncover
description: Deeply analyze source images into structured scene and object descriptions. Use when the user wants rich image understanding, scene captions, atmosphere, object lists, or an objects.json queue for later 3D generation.
argument-hint: [world-name] [optional image paths or instructions]
allowed-tools: Read Write Glob Bash(node *)
---

Uncover rich image information for project `$0`. Additional image paths or instructions may appear in `$ARGUMENTS`.

## Instructions

1. Require a project/world slug in `$0`. If it is missing, ask which `worlds/<world-name>/` directory to use.
2. Ensure the project envelope exists and read current state:

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

3. Read `IMAGE-BLAST.md` in this skill directory and follow its JSON contract exactly.
4. Check existing root outputs before analyzing:
   - `worlds/$0/image.json`
   - `worlds/$0/objects.json`
5. If existing output exists, treat this as review/update work:
   - preserve stable image slugs and object IDs where possible
   - preserve completed generated object records unless the user asks to regenerate, remove, or replace them
   - propose additions, removals, field edits, or regeneration flags rather than starting from scratch
6. Gather candidate image paths from explicit paths in `$ARGUMENTS`, `input/`, and `worlds/$0/source/`. Prefer stable paths in `worlds/$0/source/`; use `/image-blast-project` to stage originals into `source/` when needed.
7. Read each image directly and inspect it using agent image understanding. For each image, produce the `IMAGE-BLAST.md` per-image JSON, including:
   - `slug`
   - `scene_name`
   - `short_caption`
   - `long_description`
   - `environment`
   - `visual_style`
   - `lighting`
   - `atmosphere`
   - `objects`
8. Derive a deduplicated object queue from all `objects` where `generate_as_3d_object` is `true`.
9. Present the proposed image analyses and object queue to the user. Keep the summary concise, but include enough detail to approve or revise:
   - scene name and short caption for each image
   - environment, visual style, lighting, and atmosphere
   - object candidates with descriptions and evidence
10. Ask the user to approve or request changes. Do not write or replace `objects.json` until the user approves.
11. When approved, write:
    - `worlds/$0/image.json` with full per-image analysis
    - `worlds/$0/objects.json` with the deduplicated 3D object queue
12. In `objects.json`, ensure each object has stable `id`, `name`, `description`, `evidence`, `source_images`, `status`, and `working_dir`. New objects should use `status: "pending"` and `working_dir: "worlds/$0/output/<object-id>"`. Existing completed objects should remain `completed` unless explicitly marked for regeneration.
13. Refresh project state:

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

14. Report saved paths, image count, pending object count, completed object count, and regeneration count.

## Output Locations

- Rich image analysis: `worlds/$0/image.json`
- 3D object queue: `worlds/$0/objects.json`
