const fs = require('fs');
const path = 'backend/package.json';
let pkg = {};
if (fs.existsSync(path)) {
  try { pkg = JSON.parse(fs.readFileSync(path, 'utf8')); } catch (e) { console.error('Invalid JSON in backend/package.json'); process.exit(1); }
} else {
  pkg = { name: 'backend', version: '0.0.0', scripts: {} };
}
pkg.scripts = pkg.scripts || {};
const add = {
  "lint": "eslint \"src/**/*.ts\" --ext .ts",
  "typecheck": "tsc --noEmit",
  "format:check": "prettier --check \"src/**/*.ts\""
};
Object.assign(pkg.scripts, add);
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
console.log('backend/package.json updated (scripts merged).');
