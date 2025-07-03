import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import RecipeCard from './RecipeCard';
import SuggestionCard from './SuggestionCard'; // Import the new component
import { UserIcon, BotIcon } from './icons';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const content = message.content;

  const renderModelContent = () => {
    if (!content) return null;

    switch (content.responseType) {
      case 'recipe':
        return (
          <div className="mt-4 w-full">
            <RecipeCard recipe={content} />
          </div>
        );
      case 'ingredientSuggestion':
        return (
          <div className="mt-4 w-full">
            <SuggestionCard suggestion={content} />
          </div>
        );
      case 'greeting':
      case 'clarification':
        return <p className="whitespace-pre-wrap">{content.text}</p>;
      case 'error':
        return <p className="whitespace-pre-wrap text-red-600">{content.error}</p>;
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-start gap-3 md:gap-4 animate-fadeInUp ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-gray-200 border border-gray-300/50 shadow-sm transition-transform duration-500 ${message.isLoading ? 'animate-subtle-pulse' : ''}`}>
          <BotIcon className="w-5 h-5 md:w-6 md:h-6 text-black" />
        </div>
      )}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full max-w-lg`}>
        <div className={`px-4 py-3 rounded-2xl shadow-md transition-all ${isUser ? 'bg-gray-800 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'}`}>
          {message.isLoading && (
             <p className="italic text-gray-500">BurmaFoodie is thinking...</p>
          )}
          {/* User message content */}
          {isUser && message.image && (
            <img src={message.image} alt="User upload" className="rounded-lg mb-2 max-w-xs max-h-64 object-cover" />
          )}
          {isUser && message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
          
          {/* Model message content */}
          {!isUser && renderModelContent()}
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-900 shadow-md">
          <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
