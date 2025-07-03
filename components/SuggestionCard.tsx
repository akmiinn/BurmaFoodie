import React from 'react';
import { IngredientSuggestion } from '../types';

interface SuggestionCardProps {
  suggestion: IngredientSuggestion;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-xl shadow-gray-300/50 overflow-hidden">
      <div className="relative p-5">
        <h3 className="text-lg font-bold text-black tracking-wide">{suggestion.heading}</h3>
      </div>

      <div className="relative px-5 pb-5 space-y-4">
        {suggestion.suggestions.map((item, index) => (
          <div key={index} className="border-t border-gray-200 pt-4">
            <h4 className="font-semibold text-md text-gray-800">{item.dishName}</h4>
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestionCard;
