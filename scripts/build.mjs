import { build } from 'vite';
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

await mkdir('dashboard/fonts', { recursive: true });
await Promise.all([
  copyFile('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'dashboard/fonts/inter-latin-variable.woff2'),
  copyFile('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2', 'dashboard/fonts/space-grotesk-latin-variable.woff2'),
  copyFile('node_modules/@fontsource-variable/inter/LICENSE', 'dashboard/fonts/Inter-LICENSE.txt'),
  copyFile('node_modules/@fontsource-variable/space-grotesk/LICENSE', 'dashboard/fonts/SpaceGrotesk-LICENSE.txt'),
]);
await build();
const bundledLicenses = (await readFile('dist/dashboard/THIRD_PARTY_LICENSES.md', 'utf8')).replace(/\r\n/g, '\n').trimEnd();
const tailwindLicense = (await readFile('node_modules/tailwindcss/LICENSE', 'utf8')).trimEnd();
await writeFile('dist/dashboard/THIRD_PARTY_LICENSES.md', `${bundledLicenses}\n## Tailwind CSS (MIT)\n\n${tailwindLicense}\n`);
const routes = JSON.parse(await readFile('dashboard/routes.json', 'utf8'));
const entry = await readFile('dist/dashboard/entry.html', 'utf8');
for (const path of Object.values(routes)) {
  if (typeof path !== 'string' || !/^\/dashboard(?:\/[a-z-]+)?$/.test(path)) throw new Error('Invalid dashboard route');
  await mkdir(`dist${path}`, { recursive: true });
  await writeFile(`dist${path}/index.html`, entry);
}
await rm('dist/dashboard/entry.html');
await cp('assets', 'dist/assets', { recursive: true });
await cp('dashboard/data', 'dist/dashboard/data', { recursive: true });
await cp('dashboard/tab1_ikhtisar.json', 'dist/dashboard/tab1_ikhtisar.json');
await cp('dashboard/fonts', 'dist/dashboard/fonts', { recursive: true });
// Keep the repository's static HTTP entry synchronized with the production build.
await rm('dashboard/assets', { recursive: true, force: true });
await cp('dist/dashboard', 'dashboard', { recursive: true });
await rm('dashboard/app.js.LEGAL.txt', { force: true });
