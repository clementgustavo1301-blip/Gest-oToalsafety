const fs = require('fs');
const img = fs.readFileSync('public/logo-relatorio.png');
const base64 = 'data:image/png;base64,' + img.toString('base64');
fs.writeFileSync('src/assets/logoBase64.js', `export const logoBase64 = "${base64}";`);
console.log('Fixed logoBase64.js successfully.');
