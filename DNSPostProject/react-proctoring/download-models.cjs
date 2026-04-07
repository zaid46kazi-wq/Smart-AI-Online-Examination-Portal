const https = require('https');
const fs = require('fs');
const path = require('path');

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.weights.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.weights.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.weights.bin'
];

const dir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        download(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        reject(new Error(`Failed with status: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function start() {
    console.log("Downloading strictly required Face-API AI weights to /public/models...");
    for (const model of models) {
        const url = `https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/${model}`;
        const dest = path.join(dir, model);
        try {
            await download(url, dest);
            console.log(`✅ Downloaded: ${model}`);
        } catch(e) {
            console.error(`❌ Failed: ${model}`, e);
        }
    }
    console.log("All Face-API weights securely deployed.");
}

start();
