"use client"
import { useRef } from 'react'
import { ArrowUp, Paperclip, Globe, Plus } from 'lucide-react'

export function LovablePromptBar() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleBarClick = () => {
    textareaRef.current?.focus();
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div 
        onClick={handleBarClick}
        className="relative bg-[#fcfbfa] shadow-[0_6px_16px_rgba(0,0,0,0.04)] rounded-2xl min-h-[140px] cursor-text"
      >
        {/* Textarea - Full area */}
        <textarea
          ref={textareaRef}
          onInput={handleInput}
          placeholder="Ask Lovable to create a prototype..."
          className="w-full h-full min-h-[140px] text-base text-gray-800 placeholder-gray-300 placeholder-opacity-80 font-normal bg-transparent border-none outline-none resize-none overflow-hidden leading-6 focus:ring-2 focus:ring-blue-200 transition duration-200 px-6 py-5 pr-20 rounded-2xl"
          rows={1}
        />

        {/* Buttons positioned absolutely on top */}
        <div className="absolute bottom-5 left-6 flex items-center gap-x-4">
          {/* Plus Button */}
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-12 h-12 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <Plus className="h-6 w-6 text-gray-600" />
          </button>

          {/* Attach Chip */}
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center h-10 px-4 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <Paperclip className="h-5 w-5 mr-1 text-gray-600" />
            <span className="text-base font-medium text-gray-800">Attach</span>
          </button>

          {/* Public Chip */}
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center h-10 px-4 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <Globe className="h-5 w-5 mr-1 text-gray-600" />
            <span className="text-base font-medium text-gray-800">Public</span>
          </button>
        </div>

        {/* Send Button - positioned absolutely on right */}
        <button 
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-5 right-6 flex items-center justify-center w-12 h-12 bg-gray-100 border border-gray-200 rounded-full shadow-sm hover:bg-gray-200 transition-colors duration-300"
        >
          <ArrowUp className="h-6 w-6 text-gray-600" />
        </button>
      </div>
    </div>
  );
} 