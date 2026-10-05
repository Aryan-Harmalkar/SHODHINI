/**
 * api/verify-cleanup.js
 * Vercel Serverless API Route
 *
 * Verifies if the garbage collector has cleaned the exact place shown in the citizen's photo.
 */

const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'gemini-3.7-flash',
];

const PROMPT = `You are a municipal waste verification AI.
Inspect the TWO images provided.
The FIRST image is the 'Before' photo taken by a citizen showing a waste spot.
The SECOND image is the 'After' photo taken by the garbage collector claiming to have cleaned it.

Analyze the images carefully and output the following assessment:
1. isSameLocation: (boolean) Are these photos taken in the exact same physical environment? (Check for matching background, landmarks, ground texture). If they are clearly random or unrelated dummy photos, return false.
2. isCleaned: (boolean) Did the first photo contain actual waste/garbage, AND is that specific waste completely gone in the second photo? (IMPORTANT: If the first photo had NO waste to begin with, this MUST be false).
3. rejectionReason: (string or null) If either isSameLocation or isCleaned is false, provide a clear explanation.

Return strictly a valid JSON object matching this schema.`;

export default async function handler(req, res) {
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

  const { beforeBase64, afterBase64 } = body || {};
  if (!beforeBase64 || !afterBase64) {
    return res.status(400).json({ error: 'Missing beforeBase64 or afterBase64 image data.' });
  }

  const cleanBefore = beforeBase64.replace(/^data:image\/\w+;base64,/, '');
  const cleanAfter = afterBase64.replace(/^data:image\/\w+;base64,/, '');

  let lastError = null;

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
                      data: cleanBefore,
                    },
                  },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: cleanAfter,
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
    error: lastError ? lastError.message : 'All Gemini models failed to process the images.',
  });
}
