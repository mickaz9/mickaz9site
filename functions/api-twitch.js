export async function onRequest(context) {
  const CLIENT_ID = context.env.TWITCH_CLIENT_ID;
  const CLIENT_SECRET = context.env.TWITCH_CLIENT_SECRET;
  
  const authRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
  const authData = await authRes.json();
  
  const twitchRes = await fetch('https://api.twitch.tv/helix/streams?user_login=mickaz9', {
    headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${authData.access_token}` }
  });
  const data = await twitchRes.json();
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
