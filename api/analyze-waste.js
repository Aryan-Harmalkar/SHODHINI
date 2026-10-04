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

const PROMPT = `You are a specialized municipal waste management AI auditor.
Inspect this live camera photograph taken by a citizen for a municipal sanitation department.

Analyze the image carefully and output the following assessment:
1. isWaste: (boolean)
   - MUST be FALSE if the subject is a living animal (dog, cat, cow, bird, pet), a human/person, or a clean environment with no trash.
   - MUST be TRUE if the subject contains garbage, litter, dumped plastics, overflowing bins, construction debris, hazardous chemical waste, OR a deceased animal carcass.
2. classification: (string) Specific name of what is detected (e.g., "Roadside Plastic & Packaging Litter", "Dead Animal / Animal Carcass", "Living Domestic Animal (Not Waste)", "Person Detected (Not Waste)", "Overflowing Public Waste Bin", "Construction Demolition Rubble").
3. category: (string) Must be exactly one of: ["Roadside waste", "Overflowing bin", "Dead animal", "Construction debris", "Other", "Not Waste"].
4. confidence: (number between 0 and 100) Your certainty percentage that this is actual garbage or waste requiring sanitation pickup. (For living animals or humans, this MUST be < 20, e.g. 5).
5. contaminationRating: (string) One of: ["None", "Low", "Medium", "High (Hazardous)", "Biohazard"]. (Deceased animals MUST be "Biohazard").
6. hazardWarning: (string or null) Specific safety or biohazard warning for municipal workers (e.g. sharp glass, biohazard decay, chemical fumes).
7. suggestedTools: (array of strings) 3-5 tools required by the garbage collector (e.g. ["Heavy Duty Gloves", "Biohazard Sacks", "Lime Powder Disinfectant", "Sanitary Shovel"]).
8. predictedCleanTimeMinutes: (number) Estimated minutes for a sanitation worker to clean the site (e.g. 15, 25, 45).
9. predictedCleanTimeFormatted: (string) Formatted time string (e.g. "~20 mins", "~35 mins").
10. rejectionReason: (string or null) If isWaste is false, clear explanation of why this photo is rejected as non-waste.
11. summary: (string) Short 1-2 sentence description of the waste and site conditions.

Return strictly a valid JSON object matching this schema.`;

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
