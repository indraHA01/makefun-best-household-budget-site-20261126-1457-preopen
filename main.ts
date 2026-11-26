// NestEgg — the hand-in program for the best household budget site entry.
// Node 22, standard library only. It copies this repository's app/ and
// screenshots/ into the output directory and writes dossier.json with the
// vendored make.fun library, exactly as the competition requires.
//
// The program runs twice in the grader and both runs must write the same
// bytes, so there is no timestamp, no randomness and no network here:
// plain copies plus the library's own dossier builder.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's own limits (see the kit's reference/gate.json):
// at most 4 screenshots, none over 256 KiB; app/ at most 993 files and
// directories and 16 MiB; the dossier text at most 160 KiB. The dossier is
// written last, after both copies, so it always describes the files that
// are actually in the output directory.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// A one-line receipt on stdout for the person running it locally; the
// grader reads the files, not this line, so it changes nothing there.
console.log(`NestEgg entry handed in: app/ + screenshots/ + dossier.json (${dossier.length} bytes) in ${out}`);
