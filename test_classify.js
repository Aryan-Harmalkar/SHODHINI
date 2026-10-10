import * as fs from 'fs';

const CLASSIFICATION_PROMPT = `You are an expert waste management assistant.
A user has uploaded a photo of some waste or an item they want to throw away or recycle.
Analyze the photo and provide the following information strictly as a JSON object:
1. "item": A short name for the main item(s) in the photo.
2. "category": The general category (e.g., "Plastic", "Organic", "E-Waste", "Hazardous", "Paper", "Metal", "Glass").
3. "dustbinColor": The color of the dustbin this should go into (e.g., "Blue for Dry Waste", "Green for Wet Waste", "Red for Hazardous", "Black for E-waste").
4. "instructions": Short instruction on how to dispose of it properly (e.g., "Rinse the bottle before throwing it in the blue bin.").
5. "isRecyclable": boolean (true/false).
6. "recyclingDetails": If recyclable, short details on where/how to recycle it (e.g., "Take to local scrap dealer or drop in municipal recycling bin."). If not, return null.

Return strictly a valid JSON object matching this schema:
{
  "item": string,
  "category": string,
  "dustbinColor": string,
  "instructions": string,
  "isRecyclable": boolean,
  "recyclingDetails": string | null
}`;

async function testGemini() {
  const directApiKey = process.env.GEMINI_API_KEY;
  if (!directApiKey) {
    console.log("No API key");
    return;
  }
  console.log("Using API key:", directApiKey);

  // create a dummy 1x1 base64 image
  const cleanBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  
  for (const model of ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite-preview']) {
    try {
      console.log("Trying model:", model);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${directApiKey}`,
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
      
      const text = await response.text();
      console.log("Response text:", text);
      if (response.ok) {
         console.log("Success with", model);
         break;
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }
}
testGemini();
