import { GoogleGenAI } from "@google/genai";

// This is a Vercel Edge Function
export const config = {
  runtime: 'edge',
};

// Securely access the API key from server environment variables
const API_KEY = process.env.API_KEY;

const systemInstruction = `You are a data processing API, not a conversational AI. Your SOLE task is to convert user requests into a single, raw, perfectly-formed JSON object. Your persona is an expert chef in Burmese cuisine named BurmaFoodie AI. **CRITICAL RULES:** 1. **JSON ONLY:** Your entire response MUST be a single, valid JSON object. Do NOT include any introductory text, explanations, or markdown fences. 2. **LANGUAGE DETECTION:** You MUST detect the language of the user's request (e.g., Burmese or English). All JSON *values* MUST be in the detected language. 3. **ENGLISH KEYS:** All JSON *keys* MUST ALWAYS remain in English. 4. **ESCAPE CHARACTERS:** You MUST escape any double quotes in text values with a backslash (\\"). **JSON SCHEMA:** If a valid recipe is found, use this schema: { "dishName": "Name in user's language", "ingredients": [ { "name": "Ingredient in user's language", "amount": "Quantity in user's language" } ], "instructions": [ "Step 1 in user's language.", "Step 2 in user's language." ], "calories": "Estimated calorie count as a string" }. If not a valid Burmese dish, use this error schema: { "error": "I couldn't identify that as a Burmese dish. Please provide a clearer name or photo in the user's language." }`;

function base64ToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // **CRITICAL FIX**: Check if the API key is actually available.
  // This is the root cause of the error you're seeing.
  if (!API_KEY) {
    console.error("Server Configuration Error: API_KEY is not set in the environment variables.");
    return new Response(JSON.stringify({ error: "The server is not configured correctly. Please contact the administrator." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, imageBase64 } = await request.json();

    // The GoogleGenAI constructor requires the API Key.
    const genAI = new GoogleGenAI(API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: {
        parts: [{ text: systemInstruction }],
        role: "model"
      }
    });

    const parts: any[] = [{ text: prompt }];

    if (imageBase64) {
      const mimeTypeMatch = imageBase64.match(/^data:(.+);base64,/);
      if (!mimeTypeMatch) {
          return new Response(JSON.stringify({ error: "Invalid image format. Could not determine MIME type." }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
          });
      }
      const mimeType = mimeTypeMatch[1];
      const base64Data = imageBase64.split(',')[1];
      parts.unshift(base64ToGenerativePart(base64Data, mimeType));
    }
    
    const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
        },
    });

    const response = result.response;
    const responseText = response.text();
    
    // The response is already configured to be JSON
    const parsedData = JSON.parse(responseText);
    
    return new Response(JSON.stringify(parsedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    const error = e instanceof Error ? e : new Error('An unknown error occurred');
    console.error("Vercel Function Runtime Error:", error);
    return new Response(JSON.stringify({ error: `Sorry, the server encountered an error: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
