// Parse a YouTube/Vimeo URL into a safe embed URL. The embed is rebuilt from
// the extracted id (never the raw input), so arbitrary iframe srcs can't be
// injected — which matters most where the link comes from a learner rather
// than from staff.
export function videoEmbed(url: string): string | null {
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
