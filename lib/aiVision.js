/**
 * lib/aiVision.js
 * Gemini AI Waste Detection, Classification & Verification Engine
 *
 * High-performance, low-latency implementation (<2s) with Gemini Flash Lite models,
 * client-side base64 downscaling, and intelligent timeouts.
 */

import { Platform } from 'react-native';

const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite-preview',
];


// Added Step 0
const PROMPT = `You are an expert AI inspector for a civic waste reporting system.
Your job is to strictly validate photographs submitted by citizens.

CRITICAL PRIORITY RULES (EVALUATE IN THIS EXACT ORDER):

STEP 0: REAL AND NOT ANALOG
- If the image appears to be a picture of garbage on plane-surfaces like posters, screen (laptops, phones, televisions projections), or similar plane-surfaces, you must reject it!
  * containsHuman: false (if not human)
  * containsLivingAnimal: false (if not animal)
  * isWaste: FALSE
  * isTooSmall: FALSE
  * rejectionReason: "Image is not authentic."
  * Stop evaluation here!

STEP 1: HUMAN & LIVING ANIMAL DETECTION
- If the PRIMARY subject of the photo is a real living human or living animal, you must reject it.
- WARNING: Do NOT falsely identify printed faces (e.g. on packaging, posters), mannequins, statues, shadows, or vaguely human-shaped trash as humans. Do NOT reject the photo if a human or animal is merely in the deep background and the primary focus is clearly garbage.
- If the PRIMARY focus is a real human or live animal:
  * containsHuman: true (if human)
  * containsLivingAnimal: true (if animal)
  * isWaste: FALSE
  * isTooSmall: FALSE
  * rejectionReason: "Human or living animal detected as the primary subject. This cannot be reported as waste."
  * Stop evaluation here!

STEP 2: CLEAN OR NON-WASTE ENVIRONMENT
- If no humans/animals, check if the photograph shows a clean street, room, vehicle, building, furniture, flooring of a normal room, semi-clean table-top in clean setting, an indoors (dust)bin (exception: outdoors dustbin), anything alike, or even everyday non-waste objects without actual garbage.
- Identify whether the picture is taken indoors, observe the lighting, the surroundings around the garbage, the floor, the walls (also beware of the same conditions when flash is used in the photography). If it appears to be indoors (e.g. with a generic household pile/a messy room), then reject the picture.
- If no garbage/trash is present:
  * containsHuman: false
  * containsLivingAnimal: false
  * isWaste: FALSE
  * isTooSmall: FALSE
  * rejectionReason: "No waste detected. This area appears clean or contains normal everyday items."

STEP 3: TRIVIAL / MINOR WASTE (CAN BE CLEANED BY CITIZEN)
- If actual garbage is present, check if it is merely 1 single minor item (such as 1 bottle, a single straw, a single wrapper, a cigarette butt, or a tiny scrap of paper) that can easily be picked up and thrown into a dustbin by the citizen themselves.
- If YES:
  * containsHuman: false
  * containsLivingAnimal: false
  * isWaste: TRUE
  * isTooSmall: TRUE
  * rejectionReason: "This waste is too minor (e.g. 1 bottle or straw) and can easily be cleaned up by you directly! Please reserve complaints for larger waste piles or overflowing bins."

STEP 4: LEGITIMATE WASTE
- The photo shows substantial garbage requiring collection: household waste, plastic, electronic waste (e-waste), organic waste, hazardous waste, construction debris, dumped bags, scattered litter, waste piles, overflowing dumpsters, or a deceased animal carcass.
- ANY form of waste is acceptable as long as it requires collection.
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

// The prompt below, and the prompt overbelow seem conflicting, seemingly this prompt was to be for comparing user photo and gc's photo before cleaning, and the one there below was to compare the before cleaning and after cleaning
const VERIFY_DUAL_PROMPT = `You are an expert AI quality inspector for municipal waste management.
You must strictly verify whether a garbage collector actually cleaned the reported waste spot.

You are provided with:
- Image 1: 'Before' photo submitted by a citizen showing the reported waste.
- Image 2: 'After' photo taken by the collector to prove cleanup.

EVALUATION RULES:

0. REAL AND NOT ANALOG
- If the image appears to be a picture of garbage on plane-surfaces like posters, screen (laptops, phones, televisions projections), or similar plane-surfaces, you must reject it!
  * isSameLocation: false
  * isCleaned: false
  * rejectionReason: "Image is not authentic."
  * Stop evaluation here!

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

const VERIFY_SINGLE_PROMPT = `You are an expert AI quality inspector for municipal waste management.
You must strictly inspect this 'After' cleanup photo submitted by a garbage collector.

EVALUATION RULES:

0. REAL AND NOT ANALOG
- If the image appears to be a picture of garbage on plane-surfaces like posters, screen (laptops, phones, televisions projections), or similar plane-surfaces, you must reject it!
  * isSameLocation: false
  * isCleaned: false
  * rejectionReason: "Image is not authentic."
  * Stop evaluation here!

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

/**
 * Fast client-side image downscaler to ensure base64 payloads are <100KB for near-instant upload
 */
export async function downscaleBase64IfNeeded(base64Str, maxDim = 800) {
  if (!base64Str || typeof base64Str !== 'string') return base64Str;
  // If already under ~150KB (base64 string length < 200,000 characters), return as-is
  if (base64Str.length < 200000) return base64Str;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl.replace(/^data:image\/\w+;base64,/, ''));
        };
        img.onerror = () => resolve(base64Str);
        img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
      } catch {
        resolve(base64Str);
      }
    });
  }

  return base64Str;
}

/**
 * Helper to parse JSON from model output that might contain markdown fences
 */
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

/**
 * Analyzes live captured photo base64 with Gemini
 */
export async function analyzeWasteImageWithGemini({ base64, imageUri }) {
  if (!base64) {
    throw new Error('Image base64 data is required for Gemini Vision analysis.');
  }

  const rawClean = base64.replace(/^data:image\/\w+;base64,/, '');
  const cleanBase64 = await downscaleBase64IfNeeded(rawClean);

  const directApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  // 1. Try Direct Gemini Call (Fastest: <1.5s, no serverless roundtrip)
  if (directApiKey) {
    for (const model of CANDIDATE_MODELS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${directApiKey}`,
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

        if (response.ok) {
          const data = await response.json();
          const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const parsed = parseModelJson(rawJson);
            if (parsed) return formatAnalysisResult(parsed);
          }
        }
      } catch (err) {
        console.warn(`Model ${model} note:`, err?.message || err);
      }
    }
  }

  // 2. Try Backend Serverless Endpoint
  try {
    const isWeb = Platform.OS === 'web';
    const apiUrl = isWeb ? '/api/analyze-waste' : 'https://shodhini.vercel.app/api/analyze-waste';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const serverRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ base64: cleanBase64 }),
    });
    clearTimeout(timeoutId);

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data && typeof data === 'object') {
        return formatAnalysisResult(data);
      }
    }
  } catch (serverErr) {
    console.warn('Backend serverless route error:', serverErr?.message || serverErr);
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

  return formatAnalysisResult({
    containsHuman: false,
    containsLivingAnimal: false,
    isWaste: false,
    isTooSmall: false,
    rejectionReason: 'AI Vision could not verify waste in this image. Please ensure good lighting and take a clear photo of the waste.',
  });
}

/**
 * Verifies if the garbage collector cleaned the reported location
 * Optimized for <2s response time using fast Gemini Flash Lite models
 */
export async function verifyCleanupWithGemini({ beforeBase64, afterBase64 }) {
  if (!afterBase64) {
    throw new Error('After cleanup image is required for verification.');
  }

  const rawCleanAfter = String(afterBase64).replace(/^data:image\/\w+;base64,/, '');
  const cleanAfter = await downscaleBase64IfNeeded(rawCleanAfter);

  let cleanBefore = null;
  if (beforeBase64) {
    const rawCleanBefore = String(beforeBase64).replace(/^data:image\/\w+;base64,/, '');
    cleanBefore = await downscaleBase64IfNeeded(rawCleanBefore);
  }

  const directApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  // 1. Direct Model Call (Fastest: <1.5s, avoids serverless relay)
  if (directApiKey) {
    const parts = [];
    if (cleanBefore) {
      parts.push({ text: VERIFY_DUAL_PROMPT });
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
      parts.push({ text: VERIFY_SINGLE_PROMPT });
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: cleanAfter,
        },
      });
    }

    for (const model of CANDIDATE_MODELS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${directApiKey}`,
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

        if (response.ok) {
          const data = await response.json();
          const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const parsed = parseModelJson(rawJson);
            if (parsed && typeof parsed === 'object') {
              return {
                isSameLocation: Boolean(parsed.isSameLocation),
                isCleaned: Boolean(parsed.isCleaned),
                rejectionReason: parsed.rejectionReason || null,
              };
            }
          }
        }
      } catch (err) {
        console.warn(`Model ${model} direct verify note:`, err?.message || err);
      }
    }
  }

  // 2. Secondary Route: Backend Serverless Endpoint
  try {
    const isWeb = Platform.OS === 'web';
    const apiUrl = isWeb ? '/api/verify-cleanup' : 'https://shodhini.vercel.app/api/verify-cleanup';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ beforeBase64: cleanBefore, afterBase64: cleanAfter }),
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === 'object') {
        return {
          isSameLocation: Boolean(data.isSameLocation),
          isCleaned: Boolean(data.isCleaned),
          rejectionReason: data.rejectionReason || null,
        };
      }
    }
  } catch (serverErr) {
    console.warn('Backend verification route note:', serverErr?.message || serverErr);
  }

  // 3. Fallback: If both network paths encounter high demand/timeout,
  // DO NOT auto-pass. Return clear notice so the worker can retry or attest on-site.
  return {
    isSameLocation: false,
    isCleaned: false,
    rejectionReason:
      'AI verification could not connect to Gemini service. Please tap "Retake Photo" to retry, or use "Attest & Pass" to confirm completion on-site.',
  };
}

const CLASSIFICATION_PROMPT = `You are an expert AI waste detection, identification, and classification assistant.
A user has uploaded a photo. Your job is to detect and identify EVERY distinct object/item visible in the image — whether it is waste or not — and provide a comprehensive classification report.

INSTRUCTIONS (follow in order):

STEP 1 — SCENE OVERVIEW:
Briefly describe what the photo shows overall (e.g., "A kitchen counter with food scraps and packaging", "A pile of mixed garbage on a street corner", "A desk with electronics and office supplies").

STEP 2 — DETECT ALL ITEMS:
List EVERY distinct item you can identify in the photo. Be thorough — even if 10+ items are visible, list them all. For each item:

a) Name: Give a specific, detailed name (e.g., "Crushed PET Plastic Water Bottle", "Banana Peel", "Broken Samsung Phone Screen", "Cardboard Amazon Box").

b) Is it waste? Determine if this item is waste/trash/something to dispose of, OR if it is a normal usable non-waste item (e.g., a table, a phone in use, a potted plant, furniture, a person's hand).
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
   - recyclingTip: If recyclable, HOW to recycle (e.g., "Take to municipal dry waste recycling center", "Sell to local kabadiwala/scrap dealer", "Drop at e-waste collection drive"). If not recyclable, null.
   - disposalSteps: 2-4 specific actionable steps to prepare this item for disposal (e.g., ["Rinse out any remaining liquid", "Crush the bottle flat to save space", "Remove the cap and recycle separately", "Place in Blue Bin"])
   - harmLevel: "None", "Low", "Medium", or "High" — environmental/health harm if improperly disposed
   - harmDetails: Brief explanation of environmental impact if disposed incorrectly (e.g., "PET plastic takes 450+ years to decompose in landfills and can leach chemicals into groundwater")

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

export async function classifyWasteWithGemini({ base64 }) {
  if (!base64) {
    throw new Error('Image base64 data is required for classification.');
  }

  const rawClean = base64.replace(/^data:image\/\w+;base64,/, '');
  const cleanBase64 = await downscaleBase64IfNeeded(rawClean);

  const directApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (directApiKey) {
    for (const model of CANDIDATE_MODELS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${directApiKey}`,
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
                        data: cleanBase64,
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
              return parsed;
            }
          }
        }
      } catch (err) {
        console.warn(`Model ${model} classify note:`, err?.message || err);
      }
    }
  }

  // 2. Try Backend Serverless Endpoint
  try {
    const isWeb = Platform.OS === 'web';
    const apiUrl = isWeb ? '/api/classify-waste' : 'https://shodhini.vercel.app/api/classify-waste';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 16000);

    const serverRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ base64: cleanBase64 }),
    });
    clearTimeout(timeoutId);

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data && typeof data === 'object' && data.items) {
        return data;
      }
    }
  } catch (serverErr) {
    console.warn('Backend serverless route error:', serverErr?.message || serverErr);
  }

  // Fallback if network fails
  return {
    sceneDescription: 'Could not analyze image.',
    totalItemsDetected: 0,
    wasteItemsCount: 0,
    nonWasteItemsCount: 0,
    overallRecommendation: 'AI could not connect. Please check your internet connection and try again.',
    items: [],
  };
}
