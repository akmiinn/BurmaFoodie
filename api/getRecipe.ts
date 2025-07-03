import { GoogleGenerativeAI } from "@google/genai";

// This is a Vercel Edge Function
export const config = {
  runtime: 'edge',
};

// Your API Key should be set as an environment variable in Vercel
const API_KEY = process.env.API_KEY;

// The system instruction defines the AI's persona and strict output rules.
// This remains unchanged as it is the core of your application's logic.
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

/**
 * Converts a Base64 string to a GenerativePart object for the AI model.
 */
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
  
  if (!API_KEY) {
     return new Response(JSON.stringify({ error: "API_KEY environment variable not set on the server." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    // 1. Initialize the Google AI client with the API Key
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // 2. Get the generative model, passing the system instruction during initialization
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest", // Using "latest" is often more stable than preview versions
      systemInstruction: systemInstruction,
    });

    // 3. Parse the incoming request body
    const { prompt, imageBase64 } = await request.json();

    // 4. Construct the parts of the prompt for the AI
    const promptParts = [];
    if (imageBase64) {
      // Safely extract base64 data and mimeType
      const [meta, data] = imageBase64.split(',');
      const mimeType = meta.split(';')[0].split(':')[1];
      const imagePart = base64ToGenerativePart(data, mimeType);
      promptParts.push(imagePart);
    }
    // Always include the text prompt, even if it's empty
    promptParts.push({ text: prompt || "" });

    // 5. Call the AI model to generate content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: promptParts }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // 6. Access the response text correctly
    const response = result.response;
    const responseText = response.text();
    
    if (!responseText) {
      console.error("Gemini API returned an empty or invalid response.");
      return new Response(JSON.stringify({ error: "Sorry, I received an empty response from the AI. Please try again." }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7. Clean up the response to ensure it's valid JSON
    // (This part is good practice and remains unchanged)
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

  } catch (e: any) {
    console.error("Vercel Function Error:", e);
    const errorMessage = e.message || "Sorry, the server encountered an error. Please try again.";
    return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
