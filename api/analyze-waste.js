/**
 * api/analyze-waste.js
 * Vercel Serverless API Route
 *
 * Keeps GEMINI_API_KEY 100% server-side and completely inaccessible to clients/browsers.
 */

const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
];

const PROMPT = `You are an expert AI inspector for a municipal civic waste reporting system.
Your job is to strictly validate photographs submitted by citizens.

CRITICAL PRIORITY RULES (EVALUATE IN THIS EXACT ORDER):

STEP 1: HUMAN & LIVING ANIMAL DETECTION (HIGHEST PRIORITY - ABSOLUTE OVERRIDE)
- Carefully inspect the image for ANY human person, human face, selfie, child, adult, body, skin, hand, silhouette, or person in the foreground or background.
- Carefully inspect for ANY living animal (dog, cat, bird, pet, cow, livestock, wildlife).
- If ANY human person or living animal is detected:
  * containsHuman: true (if human/person present)
  * containsLivingAnimal: true (if live animal present)
  * isWaste: MUST BE FALSE (no exceptions! Even if they are holding trash or trash is nearby).
  * isTooSmall: MUST BE FALSE.
  * rejectionReason: "Human detected in photograph. Humans and living beings are strictly prohibited from being reported as waste." (or "Living animal detected in photograph. Live animals are not waste.")
  * Stop evaluation here!

STEP 2: CLEAN OR NON-WASTE ENVIRONMENT
- If no humans/animals, check if the photograph shows a clean street, room, vehicle, building, furniture, or everyday non-waste objects without actual garbage.
- If no garbage/trash is present:
  * containsHuman: false
  * containsLivingAnimal: false
  * isWaste: FALSE
  * isTooSmall: FALSE
  * rejectionReason: "No municipal waste detected. This area appears clean or contains normal everyday items."

STEP 3: TRIVIAL / MINOR WASTE (CAN BE CLEANED BY CITIZEN)
- If actual garbage is present, check if it is merely 1 single minor item (such as 1 bottle, a single straw, a single wrapper, a cigarette butt, or a tiny scrap of paper) that can easily be picked up and thrown into a dustbin by the citizen themselves.
- If YES:
  * containsHuman: false
  * containsLivingAnimal: false
  * isWaste: TRUE
  * isTooSmall: TRUE
  * rejectionReason: "This waste is too minor (e.g. 1 bottle or straw) and can easily be cleaned up by you directly! Please reserve municipal complaints for larger waste piles or overflowing bins."

STEP 4: LEGITIMATE MUNICIPAL WASTE
- The photo shows substantial garbage requiring municipal collection: waste piles, overflowing dumpsters, dumped bags, scattered litter, construction debris, hazardous waste, or deceased animal carcass.
- If YES:
  * containsHuman: false
  * containsLivingAnimal: false
  * isWaste: TRUE
  * isTooSmall: FALSE
  * rejectionReason: null

Return strictly a valid JSON object matching this schema:
{
  "containsHuman": boolean,
  "containsLivingAnimal": boolean,
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7500);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
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
      clearTimeout(timeoutId);

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

      let cleaned = rawJson.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      const parsed = JSON.parse(cleaned.trim());

      // STRICT CODE GUARDS: Ensure human/animal detections NEVER get marked as waste
      if (parsed.containsHuman === true) {
        parsed.isWaste = false;
        parsed.isTooSmall = false;
        parsed.rejectionReason =
          parsed.rejectionReason || 'Human detected in photograph. Humans and living beings cannot be reported as waste.';
      } else if (parsed.containsLivingAnimal === true) {
        parsed.isWaste = false;
        parsed.isTooSmall = false;
        parsed.rejectionReason =
          parsed.rejectionReason || 'Living animal detected in photograph. Live animals are not waste.';
      }

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
