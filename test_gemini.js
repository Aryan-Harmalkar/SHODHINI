import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const PROMPT = `You are a municipal waste verification AI.
Inspect the TWO images provided.
The FIRST image is the 'Before' photo taken by a citizen showing a waste spot.
The SECOND image is the 'After' photo taken by the garbage collector claiming to have cleaned it.

Analyze the images carefully and output the following assessment:
1. isSameLocation: (boolean) Are these photos taken in the exact same location/environment? (Check for matching background, landmarks, ground texture, etc.)
2. isCleaned: (boolean) Is the waste/garbage visible in the first photo completely removed in the second photo?
3. rejectionReason: (string or null) If either isSameLocation or isCleaned is false, provide a clear explanation.

Return strictly a valid JSON object matching this schema.`;

  // Create a 1x1 black pixel base64 for dummy image
  const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: dummyBase64 } },
              { inline_data: { mime_type: 'image/jpeg', data: dummyBase64 } },
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

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

run();
