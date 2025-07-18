export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  dishName: string;
  ingredients: Ingredient[];
  instructions: string[];
  calories: string;
}

export interface RecipeError {
    error: string;
}

// --- ADD THIS ---
export interface Greeting {
    greeting: string;
}

// --- AND MODIFY THIS LINE ---
export type GeminiResponse = Recipe | RecipeError | Greeting;

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 string
  recipe?: Recipe;
  error?: string;
  isLoading?: boolean;
}
