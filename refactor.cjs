const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Ecoclinic/Desktop/GESTÃO TOTALSAFETY/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

let count = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    let newContent = content;
    
    // Replace simple '1fr 1fr' cases
    newContent = newContent.replace(
        /<div style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr 1fr',\s*gap:\s*'1rem'\s*\}\}>/g,
        '<div className="grid-responsive-2">'
    );
    
    // Replace the '0.75rem' gap one
    newContent = newContent.replace(
        /<div style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr 1fr',\s*gap:\s*'0\.75rem',\s*marginBottom:\s*'1rem'\s*\}\}>/g,
        '<div className="grid-responsive-2" style={{ gap: \'0.75rem\', marginBottom: \'1rem\' }}>'
    );
    
    // Replace the conditional ones
    newContent = newContent.replace(
        /<div style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*\(recurrence === 'custom' \|\| recurrence === 'custom_same_day'\) \? '1fr 1fr' : '1fr',\s*gap:\s*'1rem',\s*marginTop:\s*'1rem'\s*\}\}>/g,
        '<div className={recurrence === \'custom\' || recurrence === \'custom_same_day\' ? \'grid-responsive-2\' : \'\'} style={{ display: \'grid\', gridTemplateColumns: (recurrence === \'custom\' || recurrence === \'custom_same_day\') ? undefined : \'1fr\', gap: \'1rem\', marginTop: \'1rem\' }}>'
    );
    
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        count++;
        console.log(`Updated ${file}`);
    }
}

console.log(`Total updated: ${count}`);
