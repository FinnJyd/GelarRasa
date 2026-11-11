import { build } from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('dashboard/fonts', { recursive: true });
await Promise.all([
  copyFile('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'dashboard/fonts/inter-latin-variable.woff2'),
  copyFile('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2', 'dashboard/fonts/space-grotesk-latin-variable.woff2'),
  copyFile('node_modules/@fontsource-variable/inter/LICENSE', 'dashboard/fonts/Inter-LICENSE.txt'),
  copyFile('node_modules/@fontsource-variable/space-grotesk/LICENSE', 'dashboard/fonts/SpaceGrotesk-LICENSE.txt'),
]);

await build({
  entryPoints: ['dashboard/src/main.ts'],
  outfile: 'dashboard/app.js',
  bundle: true,
  format: 'esm',
  target: ['es2022'],
  loader: { '.png': 'dataurl', '.gif': 'dataurl' },
  legalComments: 'linked',
  minify: true,
  logLevel: 'info',
});


const routes = JSON.parse(await readFile('dashboard/routes.json', 'utf8'));
const entry = await readFile('dashboard/index.html', 'utf8');
for (const path of Object.values(routes)) {
  if (typeof path !== 'string' || !/^\/dashboard(?:\/[a-z-]+)?$/.test(path)) {
    throw new Error('Invalid dashboard route');
  }
  if (path === '/dashboard') continue;
  const directory = path.slice(1);
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, entry);
}
