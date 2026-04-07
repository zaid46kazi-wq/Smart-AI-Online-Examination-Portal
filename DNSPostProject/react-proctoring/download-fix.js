import fs from 'fs';
import path from 'path';

const filenames = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/';
const destDir = 'public/models';

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

async function downloadModels() {
  for (const file of filenames) {
    // Note: Landmark files might be in a different subfolder in some locations, 
    // but face-api-models repo has them in root or specific subfolders.
    // Try to find the correct repo structure.
    const subfolder = file.includes('tiny') ? 'tiny_face_detector/' : 'face_landmark_68/';
    const url = baseUrl + subfolder + file;
    const dest = path.join(destDir, file);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(arrayBuffer));
      console.log(`✅ Downloaded: ${file} (${arrayBuffer.byteLength} bytes)`);
    } catch (e) {
      console.error(`❌ Error downloading ${file}:`, e.message);
    }
  }
}

downloadModels();
