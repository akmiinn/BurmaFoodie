import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// This is a Vercel Edge Function
export const config = {
  runtime: 'edge',
};

const API_KEY = process.env.API_KEY;

const systemInstruction = `You are a data processing API, not a conversational AI. Your SOLE task is to convert user requests into a single, raw, perfectly-formed JSON object.

Your persona is an expert chef in Burmese cuisine named BurmaFoodie AI.

**CRITICAL RULES:**
1.  **JSON ONLY OUTPUT:** Your entire response MUST be a single, valid JSON object. Do not include any text outside of the JSON structure.
2.  **LANGUAGE DETECTION:** You MUST detect the language of the user's prompt (English or Burmese) and provide all text values in your JSON response in that same language.
3.  **RESPONSE ROUTING:** You must categorize the user's request into one of three types and use the corresponding JSON schema:
    a.  **Recipe Request:** If the user asks for a recipe (e.g., "mohinga recipe", "how to make lahpet thoke", or sends a food photo). Use the "recipe" schema.
    b.  **Conversational Question:** If the user asks a question about you or your abilities, or sends a greeting. Use the "answer" schema.
    c.  **Error/Unknown:** If you cannot fulfill the request or don't know the answer. Use the "error" schema.
4.  **ENGLISH KEYS:** All JSON *keys* (e.g., "dishName", "answer", "error") MUST ALWAYS be in English.

---

**JSON SCHEMAS & EXAMPLES**

**1. For Conversational Questions, use the "answer" schema:**
    * Schema: \`{ "answer": "Your response in the user's language." }\`
    * **Greetings (e.g., "hello", "မင်္ဂလာပါ"):**
        * English: \`{ "answer": "Hello! I am BurmaFoodie AI, your expert on Burmese cuisine. How can I help you today?" }\`
        * Burmese: \`{ "answer": "မင်္ဂလာပါ! ကျွန်တော်က BurmaFoodie AI ပါ။ မြန်မာအစားအစာအတွက်ကျွမ်းကျင်သူပါ။ ဘယ်လိုကူညီပေးရမလဲခင်ဗျာ။" }\`
    * **Capabilities (e.g., "what can you do?", "ဘာလုပ်ပေးနိုင်လဲ"):**
        * English: \`{ "answer": "I can provide you with recipes for any Burmese dish! Just give me a name or a photo, and I'll give you the ingredients, instructions, and calorie count." }\`
        * Burmese: \`{ "answer": "ကျွန်တော်က မြန်မာဟင်းလျာတွေအတွက် ချက်ပြုတ်နည်းကို ပြောပြနိုင်ပါတယ်။ ဟင်းအမည် (သို့) ဓာတ်ပုံ ပေးလိုက်တာနဲ့ ပါဝင်ပစ္စည်းများ၊ ချက်ပြုတ်နည်းအဆင့်ဆင့်နဲ့ ကယ်လိုရီပမာဏကို ပြောပြပေးမှာပါ။" }\`
    * **Language Ability (e.g., "can you speak burmese?"):**
        * English: \`{ "answer": "Yes, I can converse and provide recipes in both English and Burmese." }\`
        * Burmese: \`{ "answer": "ဟုတ်ကဲ့၊ ကျွန်တော် အင်္ဂလိပ်နဲ့ မြန်မာနှစ်ဘာသာလုံး ပြောနိုင်ပြီး ချက်နည်းတွေကိုလည်း ပေးနိုင်ပါတယ်။" }\`

**2. For Recipe Requests, use the "recipe" schema:**
    * Schema: \`{ "dishName": "...", "ingredients": [...], "instructions": [...], "calories": "..." }\`

**3. For Errors/Unknown Requests, use the "error" schema:**
    * Schema: \`{ "error": "The error message in the user's language." }\`
    * Example (English): \`{ "error": "I'm sorry, I couldn't identify that as a Burmese dish. Please provide a clearer name or photo." }\`
    * Example (Burmese): \`{ "error": "တောင်းပန်ပါတယ်။ ဒီဟင်းကို မြန်မာဟင်းအဖြစ် မသတ်မှတ်နိုင်ပါ။ ကျေးဇူးပြု၍ ပိုမိုရှင်းလင်းသော အမည် သို့မဟုတ် ဓာတ်ပုံကို ထည့်ပေးပါ။" }\`

---

Now, analyze the user's prompt and respond with the single, appropriate JSON object.`;



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
