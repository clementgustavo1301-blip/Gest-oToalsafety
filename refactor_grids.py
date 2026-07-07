import os
import glob
import re

count = 0
for file_path in glob.glob('c:/Users/Ecoclinic/Desktop/GESTÃO TOTALSAFETY/src/components/*.jsx'):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace simple '1fr 1fr' cases
    new_content = re.sub(
        r"<div style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr 1fr',\s*gap:\s*'1rem'\s*\}\}>",
        '<div className="grid-responsive-2">',
        content
    )
    
    # Replace the '0.75rem' gap one in TrainingCalendar.jsx
    new_content = re.sub(
        r"<div style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr 1fr',\s*gap:\s*'0\.75rem',\s*marginBottom:\s*'1rem'\s*\}\}>",
        '<div className="grid-responsive-2" style={{ gap: \'0.75rem\', marginBottom: \'1rem\' }}>',
        new_content
    )
    
    # Replace the conditional ones
    new_content = re.sub(
        r"<div style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*\(recurrence === 'custom' \|\| recurrence === 'custom_same_day'\) \? '1fr 1fr' : '1fr',\s*gap:\s*'1rem',\s*marginTop:\s*'1rem'\s*\}\}>",
        '<div className={recurrence === \'custom\' || recurrence === \'custom_same_day\' ? \'grid-responsive-2\' : \'\'} style={{ display: \'grid\', gridTemplateColumns: (recurrence === \'custom\' || recurrence === \'custom_same_day\') ? undefined : \'1fr\', gap: \'1rem\', marginTop: \'1rem\' }}>',
        new_content
    )
    
    if content != new_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1
        print(f'Updated {os.path.basename(file_path)}')

print(f'Total updated: {count}')
