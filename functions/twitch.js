export async function onRequest(context) {
  const CLIENT_ID = context.env.TWITCH_CLIENT_ID;
  const CLIENT_SECRET = context.env.TWITCH_CLIENT_SECRET;

  const authRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
  const authData = await authRes.json();
  const token = authData.access_token;
  const headers = { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${token}` };

  const streamRes = await fetch('https://api.twitch.tv/helix/streams?user_login=mickaz9', { headers });
  const streamData = await streamRes.json();

  const userRes = await fetch('https://api.twitch.tv/helix/users?login=mickaz9', { headers });
  const userData = await userRes.json();
  const userId = userData.data?.[0]?.id;

  let followers = null;
  if (userId) {
    const folRes = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}`, { headers });
    const folData = await folRes.json();
    followers = folData.total ?? null;
  }

  // 3 derniers clips par date — Twitch ne garantit pas un tri par date sur cet
  // endpoint (souvent par vues), donc on pagine plusieurs pages, on regroupe,
  // et on trie nous-mêmes par date décroissante avant de garder les 3 plus récents.
  let lastClips = [];
  if (userId) {
    let allClips = [];
    let cursor = null;
    for (let page = 0; page < 5; page++) {
      let clipsUrl = `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=100`;
      if (cursor) clipsUrl += `&after=${cursor}`;
      const clipRes = await fetch(clipsUrl, { headers });
      const clipData = await clipRes.json();
      if (clipData.data && clipData.data.length > 0) allClips.push(...clipData.data);
      cursor = clipData.pagination?.cursor;
      if (!cursor || !clipData.data || clipData.data.length === 0) break;
    }

    allClips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    lastClips = allClips.slice(0, 3).map(c => ({
      id: c.id,
      title: c.title,
      url: c.url,
      thumbnail: c.thumbnail_url,
      views: c.view_count,
      duration: c.duration,
      created_at: c.created_at
    }));
  }

  return new Response(JSON.stringify({
    data: streamData.data || [],
    followers: followers,
    lastClip: lastClips[0] || null,
    lastClips: lastClips
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
