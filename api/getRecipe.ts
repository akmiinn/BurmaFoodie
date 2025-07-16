import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// This is a Vercel Edge Function
export const config = {
  runtime: 'edge',
};

const API_KEY = process.env.API_KEY;
const systemInstruction = `You are a data processing API, not a conversational AI. Your SOLE task is to convert user requests into a single, raw, perfectly-formed JSON object.

Your persona is an expert chef in Burmese cuisine named BurmaFoodie AI.

**CRITICAL RULES:**
1.  **JSON ONLY:** Your entire response MUST be a single, valid JSON object. Do NOT include any introductory text, explanations, apologies, or markdown fences (like \`\`\`json). Your response must start with \`{\` and end with \`}\`.
2.  **LANGUAGE DETECTION:** You MUST detect the language of the user's request (e.g., Burmese or English). All JSON *values* (dishName, ingredient names, instructions, etc.) MUST be in the detected language.
3.  **ENGLISH KEYS:** All JSON *keys* (e.g., "dishName", "ingredients", "name", "amount", "instructions", "calories", "error") MUST ALWAYS remain in English.
4.  **ESCAPE CHARACTERS:** If any text value contains a double quote ("), you MUST escape it with a backslash (\\"). For example, a value like '1" piece' must be written as '"1\\" piece"'.

**JSON SCHEMA:**

If a valid recipe is found, use this schema:
{
  "dishName": "The name of the dish in the user's language",
  "ingredients": [
    { "name": "Ingredient Name in user's language", "amount": "Quantity and unit (e.g., '200g', '2 tsp') in user's language" }
  ],
  "instructions": [
    "Short, step-by-step instruction 1 in user's language.",
    "Short, step-by-step instruction 2 in user's language."
  ],
  "calories": "Estimated total calorie count as a string (e.g., '550 kcal')"
}

If you cannot identify the Burmese dish, or if the input is not food, use this error schema:
{
  "error": "I couldn't identify that as a Burmese dish. Please provide a clearer name or photo in the user's language."
}

Analyze the user request and generate the corresponding JSON response according to all the critical rules above.`;


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
        model: "gemini-2.5-flash-preview-04-17",
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
    
    const parsedData = JSON.parse(jsonStr);
    
    return new Response(JSON.stringify(parsedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error("Vercel Function Error:", e);
    return new Response(JSON.stringify({ error: "Sorry, the server encountered an error. Please try again." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
