---
name: image-blast-3d
description: Create 3D objects from output/<object>/object.json files or a direct image input. Use after /image-blast-uncover or when the user provides a single image to make into a 3D object.
argument-hint: [world-name] [optional object-id, image path, or instructions]
allowed-tools: Read Write Glob Bash(ls *) Bash(node .claude/scripts/project/project-state.mjs *) Bash(node .claude/scripts/asset-pipeline/generate-single-asset.mjs *) Task
context: fork
agent: general-purpose
---

Generate, regenerate, or directly create 3D objects for project `$0`. Additional object IDs, image paths, or instructions may appear in `$ARGUMENTS`.

## Instructions

Follow the generic file convention in `.claude/rules/project.md`. Use `ls -a worlds/$0/output/<object-id>/` first for object state; read `object.json` for durable object intent and hidden request JSON only for request/resume details.

1. Require a project/world slug in `$0`. If it is missing, ask which `worlds/<world-name>/` directory to process.
2. Ensure the project envelope exists and read derived state:

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

3. Before FAL calls, remind the user that this uses `FAL_KEY`, may incur FAL cost for image editing and Hunyuan 3D, and may take several minutes per object. If the user directly invoked this skill, proceed.
4. Scan `worlds/$0/output/*/object.json` for objects. Ignore reserved output directories such as `world/` and `sfx/`.
   - If object files exist, select the exact object set before running any paid generation.
   - If no object files exist and the user supplied an image path plus an object name or description, create a new object directory through the single-object helper.
   - If no object files exist and there is no single-image input, tell the user to run `/image-blast-uncover $0` first or provide an image path and object description.
5. Choose the generation mode with strict selection rules:
   - **Named-object mode:** if `$ARGUMENTS` contains an object id, object name, or material phrase, generate only matching object(s). Example: `/image-blast-3d sterile-electronic-lab ceramic storage jar` means only `ceramic-storage-jar`.
   - **All-pending mode:** generate all pending or failed objects only when `$ARGUMENTS` explicitly says `all`, `all pending`, `everything`, `all objects`, or similarly clear wording. Example: `/image-blast-3d sterile-electronic-lab all pending`.
   - **Regenerate mode:** regenerate only named objects, objects with `object.regenerate: true`, or objects the user explicitly asked to redo. If the user says `regenerate all`, require the same explicit all-pending wording.
   - **Single-image mode:** create or update one object directory from the provided image path, object name, and description, then generate only that object.
   - If matching is ambiguous, show the candidate matches and ask before running paid generation.
   - If no object target and no explicit all-pending wording is present, show the pending objects and ask which object(s) to generate.
6. Always launch one background subagent per selected object. Do not run `generate-single-asset.mjs` in the current skill agent. Each background subagent must run exactly one object, should first inspect its object directory with `ls -a`, and should write only that object's directory. For existing objects, the subagent runs:

```bash
node .claude/scripts/asset-pipeline/generate-single-asset.mjs --world "$0" --object-id "<object-id>"
```

For explicit regeneration, append `--regenerate`. For direct single-image generation, use:

```bash
node .claude/scripts/asset-pipeline/generate-single-asset.mjs --world "$0" --image "<image-path>" --object-name "<object-name>" --description "<description>"
```

The single-object helper calls the internal image-edit helper to create a tight studio reference image for the object, calls Hunyuan 3D with `enable_pbr: true`, downloads returned files, and writes:

- `worlds/$0/output/<object-id>/object.json` only for durable object intent
- image edit result files directly in `worlds/$0/output/<object-id>/` with indexed names like `0-<object-id>.png`, `1-<object-id>.png`
- downloaded model files in the object directory with matching indexes like `0-<object-id>.glb`
- hidden compact request metadata beside the artifacts: `.0-<object-id>__image-request.json`, `.0-<object-id>__model-request.json`
- the same index ties together the 2D request, reference image, 3D request, and model output
- read request `kind` from the metadata JSON, not from the filename

7. Return after launching the background subagents. Report the object directories and tell the user generation is continuing in background workers. Do not wait for the FAL polling commands to complete in the current skill agent.
8. When checking results later, inspect each object directory with `ls -a` and read hidden request JSON only when request details are needed.

## Concurrency Rule

There is no shared root object file. Object subagents write their own `worlds/$0/output/<object-id>/object.json` files only. This prevents concurrent writes to shared state.
