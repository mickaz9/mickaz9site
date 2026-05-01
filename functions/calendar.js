export async function onRequest(context) {
  const API_KEY = context.env.GOOGLE_API_KEY;
  const CAL_ID = context.env.GOOGLE_CALENDAR_ID;
  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL_ID)}/events?key=${API_KEY}&timeMin=${now}&maxResults=3&singleEvents=true&orderBy=startTime`;
  const res = await fetch(url);
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
