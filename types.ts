// Represents a single ingredient
export interface Ingredient {
  name: string;
  amount: string;
}

// Represents a full recipe
export interface Recipe {
  responseType: 'recipe';
  dishName: string;
  ingredients: Ingredient[];
  instructions: string[];
  calories: string;
}

// Represents a single dish suggestion
export interface DishSuggestion {
    dishName: string;
    description: string;
}

// Represents a list of suggestions based on ingredients
export interface IngredientSuggestion {
    responseType: 'ingredientSuggestion';
    heading: string;
    suggestions: DishSuggestion[];
}

// Represents a simple text greeting
export interface Greeting {
    responseType: 'greeting';
    text: string;
}

// Represents a clarification or informational response
export interface Clarification {
    responseType: 'clarification';
    text: string;
}

// Represents an error response
export interface RecipeError {
    responseType: 'error';
    error: string;
}

// A union of all possible valid responses from the Gemini API
export type GeminiResponse = Recipe | IngredientSuggestion | Greeting | Clarification | RecipeError;

// Represents a single message in the chat history
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text?: string; // Text can be optional for image-only user messages
  image?: string; // base64 string
  content?: GeminiResponse; // The structured content from the model
  isLoading?: boolean;
}
