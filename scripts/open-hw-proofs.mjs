#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const dir = process.argv[2];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png')).sort()) {
  const p = path.join(dir, f);
  spawnSync('open', [p], { timeout: 5000 });
  const st = fs.statSync(p);
  const sips = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', p], { encoding: 'utf8' });
  console.log(f, 'bytes', st.size, sips.stdout.replace(/\n/g, ' ').trim());
}
