const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'ass');
const dstDirs = [
  path.resolve(__dirname, '..', 'public', 'signatures'),
  path.resolve(__dirname, '..', 'public', 'certificate-templates', 'signatures')
];

if (!fs.existsSync(srcDir)) {
  console.error('Source directory does not exist:', srcDir);
  process.exit(1);
}

const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.png'));

dstDirs.forEach(dst => {
  if (!fs.existsSync(dst)) {
    fs.mkdirSync(dst, { recursive: true });
  }

  files.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const ext = path.extname(file);
    const nameWithoutExt = path.basename(file, ext);

    const lowerUnder = nameWithoutExt.toLowerCase().replace(/\s+/g, '_') + ext;
    const lowerHyphen = nameWithoutExt.toLowerCase().replace(/\s+/g, '-') + ext;
    const sigPrefixed = 'sig_' + lowerUnder;

    // 1. Exact name
    fs.copyFileSync(srcFile, path.join(dst, file));
    // 2. lower_underscore.png
    fs.copyFileSync(srcFile, path.join(dst, lowerUnder));
    // 3. lower-hyphen.png
    fs.copyFileSync(srcFile, path.join(dst, lowerHyphen));
    // 4. sig_lower_underscore.png
    fs.copyFileSync(srcFile, path.join(dst, sigPrefixed));
  });

  // Aliases
  const raimundi = path.join(srcDir, 'RAIMUNDI JR.png');
  if (fs.existsSync(raimundi)) {
    fs.copyFileSync(raimundi, path.join(dst, 'sig_raimundo_fernandes.png'));
    fs.copyFileSync(raimundi, path.join(dst, 'raimundo_fernandes.png'));
    fs.copyFileSync(raimundi, path.join(dst, 'sig_raimundo.png'));
  }

  const pedro = path.join(srcDir, 'PEDRO PADILHA.png');
  if (fs.existsSync(pedro)) {
    fs.copyFileSync(pedro, path.join(dst, 'sig_pedro_henrique.png'));
    fs.copyFileSync(pedro, path.join(dst, 'pedro_henrique.png'));
  }

  const eider = path.join(srcDir, 'EIDER GOMES.png');
  if (fs.existsSync(eider)) {
    fs.copyFileSync(eider, path.join(dst, 'm2_sig_eider.png'));
    fs.copyFileSync(eider, path.join(dst, 'm1_sig_resp_tecnico.png'));
  }

  const cezar = path.join(srcDir, 'CEZAR AUGUSTO.png');
  if (fs.existsSync(cezar)) {
    fs.copyFileSync(cezar, path.join(dst, 'm2_sig_cezar.png'));
  }
});

console.log('Successfully synced all ' + files.length + ' signatures to public folders.');
