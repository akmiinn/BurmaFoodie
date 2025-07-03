import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// This is a Vercel Edge Function
export const config = {
  runtime: 'edge',
};

const API_KEY = process.env.API_KEY;

// --- UPDATED SYSTEM INSTRUCTION ---
// This new prompt gives the AI more capabilities beyond just finding a single recipe.
// It now understands greetings, questions about itself, and requests for suggestions based on ingredients.
const systemInstruction = `You are a helpful and friendly AI assistant with the persona of an expert chef in Burmese cuisine named "BurmaFoodie AI". Your primary goal is to help users discover and cook Burmese food.

You MUST analyze the user's intent and respond with a single, perfectly-formed JSON object. Your entire response must start with '{' and end with '}'.

**CRITICAL RULES:**
1.  **JSON ONLY:** Your entire response MUST be a single, valid JSON object. Do not include any non-JSON text or markdown.
2.  **LANGUAGE DETECTION:** You MUST detect the language of the user's request (e.g., Burmese or English). All JSON *values* MUST be in the detected language.
3.  **ENGLISH KEYS:** All JSON *keys* MUST ALWAYS remain in English.

---

**JSON RESPONSE SCHEMAS:**

**1. If the user asks for a specific recipe (by name or photo):**
Use the "recipe" schema.
{
  "responseType": "recipe",
  "dishName": "The name of the dish in the user's language",
  "ingredients": [
    { "name": "Ingredient Name", "amount": "Quantity and unit" }
  ],
  "instructions": [
    "Step-by-step instruction 1.",
    "Step-by-step instruction 2."
  ],
  "calories": "Estimated total calorie count as a string (e.g., '550 kcal')"
}

**2. If the user provides a list of ingredients and asks for suggestions:**
Use the "ingredientSuggestion" schema. Suggest 1-3 Burmese dishes.
{
  "responseType": "ingredientSuggestion",
  "heading": "Based on your ingredients, you could make:",
  "suggestions": [
    { "dishName": "Suggested Dish 1", "description": "A brief, enticing description of why this dish is a good fit." },
    { "dishName": "Suggested Dish 2", "description": "A brief, enticing description." }
  ]
}

**3. If the user greets you (e.g., "hello", "hi", "mingalaba"):**
Use the "greeting" schema.
{
  "responseType": "greeting",
  "text": "A warm, friendly greeting in the user's language. Introduce yourself as BurmaFoodie AI."
}

**4. If the user asks about you or your capabilities (e.g., "what can you do?", "who are you?"):**
Use the "clarification" schema.
{
  "responseType": "clarification",
  "text": "A helpful explanation of your purpose: you can provide Burmese recipes from a dish name or photo, or suggest dishes based on ingredients."
}

**5. If the input is not a Burmese dish, not food-related, or unidentifiable:**
Use the "error" schema.
{
  "responseType": "error",
  "error": "I couldn't identify that as a Burmese dish or ingredient list. Please provide a clearer name, photo, or list of ingredients."
}
---
Analyze the user's request and generate the single, appropriate JSON response.`;


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
      const textPart = { text: prompt || "Analyze the attached image and provide the recipe for the Burmese dish shown. Respond in English unless the image contains Burmese text." };
      contentForAI = { parts: [imagePart, textPart] };
    } else {
      contentForAI = { parts: [{ text: prompt }] };
    }
    
    const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: {
          role: "model",
          parts: [{ text: systemInstruction }]
        },
    });

    const result = await model.generateContent(contentForAI);
    const response = result.response;
    const responseText = response.text();

    if (!responseText) {
      console.error("Gemini API returned an empty or invalid response.");
      return new Response(JSON.stringify({ responseType: "error", error: "Sorry, I received an empty response from the AI. Please try again." }), {
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
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ responseType: "error", error: `Sorry, the server encountered an error: ${errorMessage}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
