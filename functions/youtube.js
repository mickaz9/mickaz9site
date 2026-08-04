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
    // Playlist des uploads = 'UU' + channelId sans son préfixe 'UC'.
    // playlistItems.list est instantané (pas de délai d'indexation comme search.list)
    // et coûte 1 unité de quota au lieu de 100.
    const uploadsPlaylistId = 'UU' + CHANNEL_ID.slice(2);
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=25&key=${API_KEY}`;
    const playlistRes = await fetch(playlistUrl);
    const playlistData = await playlistRes.json();
    if(!playlistData.items || playlistData.items.length === 0){
      return new Response(JSON.stringify({ longVideos: [], shorts: [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    // Normalisée à la même forme que l'ancienne réponse search.list ({ id: { videoId }, snippet })
    // pour ne rien changer côté frontend.
    const items = playlistData.items
      .filter(i => i.snippet?.resourceId?.videoId)
      .map(i => ({
        id: { videoId: i.snippet.resourceId.videoId },
        snippet: {
          title: i.snippet.title,
          publishedAt: i.snippet.publishedAt,
          thumbnails: i.snippet.thumbnails
        }
      }));
    const ids = items.map(i => i.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();
    const parseDuration = (iso) => {
      if(!iso) return 0;
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if(!match) return 0;
      return (parseInt(match[1]||0)*3600) + (parseInt(match[2]||0)*60) + parseInt(match[3]||0);
    };
    const durationMap = {};
    if(detailsData.items){
      detailsData.items.forEach(v => {
        durationMap[v.id] = parseDuration(v.contentDetails?.duration);
      });
    }
    // Shorts <= 180s (limite YouTube depuis fin 2024, plus 60s), rediffs live > 3600s (1h) → vidéos longues entre 180s et 3600s
    const SHORT_MAX = 180;
    const longVideos = items.filter(item => {
      const dur = durationMap[item.id.videoId] || 0;
      return dur > SHORT_MAX && dur <= 3600;
    });
    const shorts = items.filter(item => {
      const dur = durationMap[item.id.videoId] || 0;
      return dur > 0 && dur <= SHORT_MAX;
    });
    return new Response(JSON.stringify({ longVideos, shorts }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' }
    });
  } else if(type === 'videostats'){
    const ids = url.searchParams.get('ids');
    // snippet ajouté pour récupérer le titre et la date de publication
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`;
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
