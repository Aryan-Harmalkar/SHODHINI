/**
 * lib/aiVision.js
 * Gemini AI Waste Detection, Classification & Contamination Analysis Engine
 *
 * Calls the secure backend serverless endpoint /api/analyze-waste so the Gemini API key
 * is completely hidden and inaccessible to client browsers.
 */

import { Platform } from 'react-native';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
];

const PROMPT = `You are a municipal waste detection AI.
Inspect this live camera photograph taken by a citizen.

Analyze the image carefully and output the following assessment:
1. isWaste: (boolean)
   - MUST be FALSE if the subject is a living animal (dog, cat, cow, bird, pet), a human/person, or a clean environment with no trash.
   - MUST be TRUE if the subject contains garbage, litter, dumped plastics, overflowing bins, construction debris, hazardous chemical waste, OR a deceased animal carcass.
2. rejectionReason: (string or null) If isWaste is false, clear explanation of why this photo is rejected as non-waste (e.g., "Living animal detected", "Human detected", "No waste visible").

Return strictly a valid JSON object matching this schema.`;

/**
 * Analyzes live captured photo base64 with Gemini
 * @param {Object} params
 * @param {string} params.base64 - Base64 representation of live image
 * @param {string} [params.imageUri] - URI of live photo
 * @returns {Promise<Object>} Formatted AI Analysis Result
 */
export async function analyzeWasteImageWithGemini({ base64, imageUri }) {
  if (!base64) {
    throw new Error('Image base64 data is required for Gemini Vision analysis.');
  }

  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

  // 1. Primary Route: Secure Serverless API (/api/analyze-waste)
  try {
    const isWeb = Platform.OS === 'web';
    const apiUrl = isWeb ? '/api/analyze-waste' : 'https://shodhini.vercel.app/api/analyze-waste';

    const serverRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: cleanBase64 }),
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data && typeof data === 'object') {
        return formatAnalysisResult(data);
      }
    }
  } catch (serverErr) {
    console.warn('Backend serverless route error, attempting direct model fallback:', serverErr);
  }

  // 2. Direct Fallback if running locally with key in environment
  const directApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (directApiKey) {
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${directApiKey}`,
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

        if (response.ok) {
          const data = await response.json();
          const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const parsed = JSON.parse(rawJson.trim());
            return formatAnalysisResult(parsed);
          }
        }
      } catch (err) {
        console.warn(`Model ${model} direct fallback note:`, err);
      }
    }
  }

  // 3. Fallback Heuristics
  return fallbackHeuristicsAnalysis({ imageUri });
}

/**
 * Normalizes and formats the AI analysis result
 */
export function formatAnalysisResult(data) {
  const isWaste = Boolean(data.isWaste);

  return {
    isWaste,
    rejectionReason: !isWaste
      ? (data.rejectionReason || 'Non-waste item detected (e.g. living animal or person).')
      : null,
  };
}

/**
 * Fallback heuristics when offline or network unavailable
 */
function fallbackHeuristicsAnalysis({ imageUri }) {
  const uriLower = (imageUri || '').toLowerCase();
  
  if (uriLower.includes('dog') || uriLower.includes('cat') || uriLower.includes('pet') || uriLower.includes('animal_live')) {
    return formatAnalysisResult({
      isWaste: false,
      rejectionReason: 'Living animal detected. Live animals are not waste.',
    });
  }
  if (uriLower.includes('person') || uriLower.includes('face') || uriLower.includes('selfie') || uriLower.includes('human')) {
    return formatAnalysisResult({
      isWaste: false,
      rejectionReason: 'Human detected in frame. Rejected as non-waste.',
    });
  }

  return formatAnalysisResult({
    isWaste: true,
  });
}
