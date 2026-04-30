export async function onRequest(context) {
  const API_KEY = context.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = context.env.YOUTUBE_CHANNEL_ID;
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type') || 'stats';
 
  let apiUrl;
  if(type === 'live'){
    apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;
  } else if(type === 'videos'){
    apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&type=video&maxResults=10&key=${API_KEY}`;
  } else if(type === 'stats'){
    const ids = url.searchParams.get('ids');
    if(ids){
      apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${API_KEY}`;
    } else {
      apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${API_KEY}`;
    }
  }
 
  const res = await fetch(apiUrl);
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
 
