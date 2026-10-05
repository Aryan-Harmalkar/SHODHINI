/**
 * api/verify-cleanup.js
 * Vercel Serverless API Route
 *
 * Verifies if the garbage collector has cleaned the reported waste spot.
 * Optimized for lightning-fast latency (<2s) with Gemini Flash Lite models.
 */

const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
];

const DUAL_IMAGE_PROMPT = `You are a municipal waste cleanup verification AI.
Inspect the TWO images provided:
- Image 1: 'Before' photo taken by a citizen showing the reported waste.
- Image 2: 'After' photo taken on-site by a garbage collector claiming to have cleaned it.

EVALUATION CRITERIA:
1. Location Check (isSameLocation):
   - Garbage collectors take the after photo after sweeping, often closer to the ground, zoomed in, or from a different perspective.
   - Return TRUE if the photo plausibly represents the same general spot, ground, road, or outdoor area.
   - Return FALSE ONLY if the after photo is an obvious spoof or completely unrelated (e.g. indoor selfie, ceiling, screenshot, vehicle interior).

2. Cleanup Check (isCleaned):
   - Return TRUE if the area in the After photo is clean, swept, free of open waste piles, or shows that waste has been collected.
   - Return FALSE ONLY if the dirty waste pile is still clearly untouched, uncleaned, and abandoned.

3. rejectionReason:
   - Provide a concise explanation if either check fails, or null if successfully verified.

Return strictly a valid JSON object matching:
{"isSameLocation": boolean, "isCleaned": boolean, "rejectionReason": string | null}`;

const SINGLE_IMAGE_PROMPT = `You are a municipal waste cleanup verification AI.
Inspect this 'After' cleanup photo taken on-site by a garbage collector.

EVALUATION CRITERIA:
1. isSameLocation: true (unless the image is a selfie, screenshot, or completely unrelated indoor photo).
2. isCleaned: true if this shows an outdoor ground or municipal area that is clean and clear of open waste piles; false if it still contains a heavy garbage pile.
3. rejectionReason: concise string if failed, or null if verified.

Return strictly a valid JSON object matching:
{"isSameLocation": boolean, "isCleaned": boolean, "rejectionReason": string | null}`;

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
  if (!afterBase64) {
    return res.status(400).json({ error: 'Missing afterBase64 image data.' });
  }

  const cleanAfter = String(afterBase64).replace(/^data:image\/\w+;base64,/, '');
  const cleanBefore = beforeBase64 ? String(beforeBase64).replace(/^data:image\/\w+;base64,/, '') : null;

  const parts = [];
  if (cleanBefore) {
    parts.push({ text: DUAL_IMAGE_PROMPT });
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: cleanBefore,
      },
    });
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: cleanAfter,
      },
    });
  } else {
    parts.push({ text: SINGLE_IMAGE_PROMPT });
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: cleanAfter,
      },
    });
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7500);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} returned ${response.status}: ${errText}`);
        lastError = new Error(`Model ${model} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        lastError = new Error(`Model ${model} returned empty content.`);
        continue;
      }

      let cleaned = rawJson.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      const parsed = JSON.parse(cleaned);
      return res.status(200).json(parsed);
    } catch (err) {
      console.warn(`Model ${model} error:`, err?.message || err);
      lastError = err;
    }
  }

  return res.status(502).json({
    error: lastError ? lastError.message : 'All Gemini models failed to process the images.',
  });
}
