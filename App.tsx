import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage as ChatMessageType, Recipe } from './types';
import { getRecipeForDish } from './services/geminiService';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import { LogoIcon } from './components/icons';

// Custom hook for managing chat history with localStorage
const useChatHistory = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessageType[]>(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      // We don't save images to local storage, so no need to parse them.
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to parse chat history from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    // Create a version of history for saving that excludes image data and loading states.
    const historyToSave = chatHistory
      .filter(msg => !msg.isLoading) // Don't save loading messages
      .map(msg => {
        const { image, ...rest } = msg; // Exclude image base64 string
        return rest;
      });
      
    if (historyToSave.length > 0) {
        localStorage.setItem('chatHistory', JSON.stringify(historyToSave));
    } else {
        localStorage.removeItem('chatHistory');
    }
  }, [chatHistory]);

  return [chatHistory, setChatHistory] as const;
};


const App: React.FC = () => {
  const [chatHistory, setChatHistory] = useChatHistory();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = useCallback(async (inputText: string, imageBase64: string | null) => {
    if ((!inputText.trim() && !imageBase64) || isLoading) return;
    
    setIsLoading(true);

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: inputText,
      image: imageBase64 || undefined,
    };

    const modelLoadingMessage: ChatMessageType = {
      id: `model-loading-${Date.now()}`,
      role: 'model',
      text: '',
      isLoading: true
    };

    // Add user message and loading indicator immediately
    setChatHistory(prev => [...prev, userMessage, modelLoadingMessage]);
    
    try {
      let prompt;
      if (imageBase64) {
        prompt = inputText.trim() 
          ? `The user has provided an image and the following text: "${inputText}". Please respond in the language of the user's text.`
          : "Analyze the attached image and provide the recipe for the Burmese dish shown. Respond in English unless the image contains Burmese text.";
      } else {
        prompt = `Provide the recipe for: ${inputText}`;
      }

      const result = await getRecipeForDish(prompt, imageBase64);

      let finalModelMessage: ChatMessageType;
      const modelMessageId = `model-response-${Date.now()}`;

      if ('error' in result) {
         finalModelMessage = {
            id: modelMessageId,
            role: 'model',
            text: result.error,
            error: result.error
         };
      } else { // Assumes a valid Recipe object
        finalModelMessage = {
            id: modelMessageId,
            role: 'model',
            text: `Here is the recipe for ${result.dishName}.`,
            recipe: result as Recipe
        };
      }
      
      // Replace the loading message with the final response
      setChatHistory(prev => [
        ...prev.filter(msg => !msg.isLoading), // Remove loading indicator
        finalModelMessage
      ]);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        const errorResponse: ChatMessageType = {
            id: `model-error-${Date.now()}`,
            role: 'model',
            text: `Sorry, something went wrong: ${errorMessage}`,
            error: errorMessage,
        };
        // Replace the loading message with an error message
        setChatHistory(prev => [
            ...prev.filter(msg => !msg.isLoading),
            errorResponse
        ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, setChatHistory]);

  const handleClearHistory = () => {
    setChatHistory([]);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 text-black min-h-screen flex flex-col font-sans">
      <header className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-lg z-10 border-b border-black/10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <LogoIcon className="w-8 h-8" />
              <h1 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-black to-gray-700">
                BurmaFoodie
              </h1>
            </div>
            {chatHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors px-3 py-1 rounded-md bg-gray-200/50 hover:bg-red-100/80"
                title="Clear chat history"
              >
                Clear History
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-24 pb-32 md:pb-36">
        <div className="max-w-3xl w-full mx-auto px-4 flex-1 overflow-y-auto">
           {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 animate-fadeInUp">
                <p className="text-lg">Welcome to BurmaFoodie!</p>
                <p className="mt-2 text-sm max-w-sm">Type a Burmese dish name (e.g., "မုန့်ဟင်းခါး" or "Mohinga") or upload a photo to get a recipe.</p>
            </div>
           )}
          <div className="space-y-6">
            {chatHistory.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-lg border-t border-black/10">
        <div className="max-w-3xl mx-auto p-4">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
};

export default App;
