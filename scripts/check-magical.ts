import fs from 'fs';

const content = fs.readFileSync('src/pages/index.tsx', 'utf8');
const lines = content.split('\n');

console.log("=== Checking index.tsx setSelectedHero ===");
lines.forEach((line, idx) => {
  if (line.includes('setSelectedHero') || line.includes('setSelectedHeroB')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
