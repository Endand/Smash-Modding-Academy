// Turn a video link into a safe embed URL.
//
// Every branch rebuilds the URL from an id captured as plain letters and
// digits, dropped into a hardcoded host. Nothing the person pasted reaches the
// iframe src, so a crafted link cannot put an arbitrary page in the player.
// That matters most for project submissions, where the link comes from a
// learner rather than from staff.
export function videoEmbed(url: string): string | null {
  const u = url.trim();

  // youtube.com/watch?v=, /embed/, /shorts/, /live/, and youtu.be/
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // streamable.com/<id>, and the /e/ and /o/ forms people copy from the
  // share dialog. /e/ is the actual player, so everything normalises to it.
  const streamable = u.match(/streamable\.com\/(?:e\/|o\/|s\/)?([A-Za-z0-9]{3,})/);
  if (streamable) return `https://streamable.com/e/${streamable[1]}`;

  // medal.tv share links carry an optional language prefix and game segment,
  // and use either clip/ or clips/. Older links add a share token after the id.
  //
  // The game segment is kept when the link has one, because medal.tv/games/
  // <game>/clip/<id> is the form that allows being framed. The short
  // medal.tv/clip/<id> only redirects there, so it is the fallback.
  const medal = u.match(/medal\.tv\/(?:[a-z]{2}\/)?(?:games\/([A-Za-z0-9_-]+)\/)?clips?\/([A-Za-z0-9]+)(?:\/([A-Za-z0-9]+))?/);
  if (medal) {
    const [, game, id, token] = medal;
    const clip = token ? `${id}/${token}` : id;
    return game ? `https://medal.tv/games/${game}/clip/${clip}` : `https://medal.tv/clip/${clip}`;
  }

  return null;
}
