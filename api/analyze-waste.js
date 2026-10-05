/**
 * api/analyze-waste.js
 * Vercel Serverless API Route
 *
 * Keeps GEMINI_API_KEY 100% server-side and completely inaccessible to clients/browsers.
 */

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
];

const PROMPT = `You are a municipal waste detection AI for a civic waste reporting app.
Inspect this live camera photograph taken by a citizen reporting waste in their area.

Analyze the image carefully and output the following assessment:
1. isWaste: (boolean)
   - MUST be FALSE if the subject is a living animal (dog, cat, cow, bird, pet), a human/person, or a clean environment with no trash.
   - MUST be TRUE if the subject contains garbage, litter, dumped plastics, overflowing bins, construction debris, hazardous chemical waste, OR a deceased animal carcass.
2. isTooSmall: (boolean)
   - MUST be TRUE if the waste visible in the photo is very minor, trivial, or a single small item (such as 1 bottle, a single straw, a single wrapper, a cigarette butt, a single disposable cup, or a tiny scrap of paper) that can easily be picked up and disposed of by the user/citizen themselves into a nearby dustbin, without needing a municipal waste truck or collection team.
   - MUST be FALSE if there is a substantial amount of garbage, multiple items, a pile, overflowing dumpsters, dumped bags, hazardous waste, deceased animals, or anything requiring municipal team cleanup.
3. rejectionReason: (string or null)
   - If isWaste is false: clear explanation of why this photo is rejected (e.g., "Living animal detected. Live animals are not waste.", "Human detected in photo.", "No waste visible.").
   - If isTooSmall is true: "This waste is too small or minor (e.g., 1 bottle or straw) and can easily be cleaned up by you directly! Please reserve municipal complaints for larger waste piles or overflowing bins."
   - If valid municipal waste: null.

Return strictly a valid JSON object matching this schema:
{
  "isWaste": boolean,
  "isTooSmall": boolean,
  "rejectionReason": string | null
}`;

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Server-only API key: completely inaccessible to client browsers
  const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured in server environment variables.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // ignore
    }
  }

  const { base64 } = body || {};
  if (!base64) {
    return res.status(400).json({ error: 'Missing image base64 data.' });
  }

  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

  let lastError = null;

  // Try active models in order of speed and stability
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: PROMPT },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} returned ${response.status}: ${errText}`);
        lastError = new Error(`Model ${model} returned ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        lastError = new Error(`Model ${model} returned empty content.`);
        continue;
      }

      const parsed = JSON.parse(rawJson.trim());
      return res.status(200).json(parsed);
    } catch (err) {
      console.warn(`Model ${model} error:`, err.message);
      lastError = err;
    }
  }

  return res.status(502).json({
    error: lastError ? lastError.message : 'All Gemini models failed to process the image.',
  });
}
