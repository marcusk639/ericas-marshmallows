#!/usr/bin/env ts-node
/**
 * Local Photo Upload Script for MacBook
 *
 * Uploads photos and videos from a local folder (hard drive or iCloud) to Firebase
 * and creates memories in the database.
 *
 * Usage:
 *   ts-node upload-local-photos.ts --folder="/path/to/photos" --couple-id="couple123" --user-id="user123"
 *
 * Options:
 *   --folder        Path to folder containing photos/videos
 *   --couple-id     Couple ID in Firestore
 *   --user-id       User ID creating the memories
 *   --group-by-date Group photos by date into same memory (default: true)
 */

import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { initializeApp, cert } from "firebase-admin/app";
import { getStorage, getDownloadURL } from "firebase-admin/storage";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Initialize Firebase Admin
const serviceAccount = require("../shared/firebase-private-key.json");
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "erica-s-marshmallows.firebasestorage.app",
});

const storage = getStorage();
const db = getFirestore();
const bucket = storage.bucket("erica-s-marshmallows.firebasestorage.app");

const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic", ".heif"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v"];
const MEDIA_EXTENSIONS = [...PHOTO_EXTENSIONS, ...VIDEO_EXTENSIONS];

interface MediaFile {
  path: string;
  name: string;
  type: "photo" | "video";
  createdAt: Date;
  size: number;
}

/**
 * Get all media files from a folder recursively
 */
async function getMediaFiles(folderPath: string): Promise<MediaFile[]> {
  const files: MediaFile[] = [];

  async function scanDirectory(dirPath: string) {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden folders and system folders
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          await scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        if (MEDIA_EXTENSIONS.includes(ext)) {
          const stats = await stat(fullPath);
          const type = PHOTO_EXTENSIONS.includes(ext) ? "photo" : "video";

          files.push({
            path: fullPath,
            name: entry.name,
            type,
            createdAt: stats.birthtime,
            size: stats.size,
          });
        }
      }
    }
  }

  await scanDirectory(folderPath);
  return files.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Group media files by date
 */
function groupByDate(files: MediaFile[]): Map<string, MediaFile[]> {
  const grouped = new Map<string, MediaFile[]>();

  for (const file of files) {
    const dateKey = file.createdAt.toISOString().split("T")[0];

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(file);
  }

  return grouped;
}

/**
 * Get proper MIME type for a file based on extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  // Photo MIME types
  const photoTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".heic": "image/heic",
    ".heif": "image/heif",
  };

  // Video MIME types
  const videoTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
  };

  return photoTypes[ext] || videoTypes[ext] || "application/octet-stream";
}

/**
 * Upload a file to Firebase Storage
 */
async function uploadFile(
  filePath: string,
  coupleId: string,
  type: "photo" | "video",
): Promise<string> {
  const fileName = `${Date.now()}_${path.basename(filePath)}`;
  const storagePath = `couples/${coupleId}/memories/${fileName}`;
  const contentType = getContentType(filePath);

  await bucket.upload(filePath, {
    destination: storagePath,
    metadata: {
      contentType,
    },
  });

  const file = bucket.file(storagePath);
  await file.makePublic();

  return await getDownloadURL(file);
}

/**
 * Create a memory in Firestore
 */
async function createMemory(
  coupleId: string,
  userId: string,
  title: string,
  description: string,
  photoUrls: string[],
  videoUrls: string[],
  tags: string[],
  date: Date,
): Promise<string> {
  const memoryRef = await db.collection("memories").add({
    coupleId,
    createdBy: userId,
    title,
    description,
    photoUrls,
    videoUrls,
    devicePhotoUris: [],
    deviceVideoUris: [],
    tags,
    date: Timestamp.fromDate(date),
    source: "manual",
    createdAt: Timestamp.now(),
  });

  console.log(`✅ Created memory: ${memoryRef.id}`);
  return memoryRef.id;
}

/**
 * Main upload function
 */
async function uploadPhotos(
  folderPath: string,
  coupleId: string,
  userId: string,
  options: {
    groupByDateFlag?: boolean;
  } = {},
) {
  const { groupByDateFlag: shouldGroupByDate = true } = options;

  console.log("🔍 Scanning folder for media files...");
  const allFiles = await getMediaFiles(folderPath);
  console.log(`📁 Found ${allFiles.length} media files`);

  if (allFiles.length === 0) {
    console.log("❌ No media files found. Exiting.");
    return;
  }

  const groups = groupByDateFlag
    ? groupByDate(allFiles)
    : new Map([["all", allFiles]]);

  console.log(`📅 ${groups.size} date groups to process\n`);

  let processedGroups = 0;
  let totalMemoriesCreated = 0;
  let totalErrors = 0;

  for (const [dateKey, files] of groups.entries()) {
    console.log(`\n📆 Processing ${dateKey} (${files.length} files)...`);

    const photos = files.filter((f) => f.type === "photo");
    const videos = files.filter((f) => f.type === "video");

    // Upload photos
    const photoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        console.log(
          `   📤 Uploading photo ${i + 1}/${photos.length}: ${photo.name}`,
        );
        const url = await uploadFile(photo.path, coupleId, "photo");
        photoUrls.push(url);
      } catch (error) {
        console.error(`   ❌ Error uploading ${photo.name}:`, error);
        totalErrors++;
      }
    }

    // Upload videos
    const videoUrls: string[] = [];
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      try {
        console.log(
          `   📤 Uploading video ${i + 1}/${videos.length}: ${video.name}`,
        );
        const url = await uploadFile(video.path, coupleId, "video");
        videoUrls.push(url);
      } catch (error) {
        console.error(`   ❌ Error uploading ${video.name}:`, error);
        totalErrors++;
      }
    }

    // Create memory
    if (photoUrls.length > 0 || videoUrls.length > 0) {
      const date = shouldGroupByDate ? new Date(dateKey) : files[0].createdAt;
      const title = `Memory from ${date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
      const description = `${photos.length} photo${photos.length !== 1 ? "s" : ""}, ${videos.length} video${videos.length !== 1 ? "s" : ""}`;

      await createMemory(
        coupleId,
        userId,
        title,
        description,
        photoUrls,
        videoUrls,
        ["local-upload", "batch-import"],
        date,
      );

      totalMemoriesCreated++;
    }

    processedGroups++;
    console.log(`   ✅ Progress: ${processedGroups}/${groups.size} groups`);
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Upload complete!`);
  console.log(`   Memories created: ${totalMemoriesCreated}`);
  console.log(`   Files processed: ${allFiles.length}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log("=".repeat(50));
}

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=")[1];
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const folderPath = getArg("folder");
const coupleId = getArg("couple-id");
const userId = getArg("user-id");
const groupByDateFlag = !hasFlag("no-group-by-date");

if (!folderPath || !coupleId || !userId) {
  console.error("❌ Missing required arguments");
  console.log("\nUsage:");
  console.log("  ts-node upload-local-photos.ts \\");
  console.log('    --folder="/path/to/photos" \\');
  console.log('    --couple-id="couple123" \\');
  console.log('    --user-id="user123" \\');
  console.log("    [--no-group-by-date]");
  process.exit(1);
}

// Run the upload
uploadPhotos(folderPath, coupleId, userId, { groupByDateFlag })
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
