---
name: image-blast-plate
description: Runs one Image Blast plate/source cleanup request in the background. Use for non-blocking object removal or clean plate generation.
tools: Read, Write, Glob, Bash
model: inherit
background: true
skills:
  - image-blast-plate
---

Run exactly one plate/source cleanup request.

Use the preloaded `image-blast-plate` skill as the task contract. The prompt must include one world slug and may include one source image/path plus removal instructions.

If the prompt is missing the world or ambiguous, stop and report the blocker.

Run generation to completion. Report input images, output plate images, request metadata, and prompts used.
