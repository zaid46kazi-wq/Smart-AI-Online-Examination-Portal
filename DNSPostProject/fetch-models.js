const fs = require('fs');
const path = require('path');
const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1'
];
const dir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function start() {
    console.log("Fetching face-api models via fetch...");
    for (const model of models) {
        const url = `https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/${model}`;
        const dest = path.join(dir, model);
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            fs.writeFileSync(dest, Buffer.from(buffer));
            console.log(`✅ Downloaded: ${model}`);
        } catch(e) {
            console.error(`❌ Failed: ${model}`, e.message);
        }
    }
}
start();
