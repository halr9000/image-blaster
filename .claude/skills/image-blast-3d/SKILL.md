---
name: image-blast-3d
description: Create 3D objects from objects.json or a direct image input. Use after /image-blast-uncover or when the user provides a single image to make into a 3D object.
argument-hint: [world-name] [optional object-id, image path, or instructions]
allowed-tools: Read Write Bash(node *) Task
context: fork
agent: general-purpose
---

Generate, regenerate, or directly create 3D objects for project `$0`. Additional object IDs, image paths, or instructions may appear in `$ARGUMENTS`.

## Instructions

1. Require a project/world slug in `$0`. If it is missing, ask which `worlds/<world-name>/` directory to process.
2. Ensure the project envelope exists and read current state:

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

3. Before FAL calls, remind the user that this uses `FAL_KEY`, may incur FAL cost for image editing and Hunyuan 3D, and may take several minutes per object. If the user directly invoked this skill, proceed.
4. Check `worlds/$0/objects.json` first.
   - If it exists, read it and decide whether this is normal generation, regeneration, or manifest modification based on `$ARGUMENTS`.
   - If it does not exist and the user supplied an image path plus an object name or description, create a minimal `objects.json` for that single object.
   - If it does not exist and there is no single-image input, tell the user to run `/image-blast-uncover $0` first or provide an image path and object description.
5. Choose the generation mode:
   - **Normal mode:** generate objects with `status: "pending"` or `status: "failed"`.
   - **Regenerate mode:** generate only objects named in `$ARGUMENTS`, objects with `regenerate: true`, or objects the user explicitly asked to redo, even if already completed.
   - **Single-image mode:** create or update one manifest object from the provided image path, object name, and description, then generate only that object.
6. Before spawning work, update only `objects.json` to ensure each selected object has:
   - `status: "in_progress"`
   - `working_dir: "worlds/$0/output/<object-id>"`
   - `started_at` ISO timestamp if missing
   - `regenerate: true` only when this is an explicit regeneration
7. Spawn one background subagent per selected object. Each subagent must run exactly one object and must not modify `objects.json`. For manifest objects, give each subagent this command:

```bash
node .claude/scripts/asset-pipeline/generate-single-asset.mjs --world "$0" --object-id "<object-id>" --manifest "worlds/$0/objects.json"
```

For explicit regeneration, append `--regenerate`. For direct single-image generation without a manifest object, use:

```bash
node .claude/scripts/asset-pipeline/generate-single-asset.mjs --world "$0" --image "<image-path>" --object-name "<object-name>" --description "<description>"
```

The single-object helper calls the internal image-edit helper to create a tight studio reference image for the object, calls Hunyuan 3D with `enable_pbr: true`, downloads returned files, and writes:

- `worlds/$0/output/<object-id>/object.json`
- image edit result files directly in `worlds/$0/output/<object-id>/` with incrementing names like `0-<object-id>.png`, `1-<object-id>.png`
- image-edit request/result/download metadata in the object directory
- Hunyuan request/result/download metadata in the object directory
- downloaded model files in the object directory

8. After subagents finish, read each object's `object.json`, then update `objects.json` once with final statuses:
   - `completed` when the object file reports completion
   - `failed` with error details when the object file reports failure
   - preserve each object's prior run history
9. Refresh project state:

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

10. Report completed, failed, skipped, and regenerated objects with their output directories.

## Concurrency Rule

Only the coordinator edits `worlds/$0/objects.json`. Object subagents write their own `object.json` files only. This prevents concurrent writes to the shared manifest.
