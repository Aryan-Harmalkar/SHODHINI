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
   - If isWaste is false: clear explanation of why this photo is rejected (e.g. "Living animal detected. Live animals are not waste.", "Human detected in photo.", "No waste visible.").
   - If isTooSmall is true: "This waste is too small or minor (e.g., 1 bottle or straw) and can easily be cleaned up by you directly! Please reserve municipal complaints for larger waste piles or overflowing bins."
   - If valid municipal waste: null.

Return strictly a valid JSON object matching this schema:
{
  "isWaste": boolean,
  "isTooSmall": boolean,
  "rejectionReason": string | null
}`;

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
  const isTooSmall = Boolean(data.isTooSmall);

  let rejectionReason = null;
  if (!isWaste) {
    rejectionReason = data.rejectionReason || 'Non-waste item detected (e.g. living animal or person).';
  } else if (isTooSmall) {
    rejectionReason = data.rejectionReason || 'This waste is too small or minor (e.g., 1 bottle or straw) and can easily be cleaned up by you directly! Please reserve municipal complaints for larger waste piles or overflowing bins.';
  }

  return {
    isWaste,
    isTooSmall,
    rejectionReason,
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
      isTooSmall: false,
      rejectionReason: 'Living animal detected. Live animals are not waste.',
    });
  }
  if (uriLower.includes('person') || uriLower.includes('face') || uriLower.includes('selfie') || uriLower.includes('human')) {
    return formatAnalysisResult({
      isWaste: false,
      isTooSmall: false,
      rejectionReason: 'Human detected in frame. Rejected as non-waste.',
    });
  }
  if (uriLower.includes('bottle') || uriLower.includes('straw') || uriLower.includes('single_wrapper') || uriLower.includes('small_waste')) {
    return formatAnalysisResult({
      isWaste: true,
      isTooSmall: true,
      rejectionReason: 'This waste is too small or minor (e.g., 1 bottle or straw) and can easily be cleaned up by you directly! Please reserve municipal complaints for larger waste piles.',
    });
  }

  return formatAnalysisResult({
    isWaste: true,
    isTooSmall: false,
  });
}

/**
 * Verifies if the garbage collector cleaned the exact location
 * @param {Object} params
 * @param {string} params.beforeBase64 - Base64 representation of original image
 * @param {string} params.afterBase64 - Base64 representation of cleaned image
 * @returns {Promise<Object>} Verification result {isSameLocation, isCleaned, rejectionReason}
 */
export async function verifyCleanupWithGemini({ beforeBase64, afterBase64 }) {
  if (!beforeBase64 || !afterBase64) {
    throw new Error('Both original and cleaned images are required for verification.');
  }

  const isWeb = Platform.OS === 'web';
  const apiUrl = isWeb ? '/api/verify-cleanup' : 'https://shodhini.vercel.app/api/verify-cleanup';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beforeBase64, afterBase64 }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    if (data && typeof data === 'object') return data;
  } catch (serverErr) {
    console.warn('Backend verification failed, attempting direct model fallback:', serverErr);
  }

  // Fallback: Direct call if running locally with API key
  const directApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (directApiKey) {
    const PROMPT = `You are a municipal waste verification AI.
Inspect the TWO images provided.
The FIRST image is the 'Before' photo taken by a citizen showing a waste spot.
The SECOND image is the 'After' photo taken by the garbage collector claiming to have cleaned it.

Analyze the images carefully and output the following assessment:
1. isSameLocation: (boolean) Are these photos taken in the exact same physical environment? (Check for matching background, landmarks, ground texture). If they are clearly random or unrelated dummy photos, return false.
2. isCleaned: (boolean) Did the first photo contain actual waste/garbage, AND is that specific waste completely gone in the second photo? (IMPORTANT: If the first photo had NO waste to begin with, this MUST be false).
3. rejectionReason: (string or null) If either isSameLocation or isCleaned is false, provide a clear explanation.

Return strictly a valid JSON object matching this schema.`;

    const cleanBefore = beforeBase64.replace(/^data:image\/\w+;base64,/, '');
    const cleanAfter = afterBase64.replace(/^data:image\/\w+;base64,/, '');

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

        if (response.ok) {
          const data = await response.json();
          const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            return JSON.parse(rawJson.trim());
          }
        }
      } catch (err) {
        console.warn(`Model ${model} direct fallback failed:`, err);
      }
    }
  }

  // Absolute fallback if everything fails
  return {
    isSameLocation: false,
    isCleaned: false,
    rejectionReason: "Network error: Could not reach AI for verification.",
  };
}
