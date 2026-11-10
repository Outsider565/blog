// Site origin and base path. Defaults match https://outsider565.github.io/blog/;
// override with SITE_URL (origin only) and BASE_PATH when deploying elsewhere.
export function siteConfig(environment = process.env) {
  const url = new URL(environment.SITE_URL?.trim() || 'https://outsider565.github.io');
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('SITE_URL must be an HTTP(S) origin without a path, query, or credentials. Use BASE_PATH for a subpath.');
  }
  const path = (environment.BASE_PATH?.trim() ?? '/blog').replace(/^\/+|\/+$/g, '');
  if (path && path.split('/').some(segment => !/^[a-zA-Z0-9._-]+$/.test(segment) || ['.', '..'].includes(segment))) {
    throw new Error('BASE_PATH must contain only slash-separated path segments.');
  }
  return { site: url.origin, base: path ? `/${path}` : '/' };
}
