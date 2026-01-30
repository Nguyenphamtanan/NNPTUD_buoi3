/*
Simple Node script to download remote images used by products in db.json
and update product image paths to the local `images/` folder.

Usage:
  node download_images.js

Requirements: Node 18+ (for global fetch). Script will:
 - back up db.json to db.json.bak
 - create images/ if missing
 - download each URL found in product.images
 - replace product.images entries with local relative paths (images/filename)
 - write updated db.json

Note: Running this makes db.json point to local files. If you use json-server,
start it after running this so `page.html` loads images via relative URLs.
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB = path.join(__dirname, 'db.json');
const BACKUP = path.join(__dirname, 'db.json.bak');
const IMAGES_DIR = path.join(__dirname, 'images');

function extFromUrl(u) {
  try {
    const p = new URL(u).pathname;
    const e = path.extname(p).split('?')[0];
    if (e && e.length <= 5) return e;
  } catch (e) { }
  return '.jpg';
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(dest, buf);
}

(async function main(){
  if (!fs.existsSync(DB)) { console.error('db.json not found in', __dirname); process.exit(1); }
  console.log('Backing up db.json -> db.json.bak');
  await fs.promises.copyFile(DB, BACKUP);
  if (!fs.existsSync(IMAGES_DIR)) await fs.promises.mkdir(IMAGES_DIR);

  const raw = await fs.promises.readFile(DB, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.products)) { console.error('No products array found in db.json'); process.exit(1); }

  for (const p of data.products) {
    if (!p.images) continue;
    const imgs = Array.isArray(p.images) ? p.images : [p.images];
    const newImgs = [];
    for (let i = 0; i < imgs.length; i++) {
      const url = imgs[i];
      if (!url || typeof url !== 'string') continue;
      try {
        const ext = extFromUrl(url) || '.jpg';
        const safeTitle = (p.title || 'product').replace(/[^a-z0-9\-]/gi, '_').slice(0,40);
        const fname = `${p.id || 'p'}-${i}${ext}`;
        const dest = path.join(IMAGES_DIR, fname);
        console.log(`Downloading ${url} -> ${dest}`);
        await download(url, dest);
        newImgs.push('images/' + fname);
      } catch (err) {
        console.warn('Failed to download', url, err.message);
      }
    }
    if (newImgs.length) p.images = newImgs;
  }

  // write updated db.json
  await fs.promises.writeFile(DB, JSON.stringify(data, null, 2), 'utf8');
  console.log('Updated db.json and saved images into images/');
})();
