export async function onRequest(context) {
  const API_KEY = context.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = context.env.YOUTUBE_CHANNEL_ID;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
