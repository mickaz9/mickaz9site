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

  // Dernier clip par date — on pagine pour trouver le plus récent
  let lastClip = null;
  if (userId) {
    // On cherche sur les 2 dernières années en plusieurs fenêtres de temps
    const now = new Date();
    let found = null;
    
    // Chercher par tranche de 30 jours en remontant, jusqu'à 6 mois
    for (let i = 0; i < 6 && !found; i++) {
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() - i);
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);
      
      const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=20&started_at=${startDate.toISOString()}&ended_at=${endDate.toISOString()}`;
      const clipRes = await fetch(url, { headers });
      const clipData = await clipRes.json();
      
      if (clipData.data && clipData.data.length > 0) {
        // Trier par date décroissante et prendre le plus récent
        const sorted = clipData.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        found = sorted[0];
      }
    }
    
    if (found) {
      lastClip = {
        id: found.id,
        title: found.title,
        url: found.url,
        thumbnail: found.thumbnail_url,
        views: found.view_count,
        duration: found.duration,
        created_at: found.created_at
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
