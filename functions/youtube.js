export async function onRequest(context) {
  const API_KEY = context.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = context.env.YOUTUBE_CHANNEL_ID;
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type') || 'stats';

  if(type === 'live'){
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } else if(type === 'videos'){
    // Récupérer 25 vidéos uploadées (pas de lives)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&type=video&maxResults=25&key=${API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if(!searchData.items || searchData.items.length === 0){
      return new Response(JSON.stringify(searchData), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Récupérer contentDetails pour filtrer Shorts et rediffs live
    const ids = searchData.items.map(i => i.id.videoId).filter(Boolean).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids}&key=${API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    // Parser durée ISO 8601 → secondes
    const parseDuration = (iso) => {
      if(!iso) return 0;
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if(!match) return 0;
      return (parseInt(match[1]||0)*3600) + (parseInt(match[2]||0)*60) + parseInt(match[3]||0);
    };

    const detailsMap = {};
    if(detailsData.items){
      detailsData.items.forEach(v => {
        detailsMap[v.id] = {
          duration: parseDuration(v.contentDetails?.duration),
          // liveBroadcastContent = 'none' = vidéo normale, 'completed' = rediff live
          liveContent: v.snippet?.liveBroadcastContent || 'none'
        };
      });
    }

    // Garder uniquement les vidéos longues uploadées (pas Shorts, pas rediffs live)
    const longVideos = searchData.items.filter(item => {
      const detail = detailsMap[item.id.videoId];
      if(!detail) return false;
      const isShort = detail.duration <= 60;
      const isLiveReplay = detail.liveContent === 'completed' || detail.liveContent === 'live';
      return !isShort && !isLiveReplay;
    });

    return new Response(JSON.stringify({ ...searchData, items: longVideos }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' }
    });

  } else if(type === 'videostats'){
    const ids = url.searchParams.get('ids');
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${API_KEY}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } else {
    const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,status&id=${CHANNEL_ID}&key=${API_KEY}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' }
    });
  }
}
