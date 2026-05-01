---
name: image-blast-world
description: Generate the 3D static environment of a world.
argument-hint: [world-name] [optional image path or world prompt]
allowed-tools: Read Write Glob Bash(ls *)
context: fork
agent: image-blast-world
---

Create or resume one World Labs world for project `$0`.

## Instructions

- If `$0` is missing, ask for the world slug.
- Use `ls -a` before reading generated state.
- Use `worlds/$0/output/world/operation.json` to resume unfinished work.
- If `world.json` already exists, only regenerate if the request clearly asks.
- Use an explicit image path from `$ARGUMENTS`, otherwise the latest image in `worlds/$0/source/`.
- If no image exists, use a text prompt from `$ARGUMENTS` or `worlds/$0/image.json`.

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

Create text prompt body:

```json
{
  "display_name": "$0",
  "world_prompt": {
    "type": "text",
    "text_prompt": "<world prompt from $ARGUMENTS>"
  }
}
```

Or image prompt body:

```json
{
  "display_name": "$0",
  "world_prompt": {
    "type": "image",
    "image_prompt": {
      "data_base64": "<base64-encoded image>"
    },
    "text_prompt": "<optional world prompt from $ARGUMENTS>"
  }
}
```

POST to `https://api.worldlabs.ai/marble/v1/worlds:generate` with `WLT-Api-Key: $WORLD_LABS_API_KEY`. Save the response to `worlds/$0/output/world/operation.json`.

Poll `https://api.worldlabs.ai/marble/v1/operations/<operation_id>` every 15 seconds until done. Update `operation.json` each poll. On success, write `response` to `worlds/$0/output/world/world.json`.

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

Final response: report the world output path, app route, and any failure/resume metadata.
