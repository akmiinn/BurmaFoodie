import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// This is a Vercel Edge Function
export const config = {
  runtime: 'edge',
};

const API_KEY = process.env.API_KEY;

const systemInstruction = `You are an expert chef specializing in Burmese cuisine, named BurmaFoodie AI. Your goal is to provide clear, concise, and accurate recipes.

You MUST detect the language of the user's request (e.g., Burmese or English). Your ENTIRE response, including all text inside the JSON object, MUST be in the same language as the user's request. This includes dish names, ingredient names, instructions, and calorie counts.

However, the JSON *keys* (e.g., "dishName", "ingredients", "name", "amount", "instructions", "calories", "error") must ALWAYS remain in English for consistent parsing.

If the user provides an image and text, the text is the primary source of truth. Use it to clarify the request. If the text is in Burmese, the response MUST be in Burmese.

When a user asks for a recipe, you MUST respond ONLY with a single, valid JSON object. Do not add any introductory text, explanations, or markdown fences around the JSON.

The JSON object must strictly follow this format:
{
  "dishName": "The name of the dish in the user's language",
  "ingredients": [
    { "name": "Ingredient Name in user's language", "amount": "Quantity and unit (e.g., '200g', '2 tsp') in user's language" }
  ],
  "instructions": [
    "Short, step-by-step instruction 1 in user's language.",
    "Short, step-by-step instruction 2 in user's language.",
    "..."
  ],
  "calories": "Estimated total calorie count as a string (e.g., '550 kcal')"
}

If you cannot identify the Burmese dish from the user input (text or image), or if it is not a food item, respond with a JSON object in this error format, with the error message in the user's language:
{
  "error": "I couldn't identify that as a Burmese dish. Please provide a clearer name or photo."
}

Analyze the user request and generate the corresponding JSON response.`;


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
