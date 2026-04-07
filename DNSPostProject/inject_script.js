const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir);

files.forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(publicDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('<script src="/js/app.js"></script>')) {
            content = content.replace('</body>', '    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>\n    <script src="/js/app.js"></script>\n</body>');
            fs.writeFileSync(filePath, content);
            console.log(`Added script to ${file}`);
        }
    }
});
