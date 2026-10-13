const fs = require('fs');
const { parse } = require('csv-parse/sync');

const content = fs.readFileSync('prisma/data/coffee-shops.csv', 'utf-8');
const lines = content.split('\n');
console.log('Total lines in file:', lines.length);

const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
console.log('Parsed records:', records.length);

records.forEach((r, i) => {
  const keys = Object.keys(r);
  console.log(`Row ${i + 2} (line ${i + 2}): ${keys.length} cols - ${r.name}`);
  if (keys.length !== 12) console.log('  >>> MISMATCH: expected 12, got', keys.length);
});