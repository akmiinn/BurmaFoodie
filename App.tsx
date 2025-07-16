import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage as ChatMessageType, Recipe, GeminiResponse, Greeting } from './types';
import { getRecipeForDish } from './services/geminiService';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import { LogoIcon } from './components/icons';
import LanguageSwitcher from './components/LanguageSwitcher'; // Import the new component

// --- Dictionary for UI text ---
const uiText = {
  en: {
    welcome: "Welcome!",
    subtext: "Let BurmaFoodie help you find Burmese recipes today. Type a dish name, upload a photo, or try an example below.",
    suggestion1: "How to make Mohinga",
    suggestion2: "Tea Leaf Salad recipe please",
    suggestion3: "What's in Shan Noodles?",
    clearHistory: "Clear History"
  },
  my: {
    welcome: "မင်္ဂလာပါ!",
    subtext: "BurmaFoodie ကသင့်ကို မြန်မာအစားအစာချက်ပြုတ်နည်းတွေကို ကူညီရှာဖွေပေးနိုင်ပါတယ်။ အစားအစာနာမည်ကိုရိုက်၍ဖြစ်စေ ဓာတ်ပုံတင်၍ဖြစ်စေ သို့မဟုတ် အောက်ကဥပမာများကိုစမ်းကြည့်ပါ။",
    suggestion1: "မုန့်ဟင်းခါးချက်နည်း",
    suggestion2: "လက်ဖက်သုပ်နည်း",
    suggestion3: "ရှမ်းခေါက်ဆွဲထဲမှာ ဘာပါလဲ?",
    clearHistory: "မှတ်တမ်းဖျက်ရန်"
  }
};


const App: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'my'>('en');
  const [chatHistory, setChatHistory] = useState<ChatMessageType[]>(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to parse chat history", error);
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Adding a slight delay to ensure content has rendered before scrolling
    // This can sometimes help with rendering inconsistencies, especially after state updates
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100); 
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    const historyToSave = chatHistory.map(msg => {
      // Exclude the 'image' property when saving to localStorage
      // as base64 images can make localStorage too large or cause parsing issues
      const { image, ...rest } = msg;
      return rest;
    });
    localStorage.setItem('chatHistory', JSON.stringify(historyToSave));
  }, [chatHistory]);
  
  const handleSendMessage = useCallback(async (inputText: string, imageBase64: string | null) => {
    if (!inputText.trim() && !imageBase64) return;
    setIsLoading(true);

    const userMessageId = Date.now().toString();
    const userMessage: ChatMessageType = {
      id: userMessageId,
      role: 'user',
      text: inputText,
      image: imageBase64 || undefined, // Store image if provided
    };
    
    setChatHistory(prev => [...prev, userMessage]);

    const modelLoadingMessageId = (Date.now() + 1).toString();
    const modelLoadingMessage: ChatMessageType = {
      id: modelLoadingMessageId,
      role: 'model',
      text: '', // Empty text as it's a loading state
      isLoading: true
    };
    setChatHistory(prev => [...prev, modelLoadingMessage]);

    let prompt;
    if (imageBase64) {
      if (inputText.trim()) {
        prompt = `The user has provided an image and the following text: "${inputText}". Identify the Burmese dish and provide its recipe. The user's text is the primary instruction, and the image provides context. Please respond in the language of the user's text.`;
      } else {
        prompt = "Analyze the attached image and provide the recipe for the Burmese dish shown. Identify the language from any visible text or typical context and respond in that language (Burmese or English).";
      }
    } else {
      prompt = inputText;
    }
    
    // Call the Gemini service
    const result: GeminiResponse = await getRecipeForDish(prompt, imageBase64);

    let finalModelMessage: ChatMessageType;

    // Determine the final message based on the Gemini response
    if ('greeting' in result) {
       finalModelMessage = {
           id: modelLoadingMessageId,
           role: 'model',
           text: (result as Greeting).greeting,
         };
    } else if ('error' in result) {
       finalModelMessage = {
           id: modelLoadingMessageId,
           role: 'model',
           text: result.error,
           error: result.error
         };
    } else {
      finalModelMessage = {
           id: modelLoadingMessageId,
           role: 'model',
           text: `Here is the recipe for ${(result as Recipe).dishName}.`, // Include a default text for recipes
           recipe: result as Recipe
       };
    }

    // Update the loading message with the final content
    setChatHistory(prev => prev.map(msg => msg.id === modelLoadingMessageId ? finalModelMessage : msg));
    setIsLoading(false);
  }, []);

  const handleClearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
  };

  return (
    // Main container uses flex-col to stack header, main, and footer vertically.
    // h-screen makes it take full viewport height.
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 text-black h-screen flex flex-col font-sans">
      {/* Header: flex-shrink-0 ensures it takes its natural height and doesn't shrink */}
      <header className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-lg z-10 border-b border-black/10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <LogoIcon className="w-8 h-8" />
              <h1 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-black to-gray-700">
                BurmaFoodie
              </h1>
            </div>
            {/* Language Switcher and Clear History */}
            <div className="flex items-center space-x-4">
              {chatHistory.length > 0 && (
                <button 
                  onClick={handleClearHistory}
                  className="text-xs text-gray-500 hover:text-red-600 transition-colors px-3 py-1 rounded-md bg-gray-200/50 hover:bg-red-100/80"
                  title="Clear chat history"
                >
                  {uiText[language].clearHistory}
                </button>
              )}
              <LanguageSwitcher language={language} setLanguage={setLanguage} />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content area:
          - flex-1 makes it grow to fill all available vertical space.
          - overflow-y-auto makes it scroll if content exceeds its height.
          - pt-4 pb-4 provides general top and bottom padding for the scrollable content.
      */}
      <main className="flex-1 overflow-y-auto pt-40 pb-40"> 
        <div className="max-w-3xl w-full mx-auto px-4">
            
           {chatHistory.length === 0 && (
           // Initial greeting display when chat history is empty
           // min-h-[calc(100vh-theme('spacing.20')*2)] approximates screen height minus header/footer height
           <div className="flex flex-col items-center justify-center text-center h-full min-h-[calc(100vh-160px)] animate-fadeInUp">
                <div className="text-gray-600 w-full">
                    <LogoIcon className="w-12 h-12 inline-block mb-4" />
                    <p className="text-2xl font-bold text-gray-800">{uiText[language].welcome}</p>
                    <p className="mt-2 text-sm max-w-sm mx-auto">{uiText[language].subtext}</p>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-3 px-4">
                    <button
                        onClick={() => handleSendMessage(uiText[language].suggestion1, null)}
                        disabled={isLoading}
                        className="bg-white/80 border border-gray-300/80 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-200/60 transition-colors disabled:opacity-50"
                    >
                        {uiText[language].suggestion1}
                    </button>
                    <button
                        onClick={() => handleSendMessage(uiText[language].suggestion2, null)}
                        disabled={isLoading}
                        className="bg-white/80 border border-gray-300/80 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-200/60 transition-colors disabled:opacity-50"
                    >
                        {uiText[language].suggestion2}
                    </button>
                    <button
                        onClick={() => handleSendMessage(uiText[language].suggestion3, null)}
                        disabled={isLoading}
                        className="bg-white/80 border border-gray-300/80 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-200/60 transition-colors disabled:opacity-50"
                    >
                        {uiText[language].suggestion3}
                    </button>
                </div>
            </div>
           )}

           {/* Chat messages */}
           <div className="space-y-6">
             {chatHistory.map((msg) => (
               <ChatMessage key={msg.id} message={msg} />
             ))}
             {/* Ref for scrolling to the end */}
             <div ref={chatEndRef} />
           </div>
         </div>
       </main>

      {/* Footer: flex-shrink-0 ensures it takes its natural height and doesn't shrink */}
       <footer className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-lg border-t border-black/10">
         <div className="max-w-3xl mx-auto px-4 pt-4 pb-2">
           <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
           <p className="text-center text-xs text-gray-500 pt-2.5">
              <span>Copyright © 2025 BurmaFoodie.</span>
              <span className="mx-2">|</span>
              <a href="#" className="underline hover:text-black transition-colors">Terms of Service</a>
              <span className="mx-2">|</span>
              <a href="#" className="underline hover:text-black transition-colors">Privacy Policy</a>
              <span className="mx-2">|</span>
              <a href="mailto:info@burmafoodie.site" className="underline hover:text-black transition-colors">Contact Us</a>
            </p>
         </div>
       </footer>
     </div>
   );
 };

export default App;
