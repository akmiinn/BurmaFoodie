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
    welcome: "ကြိုဆိုပါတယ်!",
    subtext: "BurmaFoodie ကသင့်ကို မြန်မာအစားအစာချက်ပြုတ်နည်းတွေကို ကူညီရှာဖွေပေးပါရစေ။ အစားအစာနာမည်ကိုရိုက်ပါ၊ ဓာတ်ပုံတင်ပါ၊ သို့မဟုတ် အောက်ကဥပမာများကိုစမ်းကြည့်ပါ။",
    suggestion1: "မုန့်ဟင်းခါးလုပ်နည်း",
    suggestion2: "လက်ဖက်သုပ် ချက်နည်း",
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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    const historyToSave = chatHistory.map(msg => {
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
      image: imageBase64 || undefined,
    };
    
    setChatHistory(prev => [...prev, userMessage]);

    const modelLoadingMessageId = (Date.now() + 1).toString();
    const modelLoadingMessage: ChatMessageType = {
      id: modelLoadingMessageId,
      role: 'model',
      text: '',
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
    
    const result: GeminiResponse = await getRecipeForDish(prompt, imageBase64);

    let finalModelMessage: ChatMessageType;

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
          text: `Here is the recipe for ${(result as Recipe).dishName}.`,
          recipe: result as Recipe
      };
    }

    setChatHistory(prev => prev.map(msg => msg.id === modelLoadingMessageId ? finalModelMessage : msg));
    setIsLoading(false);
  }, []);

  const handleClearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 text-black h-screen flex flex-col font-sans">
      <header className="bg-white/70 backdrop-blur-lg z-10 border-b border-black/10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <LogoIcon className="w-8 h-8" />
              <h1 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-black to-gray-700">
                BurmaFoodie
              </h1>
            </div>
             {/* ===== START: Language Switcher and Clear History Logic ===== */}
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
             {/* ===== END: Language Switcher and Clear History Logic ===== */}
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-4 pt-6 pb-8 relative flex-1 h-full">
           
           {chatHistory.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center animate-fadeInUp">
                <div className="text-gray-600 w-full">
                    {/* ===== Logo without the circle ===== */}
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

          <div className="space-y-6">
            {chatHistory.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </main>

      <footer className="bg-white/70 backdrop-blur-lg border-t border-black/10">
        <div className="max-w-3xl mx-auto p-4">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
};

export default App;
