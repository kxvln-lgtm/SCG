// Public project covers must be image assets, not map links or embedded pages.
export function publicImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value, 'https://stagecraft.kz');
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    const image = /\.(avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
    const storage = url.hostname === 'snmcoapfubdnvaoowjjk.supabase.co' &&
      /^\/storage\/v1\/(object|render\/image)\/public\/post-media\//.test(url.pathname);
    if (url.hostname.endsWith('.supabase.co')) return storage ? url.href : '';
    return image ? url.href : '';
  } catch { return ''; }
}
