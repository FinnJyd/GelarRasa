import routes from '../../routes.json' with { type: 'json' };

export const ROUTES = routes;
export type RouteId = keyof typeof routes;

export function resolveRoute(path: string): RouteId | null {
  const normalized = path.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  for (const id in routes) {
    if (Object.hasOwn(routes, id) && isRouteId(id) && routes[id] === normalized) return id;
  }
  return null;
}

function isRouteId(id: string): id is RouteId { return Object.hasOwn(routes, id); }

export function createRouter(onNavigate: (id: RouteId | null) => void): {
  go: (id: RouteId) => void;
  destroy: () => void;
} {
  const controller = new AbortController();
  const initial = resolveRoute(location.pathname);
  if (initial && location.pathname !== ROUTES[initial]) {
    history.replaceState(null, '', `${ROUTES[initial]}${location.search}${location.hash}`);
  }
  window.addEventListener('popstate', () => onNavigate(resolveRoute(location.pathname)), { signal: controller.signal });
  return {
    go: id => {
      if (location.pathname === ROUTES[id]) return;
      history.pushState(null, '', ROUTES[id]);
      onNavigate(id);
    },
    destroy: () => controller.abort(),
  };
}
