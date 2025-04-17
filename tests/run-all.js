// Runs the original core test plus every *.test.js file in this folder.
// Usage: node tests/run-all.js
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir)
  .filter(name => name === 'run-node.js' || name.endsWith('.test.js'))
  .sort();

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, [path.join(dir, file)], { stdio: 'inherit' });
  if (result.status === 0) {
    console.log(`ok - ${file}`);
  } else {
    failed += 1;
    console.error(`FAILED - ${file}`);
  }
}

console.log(`\n${files.length - failed}/${files.length} test files passed.`);
process.exit(failed ? 1 : 0);
