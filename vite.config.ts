import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import type { Connect, Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const root = import.meta.dirname;
const registry: unknown = JSON.parse(readFileSync(resolve(root, 'dashboard/routes.json'), 'utf8'));
if (!registry || typeof registry !== 'object' || Array.isArray(registry)) throw new Error('Invalid route registry');
const routes = new Set(Object.values(registry).map((path: unknown) => {
  if (typeof path !== 'string' || !/^\/dashboard(?:\/[a-z-]+)?$/.test(path)) throw new Error('Invalid dashboard route');
  return path;
}));

function dashboardRoutes(): Plugin {
  const routing = (entry: string): Connect.NextHandleFunction => (request, response, next) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const canonical = path === '/' ? '/dashboard' : path.replace(/\/index\.html$/, '').replace(/\/+$/, '');
    if (routes.has(canonical)) {
      if (path !== canonical) {
        response.writeHead(308, { Location: `${canonical}${url.search}`, 'Cache-Control': 'no-store' });
        response.end();
        return;
      }
      request.url = `${entry}${url.search}`;
    } else if (path.startsWith('/dashboard/') && !path.split('/').at(-1)?.includes('.')) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    next();
  };
  return {
    name: 'prana-dashboard-routes',
    configureServer(server) {
      server.middlewares.use(routing('/dashboard/entry.html'));
      server.watcher.on('change', file => {
        if (file.endsWith('/dashboard/routes.json')) { void server.restart(); return; }
        if (file.endsWith('/dashboard/entry.html')
          || file.endsWith('/dashboard/tab1_ikhtisar.json') || file.includes('/dashboard/data/')) {
          server.ws.send({ type: 'full-reload', path: '*' });
        }
      });
    },
    configurePreviewServer(server) { server.middlewares.use(routing('/dashboard/index.html')); },
  };
}

export default defineConfig({
  root,
  base: '/',
  appType: 'mpa',
  publicDir: false,
  plugins: [tailwindcss(), dashboardRoutes()],
  input: resolve(root, 'dashboard/entry.html'),
  server: {
    host: '127.0.0.1', port: 5500,
    headers: { 'Cache-Control': 'no-store' },
    watch: { ignored: ['**/dataset/raw/**', '**/dataset/processed/**', '**/notebooks/**', '**/test-results/**'] },
    fs: { deny: ['.env', '.env.*', '**/.git/**', '**/dataset/raw/**', '**/dataset/processed/**', '**/notebooks/**', '**/*.{pem,crt}'] },
  },
  preview: { host: '127.0.0.1', port: 5500 },
  build: {
    outDir: 'dist', emptyOutDir: true, target: 'es2022', assetsInlineLimit: 0,
    license: { fileName: 'dashboard/THIRD_PARTY_LICENSES.md' },
    rolldownOptions: { output: {
      entryFileNames: 'dashboard/app.js',
      chunkFileNames: 'dashboard/assets/[name]-[hash].js',
      assetFileNames: asset => asset.names.some(name => name.endsWith('.css'))
        ? 'dashboard/app.css' : 'dashboard/assets/[name]-[hash][extname]',
    } },
  },
});
