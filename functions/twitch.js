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

  // 3 derniers clips par date. L'endpoint clips sans bornes de date ne garantit
  // aucun ordre stable (pas forcément la date), donc paginer "à l'aveugle" peut
  // rater les clips récents si le broadcaster en a beaucoup au total. On borne
  // donc par fenêtres de 30 jours (comme Twitch le recommande), mais en paginant
  // CHAQUE fenêtre en entier (pas juste la 1ère page) pour ne rien manquer,
  // et on continue sur les fenêtres précédentes tant qu'on n'a pas assez de clips.
  let allClips = [];
  if (userId) {
    const now = new Date();
    for (let i = 0; i < 6 && allClips.length < 10; i++) {
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() - i);
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);

      let cursor = null;
      for (let page = 0; page < 3; page++) {
        let clipsUrl = `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=100&started_at=${startDate.toISOString()}&ended_at=${endDate.toISOString()}`;
        if (cursor) clipsUrl += `&after=${cursor}`;
        const clipRes = await fetch(clipsUrl, { headers });
        const clipData = await clipRes.json();
        if (clipData.data && clipData.data.length > 0) allClips.push(...clipData.data);
        cursor = clipData.pagination?.cursor;
        if (!cursor || !clipData.data || clipData.data.length === 0) break;
      }
    }
  }

  allClips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const lastClips = allClips.slice(0, 3).map(c => ({
    id: c.id,
    title: c.title,
    url: c.url,
    thumbnail: c.thumbnail_url,
    views: c.view_count,
    duration: c.duration,
    created_at: c.created_at
  }));

  return new Response(JSON.stringify({
    data: streamData.data || [],
    followers: followers,
    lastClip: lastClips[0] || null,
    lastClips: lastClips
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
