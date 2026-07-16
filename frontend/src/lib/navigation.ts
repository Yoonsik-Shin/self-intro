export const pagePaths = {
  intro: '/',
  experience: '/experience',
  blog: '/study',
  architecture: '/architecture',
} as const;

export function navigate(path: string, options: { replace?: boolean } = {}) {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentPath === path) return;

  if (options.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function pathForStudy(slug: string) {
  return `/study/${encodeURIComponent(slug)}`;
}

export function pathForExperienceDetail(id: number) {
  return `/experience-detail/${id}`;
}
