export const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite-preview',
];

const CLASSIFICATION_PROMPT = `You are an expert AI waste detection, identification, and classification assistant.
A user has uploaded a photo. Your job is to detect and identify EVERY distinct object/item visible in the image — whether it is waste or not — and provide a comprehensive classification report.

INSTRUCTIONS (follow in order):

STEP 1 — SCENE OVERVIEW:
Briefly describe what the photo shows overall.

STEP 2 — DETECT ALL ITEMS:
List EVERY distinct item you can identify in the photo. Be thorough — even if 10+ items are visible, list them all. For each item:

a) Name: Give a specific, detailed name (e.g., "Crushed PET Plastic Water Bottle", "Banana Peel", "Broken Samsung Phone Screen", "Cardboard Amazon Box").

b) Is it waste? Determine if this item is waste/trash/something to dispose of, OR if it is a normal usable non-waste item.
   - If NOT waste: mark isWaste=false. Still identify what it is, but skip disposal details.
   - If IS waste: mark isWaste=true and continue classification.

c) For waste items, classify:
   - material: The core material (e.g., "PET Plastic (#1)", "Organic Matter", "Lithium-ion Battery", "Mixed Paper/Cardboard", "Aluminium", "Glass", "Polystyrene Foam", "Textile/Fabric", "Rubber")
   - wasteType: One of: "Dry Waste", "Wet/Organic Waste", "Hazardous Waste", "E-Waste", "Sanitary Waste", "Construction & Demolition", "Biomedical Waste"
   - dustbinColor: Which color-coded bin it goes into:
     • "🔵 Blue Bin" — Dry recyclables (clean plastic, paper, metal, glass)
     • "🟢 Green Bin" — Wet/organic waste (food scraps, garden waste, plant matter)
     • "🔴 Red Bin" — Hazardous & sanitary (batteries, chemicals, medical waste, diapers, sanitary pads)
     • "⚫ Black Bin" — E-waste & general non-recyclable (electronics, composite materials, soiled items)
   - isRecyclable: boolean
   - recyclingTip: If recyclable, HOW to recycle. If not recyclable, null.
   - disposalSteps: 2-4 specific actionable steps to prepare this item for disposal
   - harmLevel: "None", "Low", "Medium", or "High" — environmental/health harm if improperly disposed
   - harmDetails: Brief explanation of environmental impact if disposed incorrectly

STEP 3 — SUMMARY:
Provide counts: how many waste items vs non-waste items detected, and an overall recommendation.

Return strictly a valid JSON object matching this schema:
{
  "sceneDescription": string,
  "totalItemsDetected": number,
  "wasteItemsCount": number,
  "nonWasteItemsCount": number,
  "overallRecommendation": string,
  "items": [
    {
      "name": string,
      "isWaste": boolean,
      "material": string | null,
      "wasteType": string | null,
      "dustbinColor": string | null,
      "isRecyclable": boolean | null,
      "recyclingTip": string | null,
      "disposalSteps": string[] | null,
      "harmLevel": "None" | "Low" | "Medium" | "High" | null,
      "harmDetails": string | null
    }
  ]
}`;

function parseModelJson(raw) {
  if (!raw) return null;
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

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

  const base64 = body?.base64;
  if (!base64 || typeof base64 !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid base64 image data.' });
  }

  for (const model of CANDIDATE_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
                  { text: CLASSIFICATION_PROMPT },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.15,
            },
          }),
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = parseModelJson(rawJson);
          if (parsed && parsed.items && Array.isArray(parsed.items)) {
            return res.status(200).json(parsed);
          }
        }
      }
    } catch (err) {
      console.warn(`Model ${model} backend classify error:`, err?.message || err);
    }
  }

  return res.status(502).json({
    sceneDescription: 'Could not analyze image.',
    totalItemsDetected: 0,
    wasteItemsCount: 0,
    nonWasteItemsCount: 0,
    overallRecommendation: 'AI service unavailable. Please try again later.',
    items: [],
  });
}
