// Where to go after logging in / signing up, from a `?redirect=/invite/abc` query param.
// Only same-site paths are allowed, so a crafted link can't bounce users to another site.
export const getSafeRedirect = (searchParams) => {
  const target = searchParams.get('redirect');
  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return null;
};

// Keeps the redirect when switching between the login and signup pages
export const withRedirect = (path, redirect) =>
  redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path;
