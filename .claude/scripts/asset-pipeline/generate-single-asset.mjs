#!/usr/bin/env node
import { readdir, rename } from "node:fs/promises";
import path from "node:path";
import { runHunyuan3D } from "./hunyuan-3d.mjs";
import { runImageEdit } from "./image-edit.mjs";
import {
  ensureDir,
  one,
  parseArgs,
  pathExists,
  readJson,
  safeFileName,
  slugify,
  writeJson
} from "./fal-queue.mjs";

async function readJsonIfExists(filePath) {
  return (await pathExists(filePath)) ? readJson(filePath) : undefined;
}

function collectSourceImages(object, manifest, directImage) {
  const images = new Set();

  if (directImage) images.add(directImage);

  for (const image of object.source_images || []) {
    images.add(image);
  }

  for (const evidence of object.evidence || []) {
    if (evidence.image) images.add(evidence.image);
  }

  if (images.size === 0) {
    for (const image of manifest?.source_images || []) {
      images.add(image);
      if (images.size >= 3) break;
    }
  }

  return [...images];
}

function firstGeneratedImage(imageEditSummary) {
  return imageEditSummary.downloaded_files.find((downloaded) => {
    const contentType = downloaded.source?.content_type || "";
    return contentType.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(downloaded.path);
  });
}

function buildDirectObject({ objectId, objectName, description, image, world }) {
  const name = objectName || objectId || path.basename(image, path.extname(image));
  const id = objectId || slugify(name);
  return {
    id,
    name,
    description: description || name,
    source_images: image ? [image] : [],
    evidence: image ? [{ image, notes: "Direct single-image object input" }] : [],
    status: "pending",
    working_dir: `worlds/${world}/output/${id}`
  };
}

function buildPrompt(object) {
  return `Create a single clean product reference image for this object only:

Name: ${object.name}
Description: ${object.description}

Requirements:
- show only this object, no surrounding scene and no extra props
- white background, studio lighting, centered composition
- cropped tightly while keeping the entire object visible
- realistic material detail suitable for image-to-3D generation
- no text, labels, hands, people, floor shadows, or duplicate objects`;
}

async function resolveObject(options) {
  const {
    world,
    objectId,
    manifestPath = `worlds/${world}/objects.json`,
    directImage,
    objectName,
    description
  } = options;

  const manifest = await readJsonIfExists(manifestPath);
  const manifestObject = objectId
    ? manifest?.objects?.find((candidate) => candidate.id === objectId)
    : undefined;

  if (manifestObject) {
    return { manifest, object: manifestObject, manifestPath };
  }

  if (directImage) {
    return {
      manifest,
      object: buildDirectObject({
        objectId,
        objectName,
        description,
        image: directImage,
        world
      }),
      manifestPath
    };
  }

  if (!manifest) {
    throw new Error(
      `No object manifest found at ${manifestPath}. Provide --image and --object-name for direct single-image generation.`
    );
  }

  throw new Error(`Object ${objectId} was not found in ${manifestPath}.`);
}

async function nextNumberedImagePath(objectDir, objectId, sourcePath) {
  await ensureDir(objectDir);
  const safeSlug = safeFileName(objectId);
  const extension = path.extname(sourcePath) || ".png";
  const entries = await readdir(objectDir, { withFileTypes: true }).catch(() => []);
  const matcher = new RegExp(`^(\\d+)-${safeSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.`);
  const maxIndex = entries.reduce((max, entry) => {
    if (!entry.isFile()) return max;
    const match = entry.name.match(matcher);
    return match ? Math.max(max, Number(match[1])) : max;
  }, -1);
  return path.join(objectDir, `${maxIndex + 1}-${safeSlug}${extension}`);
}

async function normalizeReferenceImage(downloadedImage, objectDir, objectId) {
  const numberedPath = await nextNumberedImagePath(objectDir, objectId, downloadedImage.path);
  if (downloadedImage.path !== numberedPath) {
    await rename(downloadedImage.path, numberedPath);
  }
  return {
    ...downloadedImage,
    path: numberedPath
  };
}

export async function generateSingleObject(options) {
  const {
    world,
    objectId,
    manifestPath = `worlds/${world}/objects.json`,
    directImage,
    objectName,
    description,
    regenerate = false,
    imageEditProvider
  } = options;

  if (!world) throw new Error("world is required.");
  if (!objectId && !directImage) throw new Error("objectId or directImage is required.");

  const resolved = await resolveObject({
    world,
    objectId,
    manifestPath,
    directImage,
    objectName,
    description
  });

  const object = {
    ...resolved.object,
    status: "in_progress"
  };
  const objectDir = object.working_dir || `worlds/${world}/output/${object.id}`;
  await ensureDir(objectDir);

  const objectJsonPath = path.join(objectDir, "object.json");
  const previous = await readJsonIfExists(objectJsonPath);
  const sourceImages = collectSourceImages(object, resolved.manifest, directImage);
  if (sourceImages.length === 0) {
    throw new Error(`Object ${object.id} does not have source images for image editing.`);
  }

  const runId = new Date().toISOString();
  const started = {
    schema_version: 1,
    world,
    manifest_path: resolved.manifest ? manifestPath : undefined,
    object: {
      ...object,
      working_dir: objectDir
    },
    runs: [
      ...(previous?.runs || []),
      {
        id: runId,
        status: "in_progress",
        regenerate: Boolean(regenerate || previous),
        started_at: runId,
        output_dir: objectDir
      }
    ],
    previous_completed_at: previous?.completed_at,
    updated_at: new Date().toISOString(),
    files: previous?.files || {}
  };
  await writeJson(objectJsonPath, started);

  try {
    const imageEdit = await runImageEdit({
      provider: imageEditProvider || object.image_edit_provider,
      prompt: buildPrompt(object),
      images: sourceImages,
      outputDir: objectDir,
      numImages: 1,
      resolution: "1K",
      aspectRatio: "1:1",
      outputFormat: "png",
      limitGenerations: true
    });

    const rawGeneratedImage = firstGeneratedImage(imageEdit);
    if (!rawGeneratedImage) {
      throw new Error(`Image edit did not return a downloadable image for ${object.id}.`);
    }
    const generatedImage = await normalizeReferenceImage(rawGeneratedImage, objectDir, object.id);

    await writeJson(objectJsonPath, {
      ...started,
      object: {
        ...started.object,
        status: "image_generated"
      },
      updated_at: new Date().toISOString(),
      files: {
        ...started.files,
        source_images: sourceImages,
        reference_image: generatedImage.path,
        image_edit: path.join(objectDir, "image-edit-files.json"),
        image_edit_provider: imageEdit.provider
      }
    });

    const hunyuan = await runHunyuan3D({
      image: generatedImage.path,
      outputDir: objectDir,
      assetName: object.name,
      enablePbr: true,
      generateType: "Normal",
      faceCount: 500000
    });

    const runs = started.runs.map((run) =>
      run.id === runId
        ? {
            ...run,
            status: "completed",
            completed_at: new Date().toISOString(),
            reference_image: generatedImage.path,
            downloaded_model_files: hunyuan.downloaded_files.map((file) => file.path)
          }
        : run
    );

    const completed = {
      ...started,
      object: {
        ...started.object,
        status: "completed"
      },
      runs,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      files: {
        source_images: sourceImages,
        reference_image: generatedImage.path,
        image_edit: path.join(objectDir, "image-edit-files.json"),
        image_edit_provider: imageEdit.provider,
        hunyuan_3d: path.join(objectDir, "hunyuan-3d-files.json"),
        downloaded_model_files: hunyuan.downloaded_files.map((file) => file.path)
      },
      results: {
        image_edit_request_id: imageEdit.request_id,
        image_edit_provider: imageEdit.provider,
        hunyuan_3d_request_id: hunyuan.request_id
      }
    };

    await writeJson(objectJsonPath, completed);
    return completed;
  } catch (error) {
    const runs = started.runs.map((run) =>
      run.id === runId
        ? {
            ...run,
            status: "failed",
            failed_at: new Date().toISOString(),
            error: error.message
          }
        : run
    );

    const failed = {
      ...started,
      object: {
        ...started.object,
        status: "failed"
      },
      runs,
      updated_at: new Date().toISOString(),
      failed_at: new Date().toISOString(),
      error: error.message
    };
    await writeJson(objectJsonPath, failed);
    throw error;
  }
}

export const generateSingleAsset = generateSingleObject;

async function main() {
  const { flags } = parseArgs();
  const world = one(flags, "world");
  const objectId = one(flags, "object-id") || one(flags, "asset-id");
  const directImage = one(flags, "image");

  if (!world || (!objectId && !directImage)) {
    throw new Error(
      "Usage: node generate-single-asset.mjs --world <world-name> (--object-id <object-id> | --image <path>) [--object-name <name>] [--description <text>] [--regenerate]"
    );
  }

  const result = await generateSingleObject({
    world,
    objectId,
    directImage,
    objectName: one(flags, "object-name") || one(flags, "asset-name"),
    description: one(flags, "description"),
    regenerate: Boolean(flags.regenerate),
    imageEditProvider: one(flags, "image-edit-provider"),
    manifestPath: one(flags, "manifest", `worlds/${world}/objects.json`)
  });

  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
