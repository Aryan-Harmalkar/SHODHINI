export const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite-preview',
];

const CLASSIFICATION_PROMPT = `You are an expert civic waste management and recycling assistant.
A user has uploaded a photo of some waste or an item they want to throw away, recycle, or dispose of.
Your job is to thoroughly analyze the photo and provide exact, actionable disposal instructions.

EVALUATION RULES:
1. Identify the primary item(s) visible in the photo.
2. Determine the core material (e.g., Plastic type, Glass, Cardboard, E-Waste, Organic matter).
3. Assign it to one of the standard municipal dustbin colors:
   - "Blue" (Dry Waste: Plastic, Paper, Metal, Glass)
   - "Green" (Wet/Organic Waste: Food scraps, plant matter)
   - "Red" (Hazardous/Sanitary Waste: Batteries, medical waste, diapers, chemicals)
   - "Black" or "Grey" (E-Waste or General/Mixed Waste)
4. Determine if it is recyclable. (e.g., Clean plastics, glass, metals, and cardboard are recyclable. Food-soiled paper or complex mixed materials are usually not).
5. Provide detailed instructions on how to prepare the item (e.g., "Rinse out the milk residue", "Crush the bottle and cap it", "Remove tape from the box").

Return strictly a valid JSON object matching this schema:
{
  "item": string, // Detailed name of the item (e.g., "PET Plastic Water Bottle")
  "category": string, // General category (e.g., "Dry Waste - Plastic", "Organic - Food Waste")
  "dustbinColor": string, // The specific dustbin color and type (e.g., "Blue Bin (Dry Waste)")
  "instructions": string, // 1-2 sentences of specific disposal preparation instructions
  "isRecyclable": boolean,
  "recyclingDetails": string | null // If recyclable, how/where to recycle. If not, null.
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
              temperature: 0.1,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = parseModelJson(rawJson);
          if (parsed) return res.status(200).json(parsed);
        }
      }
    } catch (err) {
      console.warn(`Model ${model} backend classify error:`, err?.message || err);
    }
  }

  return res.status(502).json({
    item: 'Unknown Item',
    category: 'Unknown',
    dustbinColor: 'Mixed Waste',
    instructions: 'Could not classify. Please sort according to local guidelines.',
    isRecyclable: false,
    recyclingDetails: null
  });
}
