/**
 * api/verify-cleanup.js
 * Vercel Serverless API Route
 *
 * Verifies if the garbage collector has cleaned the reported waste spot.
 * Optimized for lightning-fast latency (<2s) with Gemini Flash Lite models.
 */

const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite-preview',
];

const DUAL_IMAGE_PROMPT = `You are an expert AI quality inspector for municipal waste management.
You must strictly verify whether a garbage collector actually cleaned the reported waste spot.

You are provided with:
- Image 1: 'Before' photo submitted by a citizen showing the reported waste.
- Image 2: 'After' photo taken by the collector to prove cleanup.

EVALUATION RULES:

1. SAME LOCATION (isSameLocation):
- Compare environmental features: road surface, pavement texture, curbs, walls, fences, vegetation, buildings, background structures, or ground markings.
- If Image 2 is taken at a completely different spot, indoors, inside a vehicle, a selfie, a wall, ceiling, desktop, or shows a mismatched environment:
  * isSameLocation: false
  * isCleaned: false
  * rejectionReason: "Location mismatch: The after photo does not match the scene or background of the reported waste location."
- If Image 2 clearly corresponds to the same site/ground area where the citizen reported waste:
  * isSameLocation: true

2. CLEANUP VERIFIED (isCleaned):
- Carefully inspect Image 2 for garbage.
- If Image 2 still contains trash, uncollected rubbish, open waste piles, discarded bags, debris, or scattered litter:
  * isCleaned: false
  * rejectionReason: "Uncleaned waste detected: Garbage or litter is still present in the after photo. The area must be thoroughly cleared."
- If Image 2 is not a photo of a cleaned outdoor municipal site (e.g. blank screen, person, hand, indoor floor, dark image):
  * isCleaned: false
  * rejectionReason: "Invalid cleanup photo: Please take a clear, well-lit photo of the cleared municipal site."
- If Image 2 shows that the waste seen in Image 1 has been swept, collected, and the area is clean:
  * isCleaned: true
  * rejectionReason: null

Return strictly a valid JSON object matching:
{"isSameLocation": boolean, "isCleaned": boolean, "rejectionReason": string | null}`;

const SINGLE_IMAGE_PROMPT = `You are an expert AI quality inspector for municipal waste management.
You must strictly inspect this 'After' cleanup photo submitted by a garbage collector.

EVALUATION RULES:

1. AUTHENTIC MUNICIPAL SITE (isSameLocation):
- Check if the photograph represents an authentic outdoor municipal site (e.g. road, street, sidewalk, public area, dumpster bay, roadside gutter).
- Return FALSE if the photo is an indoor room, desk, vehicle interior, selfie, human, screenshot, ceiling, dark image, or unrelated object.
- If FALSE:
  * isSameLocation: false
  * isCleaned: false
  * rejectionReason: "Invalid cleanup location: Photo must show an outdoor municipal site, street, or roadside area."

2. CLEANUP QUALITY (isCleaned):
- If the photo is an outdoor municipal site, inspect the ground for trash.
- If it still contains garbage, litter piles, uncollected trash bags, or waste:
  * isCleaned: false
  * rejectionReason: "Uncleaned waste detected: Garbage is still present at the site. Please thoroughly clean before photographing."
- If the outdoor site is clean, cleared of waste, and swept:
  * isSameLocation: true
  * isCleaned: true
  * rejectionReason: null

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
