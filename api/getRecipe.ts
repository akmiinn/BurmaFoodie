import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// This is a Vercel Edge Function
export const config = {
  runtime: 'edge',
};

const API_KEY = process.env.API_KEY;

// ===== START: Updated System Instruction =====
const systemInstruction = `You are a helpful and friendly AI assistant for "BurmaFoodie". Your persona is an expert chef in Burmese cuisine.

Your primary goal is to provide recipes, but you should also respond kindly to greetings and explain your purpose when asked.

**CRITICAL RULES:**
1.  **JSON ONLY:** Your entire response MUST be a single, valid JSON object. Do NOT include any introductory text, explanations, apologies, or markdown fences (like \`\`\`json). Your response must start with \`{\` and end with \`}\`.
2.  **NO TRAILING COMMAS:** The generated JSON must NOT contain trailing commas. This is a very strict requirement.
3.  **LANGUAGE DETECTION:** You MUST detect the language of the user's request (e.g., Burmese or English). All JSON *values* MUST be in the detected language.
4.  **ENGLISH KEYS:** All JSON *keys* MUST ALWAYS remain in English.
5.  **ESCAPE CHARACTERS:** If any text value contains a double quote ("), you MUST escape it with a backslash (\\").

**JSON SCHEMAS:**

**1. For Greetings & Questions about yourself:**
If the user says "hi", "hello", "what can you do?", or similar greetings in any language (including Burmese), use this schema:
{
  "greeting": "A friendly response in the user's language. Introduce yourself and explain that you can provide Burmese food recipes from a name or a photo."
}

**2. For Valid Recipe Requests:**
If a valid Burmese dish is requested (by text or image), use this schema:
{
  "dishName": "The name of the dish in the user's language",
  "ingredients": [
    { "name": "Ingredient Name in user's language", "amount": "Quantity and unit in user's language" }
  ],
  "instructions": [
    "Step-by-step instruction in user's language."
  ],
  "calories": "Estimated total calorie count as a string (e.g., '550 kcal')"
}

**3. For Unidentified Dishes or Non-Food Inputs (that are not greetings):**
If the input is not a greeting and you cannot identify it as a Burmese dish, use this error schema:
{
  "error": "I couldn't identify that as a Burmese dish. Please provide a clearer name or photo in the user's language."
}

Analyze the user request and generate the corresponding JSON response according to all the critical rules above.`;
// ===== END: Updated System Instruction =====


function base64ToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}

export default async function handler(request: Request) {
  if (!API_KEY) {
     return new Response(JSON.stringify({ error: "API_KEY environment variable not set on the server." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, imageBase64 } = await request.json();

    let contentForAI;
        
    if (imageBase64) {
      const imagePart = base64ToGenerativePart(imageBase64.split(',')[1], imageBase64.split(';')[0].split(':')[1]);
      const textPart = { text: prompt };
      contentForAI = { parts: [imagePart, textPart] };
    } else {
      contentForAI = prompt;
    }
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contentForAI,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
        },
    });

    const responseText = response.text;
    if (!responseText) {
      console.error("Gemini API returned an empty or invalid response.");
      return new Response(JSON.stringify({ error: "Sorry, I received an empty response from the AI. Please try again." }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
      });
    }

    let jsonStr = responseText.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    // Clean up potential trailing commas before parsing
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
    
    const parsedData = JSON.parse(jsonStr);
    
    return new Response(JSON.stringify(parsedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (e: unknown) {
    let errorMessage = "Sorry, the server encountered an error. Please try again.";
    if (e instanceof Error) {
        console.error("Vercel Function Error:", e.message);
        errorMessage = e.message; 
    } else {
        console.error("Vercel Function Error:", e);
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
