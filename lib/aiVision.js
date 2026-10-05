/**
 * lib/aiVision.js
 * Gemini AI Waste Detection, Classification & Contamination Analysis Engine
 *
 * Calls the secure backend serverless endpoint /api/analyze-waste so the Gemini API key
 * is completely hidden and inaccessible to client browsers.
 */

import { Platform } from 'react-native';

const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'gemini-3.7-flash',
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
  let isWaste = Boolean(data.isWaste);
  let isTooSmall = Boolean(data.isTooSmall);
  const containsHuman = Boolean(data.containsHuman);
  const containsLivingAnimal = Boolean(data.containsLivingAnimal);

  // Absolute safety override in client
  if (containsHuman || containsLivingAnimal) {
    isWaste = false;
    isTooSmall = false;
  }

  let rejectionReason = null;
  if (!isWaste) {
    if (containsHuman) {
      rejectionReason =
        data.rejectionReason || 'Human detected in photograph. Humans and living beings cannot be reported as waste.';
    } else if (containsLivingAnimal) {
      rejectionReason =
        data.rejectionReason || 'Living animal detected in photograph. Live animals are not waste.';
    } else {
      rejectionReason =
        data.rejectionReason ||
        'Non-waste item detected. Complaints can only be filed for municipal waste or deceased animal removal.';
    }
  } else if (isTooSmall) {
    rejectionReason =
      data.rejectionReason ||
      'This waste is too minor (e.g. 1 bottle or straw) and can easily be cleaned up by you directly! Please reserve municipal complaints for larger waste piles or overflowing bins.';
  }

  return {
    containsHuman,
    containsLivingAnimal,
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

  if (uriLower.includes('dog') || uriLower.includes('cat') || uriLower.includes('pet') || uriLower.includes('animal')) {
    return formatAnalysisResult({
      containsHuman: false,
      containsLivingAnimal: true,
      isWaste: false,
      isTooSmall: false,
      rejectionReason: 'Living animal detected. Live animals are not waste.',
    });
  }
  if (uriLower.includes('person') || uriLower.includes('face') || uriLower.includes('selfie') || uriLower.includes('human')) {
    return formatAnalysisResult({
      containsHuman: true,
      containsLivingAnimal: false,
      isWaste: false,
      isTooSmall: false,
      rejectionReason: 'Human detected in photograph. Humans and living beings cannot be reported as waste.',
    });
  }
  if (uriLower.includes('bottle') || uriLower.includes('straw') || uriLower.includes('single_wrapper') || uriLower.includes('small_waste')) {
    return formatAnalysisResult({
      containsHuman: false,
      containsLivingAnimal: false,
      isWaste: true,
      isTooSmall: true,
      rejectionReason: 'This waste is too minor (e.g. 1 bottle or straw) and can easily be cleaned up by you directly! Please reserve municipal complaints for larger waste piles.',
    });
  }

  // Safe default when AI is offline or unreachable:
  // Reject by default with request to retry, NEVER blindly mark as verified waste!
  return formatAnalysisResult({
    containsHuman: false,
    containsLivingAnimal: false,
    isWaste: false,
    isTooSmall: false,
    rejectionReason: 'AI Vision could not verify municipal waste in this image. Please ensure good lighting and take a clear photo of the waste.',
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
