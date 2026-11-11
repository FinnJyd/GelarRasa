import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROUTES, resolveRoute } from '../dashboard/src/shared/routes';

test('every tab has a distinct canonical route', () => {
  const paths = Object.values(ROUTES);
  assert.equal(new Set(paths).size, 6);
  assert.equal(ROUTES.overview, '/dashboard');
  for (const [id, path] of Object.entries(ROUTES)) {
    assert.equal(resolveRoute(path), id);
    assert.equal(resolveRoute(`${path}/`), id);
    assert.equal(resolveRoute(`${path}/index.html`), id);
  }
});

test('unknown routes and assets are not treated as analytical pages', () => {
  for (const path of ['/dashboard/missing', '/dashboard/app.js', '/dashboard/data/', '/unrelated']) {
    assert.equal(resolveRoute(path), null);
  }
});
