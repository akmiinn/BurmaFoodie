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

export interface Answer {
    answer: string;
}

export type GeminiResponse = Recipe | RecipeError | Answer;

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 string
  recipe?: Recipe;
  error?: string;
  answer?: string;
  isLoading?: boolean;
}
