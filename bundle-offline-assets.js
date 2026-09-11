const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'sahay-ai-app', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

function download(url, dest, maxRedirects = 8) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const urlObj = new URL(url);
        const lib = urlObj.protocol === 'https:' ? https : http;
        lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                file.close();
                fs.unlinkSync(dest);
                let loc = res.headers.location;
                if (!loc.startsWith('http')) {
                    loc = urlObj.protocol + '//' + urlObj.hostname + loc;
                }
                if (maxRedirects === 0) return reject(new Error('Too many redirects'));
                return download(loc, dest, maxRedirects - 1).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                file.close();
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
            file.on('error', reject);
        }).on('error', (err) => { file.close(); reject(err); });
    });
}

async function main() {
     
    console.log('Downloading Material Symbols font...');
    const matFontUrl = 'https://fonts.gstatic.com/s/materialsymbolsoutlined/v232/kJEhBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oFsI.woff2';
    await download(matFontUrl, path.join(assetsDir, 'material-symbols.woff2'));

    // Write a minimal local CSS for Material Symbols
    const matCss = `@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  font-display: block;
  src: url(assets/material-symbols.woff2) format('woff2');
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
`;
    fs.writeFileSync(path.join(assetsDir, 'material-symbols.css'), matCss);
    console.log('Material Symbols done.');

    // 3. Download Inter and Public Sans fonts
    console.log('Downloading Google Fonts CSS...');
    // Use a pinned API with platform user-agent to get woff2 URLs
    const gfOptions = {
        hostname: 'fonts.googleapis.com',
        path: '/css2?family=Inter:wght@400;500;600&family=Public+Sans:wght@600;700&display=swap',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    };

    const gfCss = await new Promise((resolve, reject) => {
        https.get(gfOptions, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });

    const gfWoffUrls = [...gfCss.matchAll(/url\((https:\/\/[^)]+\.woff2[^)]*)\)/g)].map(m => m[1]);
    console.log(`Found ${gfWoffUrls.length} google font woff2 files to download...`);
    let patchedGfCss = gfCss;
    for (let i = 0; i < gfWoffUrls.length; i++) {
        const fontUrl = gfWoffUrls[i];
        const fontName = `gfont-${i}.woff2`;
        await download(fontUrl, path.join(assetsDir, fontName));
        patchedGfCss = patchedGfCss.replace(new RegExp(fontUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `assets/${fontName}`);
        console.log(`Downloaded gfont ${i + 1}/${gfWoffUrls.length}`);
    }
    fs.writeFileSync(path.join(assetsDir, 'google-fonts.css'), patchedGfCss);
    console.log('Google Fonts done.');

    console.log('All assets downloaded. Now patching HTML files...');

    // 4. Patch all HTML files
    const htmlDir = path.join(__dirname, 'sahay-ai-app');
    const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));

    for (const htmlFile of htmlFiles) {
        const filePath = path.join(htmlDir, htmlFile);
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace Tailwind CDN script (handle with or without plugins param)
        content = content.replace(
            /<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>/g,
            '<script src="assets/tailwind.min.js"></script>'
        );

        // Remove Google Fonts preconnect links
        content = content.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"[^>]*\/?>/g, '');
        content = content.replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*\/?>/g, '');

        // Replace Google Fonts inter/public sans link
        content = content.replace(
            /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^"]*" rel="stylesheet"[^>]*\/?>/g,
            '<link href="assets/google-fonts.css" rel="stylesheet"/>'
        );

        // Replace Material Symbols link
        content = content.replace(
            /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material[^"]*" rel="stylesheet"[^>]*\/?>/g,
            '<link href="assets/material-symbols.css" rel="stylesheet"/>'
        );

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Patched: ${htmlFile}`);
    }

    console.log('\nAll done! HTML files now use local assets for full offline support.');
}

main().catch(err => { console.error('Fatal Error:', err); process.exit(1); });
