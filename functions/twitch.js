export async function onRequest(context) {
  const CLIENT_ID = context.env.TWITCH_CLIENT_ID;
  const CLIENT_SECRET = context.env.TWITCH_CLIENT_SECRET;

  const authRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
  const authData = await authRes.json();
  const token = authData.access_token;
  const headers = { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${token}` };

  // Live stream
  const streamRes = await fetch('https://api.twitch.tv/helix/streams?user_login=mickaz9', { headers });
  const streamData = await streamRes.json();

  // User ID
  const userRes = await fetch('https://api.twitch.tv/helix/users?login=mickaz9', { headers });
  const userData = await userRes.json();
  const userId = userData.data?.[0]?.id;

  // Followers
  let followers = null;
  if (userId) {
    const folRes = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}`, { headers });
    const folData = await folRes.json();
    followers = folData.total ?? null;
  }

  // Dernier clip en date (started_at desc = du plus récent au plus ancien)
  let lastClip = null;
  if (userId) {
    const clipRes = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=1&sort=newest`, { headers });
    const clipData = await clipRes.json();
    if (clipData.data && clipData.data.length > 0) {
      const c = clipData.data[0];
      lastClip = {
        id: c.id,
        title: c.title,
        url: c.url,
        thumbnail: c.thumbnail_url,
        views: c.view_count,
        duration: c.duration,
        created_at: c.created_at
      };
    }
  }

  return new Response(JSON.stringify({
    data: streamData.data || [],
    followers: followers,
    lastClip: lastClip
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
