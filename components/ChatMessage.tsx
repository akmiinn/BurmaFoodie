import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import RecipeCard from './RecipeCard';
import { UserIcon, BotIcon } from './icons';
import Loader from './Loader'; // Import the Loader component

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 md:gap-4 animate-fadeInUp ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-gray-200 border border-gray-300/50 shadow-sm transition-transform duration-500 ${message.isLoading ? 'animate-subtle-pulse' : ''}`}>
          <BotIcon className="w-5 h-5 md:w-6 md:h-6 text-black" />
        </div>
      )}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full max-w-lg`}>
        <div className={`px-4 py-3 rounded-2xl shadow-md transition-all ${isUser ? 'bg-gray-800 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'}`}>
          
          {/* ===== START: Updated Loading Message ===== */}
          {message.isLoading && (
             <div className="flex items-center space-x-2">
                <p className="italic text-gray-500">BurmaFoodie is thinking</p>
                <Loader />
             </div>
          )}
          {/* ===== END: Updated Loading Message ===== */}

          {message.image && (
            <img src={message.image} alt="User upload" className="rounded-lg mb-2 max-w-xs max-h-64 object-cover" />
          )}
          {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
        </div>
        {message.recipe && (
          <div className="mt-4 w-full">
            <RecipeCard recipe={message.recipe} />
          </div>
        )}
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
