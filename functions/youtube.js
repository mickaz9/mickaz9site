export async function onRequest(context) {
  const API_KEY = context.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = context.env.YOUTUBE_CHANNEL_ID;
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type') || 'stats';

  let apiUrl;

  if(type === 'live'){
    // Détection live via search - 100 unités
    apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;
  } else if(type === 'videos'){
    // Vidéos récentes - 100 unités
    apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&type=video&maxResults=10&key=${API_KEY}`;
  } else if(type === 'videostats'){
    // Stats vidéos - 1 unité
    const ids = url.searchParams.get('ids');
    apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${API_KEY}`;
  } else {
    // Stats + snippet channel (abonnés + détection live) - 3 unités seulement !
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,status&id=${CHANNEL_ID}&key=${API_KEY}`;
  }

  const res = await fetch(apiUrl);
  const data = await res.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60' // Cache 1 min côté Cloudflare
    }
  });
}
