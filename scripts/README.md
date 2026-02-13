# Utility Scripts

Utility scripts for batch operations and maintenance tasks for Erica's Marshmallows.

## Setup

Install dependencies:

```bash
cd scripts
npm install
```

## Upload Local Photos Script

Upload photos and videos from a local folder (MacBook hard drive or iCloud Photos) to Firebase and create memories.

### Usage

```bash
cd scripts
ts-node upload-local-photos.ts \
  --folder="/Users/marcusklein/Documents/Marshmallow" \
  --couple-id="marcus-erica" \
  --user-id="dBJhzBxqnDdJPoapeWIT7qEHhKm2" \
```

### Arguments

- `--folder` (required): Path to folder containing photos/videos
  - Can be any local folder or iCloud Photos path
  - Script will recursively scan subdirectories
  - Example: `/Users/yourname/Pictures/Vacation 2023`
  - iCloud Shared Albums: `/Users/[username]/Pictures/Photos Library.photoslibrary/`

- `--couple-id` (required): Your couple ID from Firestore
  - Find this in the Firebase console or your user profile

- `--user-id` (required): Your user ID (who is creating the memories)
  - Find this in the Firebase console or your user profile

- `--no-group-by-date` (optional): Don't group photos by date
  - By default, photos from the same day are grouped into one memory
  - Use this flag to create individual memories per photo

### Examples

**Basic upload from iCloud Photos:**

```bash
ts-node upload-local-photos.ts \
  --folder="/Users/marcus/Library/Mobile Documents/com~apple~CloudDocs/Photos/Couple Photos" \
  --couple-id="abc123" \
  --user-id="user456"
```

**Upload from local folder:**

```bash
ts-node upload-local-photos.ts \
  --folder="/Users/marcus/Pictures/All Photos" \
  --couple-id="abc123" \
  --user-id="user456"
```

**Upload individual memories (not grouped by date):**

```bash
ts-node upload-local-photos.ts \
  --folder="/Users/marcus/Desktop/Special Moments" \
  --couple-id="abc123" \
  --user-id="user456" \
  --no-group-by-date
```

### Finding Your IDs

**Couple ID:**

1. Open Firebase Console → Firestore Database
2. Go to `couples` collection
3. Find your couple document
4. Copy the document ID

**User ID:**

1. Open Firebase Console → Authentication
2. Find your user email
3. Copy the UID

Or use the app:

1. Open the mobile app
2. Go to Profile screen
3. Your IDs may be displayed there (if implemented)

### Supported File Types

**Photos:**

- `.jpg`, `.jpeg`, `.png`
- `.heic`, `.heif` (iPhone photos)

**Videos:**

- `.mp4`, `.mov`, `.m4v`

### Progress Output

The script will show real-time progress:

```
🔍 Scanning folder for media files...
📁 Found 150 media files
📅 15 date groups to process

📆 Processing 2023-06-15 (10 files)...
   📤 Uploading photo 1/8: IMG_1234.jpg
   📤 Uploading photo 2/8: IMG_1235.jpg
   ...
   📤 Uploading video 1/2: VID_5678.mov
   ✅ Created memory: memory_abc123
   ✅ Progress: 1/15 groups

...

==================================================
✅ Upload complete!
   Memories created: 15
   Files processed: 150
   Errors: 0
==================================================
```

### Notes

- Large uploads may take time (10-30 seconds per file)
- Script will skip hidden folders (starting with `.`)
- All uploaded files are tagged with `local-upload` and `batch-import`
- Photos are made public (readable by anyone with the URL)
- Failed uploads are logged but don't stop the process

### Troubleshooting

**Error: "Cannot find module 'firebase-admin'"**

- Run `npm install` in the scripts folder

**Error: "No media files found"**

- Check the folder path is correct
- Ensure folder contains supported file types
- Check file permissions

**Upload failures:**

- Check Firebase credentials are correct
- Verify storage bucket permissions
- Check file sizes (very large videos may fail)

### Cost Estimation

- Firebase Storage: ~$0.026 per GB stored
- Script execution: Free (no AI analysis costs)

### Tips

1. **Start small:** Test with a folder of 10-20 photos first
2. **Organize before upload:** Put photos in dated folders for easier grouping
3. **iCloud Photos:** Export albums to a local folder first for faster processing
4. **Backup first:** Keep original photos backed up before upload
