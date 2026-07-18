/**
 * Asset pipeline utility (Next.js Local Public Assets version)
 *
 * Downloads image assets from Omeda.city CDN and saves them directly to
 * the local Next.js `public/assets/` directory.
 * Statically hosted on Vercel for free, keeping Firestore on Spark plan!
 */
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

const OMEDA_BASE = 'https://omeda.city'
const PRED_GG_BASE = 'https://pred.gg'

export interface UploadedAsset {
  firebaseUrl: string // renamed to match database field name, but represents local app path
  hash: string
}

/**
 * Get the local filesystem path for a given storage path
 */
function getLocalPath(storagePath: string): string {
  return path.resolve(process.cwd(), 'public', 'assets', storagePath)
}

/**
 * Ensure the directory for a given local path exists
 */
function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath)
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true })
  }
}

/**
 * Download an asset by hash from Omeda.city CDN and save to Next.js public/assets directory.
 * Returns the public relative URL path.
 */
export async function downloadAndUploadAsset(
  hash: string,
  storagePath: string,
  source: 'omeda' | 'predgg' = 'omeda'
): Promise<UploadedAsset> {
  const baseUrl = source === 'predgg' ? PRED_GG_BASE : OMEDA_BASE
  const assetUrl = `${baseUrl}/assets/${hash}.webp`
  const localFilePath = getLocalPath(storagePath)

  // Check if it already exists to avoid redundant downloads
  if (fs.existsSync(localFilePath)) {
    console.log(`  ✓ Asset already exists locally: ${storagePath}`)
    return { firebaseUrl: `/assets/${storagePath}`, hash }
  }

  console.log(`  ↓ Downloading asset: ${assetUrl}`)

  const response = await fetch(assetUrl)
  if (!response.ok) {
    throw new Error(`Failed to download asset ${assetUrl}: ${response.status} ${response.statusText}`)
  }

  const buffer = await response.buffer()
  ensureDirectoryExistence(localFilePath)
  fs.writeFileSync(localFilePath, buffer)

  const publicUrl = `/assets/${storagePath}`
  console.log(`  ✓ Saved to public assets: ${storagePath}`)
  return { firebaseUrl: publicUrl, hash }
}

/**
 * Upload an asset from a direct URL (for pred.gg eternals images)
 */
export async function downloadAndUploadFromUrl(
  url: string,
  storagePath: string
): Promise<string> {
  const localFilePath = getLocalPath(storagePath)

  if (fs.existsSync(localFilePath)) {
    console.log(`  ✓ Asset already exists locally: ${storagePath}`)
    return `/assets/${storagePath}`
  }

  console.log(`  ↓ Downloading from URL: ${url}`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`)
  }

  const buffer = await response.buffer()
  ensureDirectoryExistence(localFilePath)
  fs.writeFileSync(localFilePath, buffer)

  console.log(`  ✓ Saved: ${storagePath}`)
  return `/assets/${storagePath}`
}

/**
 * Check if an asset already exists locally.
 */
export async function assetExists(storagePath: string): Promise<boolean> {
  return fs.existsSync(getLocalPath(storagePath))
}
