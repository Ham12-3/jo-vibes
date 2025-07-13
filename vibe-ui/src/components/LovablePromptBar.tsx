"use client"
import { useRef, useState, useEffect } from 'react'
import { ArrowUp, Paperclip, Plus, Loader2, CheckCircle, Sparkles, Zap } from 'lucide-react'
import { api } from '@/trpc/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AIProcessingIndicator } from '@/components/ui/loading-states'

export function LovablePromptBar() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [createSandbox, setCreateSandbox] = useState(false);
  const [processingStage, setProcessingStage] = useState<"analyzing" | "generating" | "creating" | "deploying" | "complete">("analyzing");
  const [isMac, setIsMac] = useState(false);

  // Detect platform after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator?.platform) {
      setIsMac(navigator.platform.includes('Mac'));
    }
  }, []);
  
  const queryClient = useQueryClient();

  const createProject = api.project.createProjectWithAI.useMutation({
    onMutate: () => {
      setProcessingStage("analyzing");
    },
    onSuccess: (project) => {
      setProcessingStage("complete");
      
      if (project.aiProcessed) {
        const filesCount = 'filesGenerated' in project ? project.filesGenerated : 0;
        const totalFiles = 'totalFiles' in project ? project.totalFiles : filesCount;
        const sandboxCreated = 'sandboxCreated' in project ? project.sandboxCreated : false;
        const sandboxUrl = 'sandboxUrl' in project ? project.sandboxUrl : null;
        
        if (sandboxCreated && sandboxUrl) {
          toast.success(`🚀 Project "${project.name}" created and deployed!`, {
            description: `${filesCount} files generated with live preview ready`,
            duration: 8000,
            action: {
              label: 'Open Preview',
              onClick: () => window.open(sandboxUrl, '_blank'),
            },
          });
        } else {
          toast.success(`🎉 AI created "${project.name}" with ${filesCount} files!`, {
            description: `Complete project structure generated with ${totalFiles} total files`,
            duration: 5000,
          });
        }
      } else {
        const errorMsg = 'error' in project ? project.error : 'Unknown error';
        toast.error(`Project created but AI processing failed: ${errorMsg}`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['project.getUserProjects'] });
      setPrompt('');
      setJustSubmitted(true);
      
      // Reset the success state after 3 seconds
      setTimeout(() => setJustSubmitted(false), 3000);
      
      // Navigate to the project (you can customize this)
      // window.location.href = `/project/${project.id}`;
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    setPrompt(target.value);
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleBarClick = () => {
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error('Please describe what you want to build');
      return;
    }

    if (prompt.trim().length < 10) {
      toast.error('Please provide a more detailed description (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate stage progression
    setTimeout(() => setProcessingStage("generating"), 1000);
    setTimeout(() => setProcessingStage("creating"), 2000);
    if (createSandbox) {
      setTimeout(() => setProcessingStage("deploying"), 3000);
    }
    
    createProject.mutate({
      prompt: prompt.trim(),
      createSandbox: createSandbox,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* AI Processing Indicator */}
      {isSubmitting && (
        <div className="mb-4">
          <AIProcessingIndicator 
            stage={processingStage} 
            message={createSandbox ? "Setting up live preview environment..." : "Analyzing your request and generating files..."}
          />
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div 
          onClick={handleBarClick}
          className={`relative bg-[#fcfbfa] shadow-[0_6px_16px_rgba(0,0,0,0.04)] rounded-2xl min-h-[140px] cursor-text transition-all duration-300 ${
            isSubmitting ? 'opacity-70 ring-2 ring-blue-200' : ''
          } ${justSubmitted ? 'ring-2 ring-green-200' : ''}`}
        >
          {/* AI Processing Indicator */}
          {isSubmitting && (
            <div className="absolute top-4 right-4 flex items-center text-blue-500 text-sm">
              <Sparkles className="h-4 w-4 mr-1 animate-pulse" />
              <span>{createSandbox ? 'AI + Deploying...' : 'AI Processing...'}</span>
            </div>
          )}

          {/* Textarea - Full area */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onInput={handleInput}
            onKeyDown={handleKeyPress}
            placeholder="Describe the app you want to build... (e.g., 'Create a modern todo app with React and dark mode')"
            className="w-full h-full min-h-[140px] text-base text-gray-800 placeholder-gray-300 placeholder-opacity-80 font-normal bg-transparent border-none outline-none resize-none overflow-hidden leading-6 focus:ring-2 focus:ring-blue-200 transition duration-200 px-6 py-5 pr-20 rounded-2xl disabled:opacity-50"
            rows={1}
            disabled={isSubmitting}
          />

          {/* Character count indicator */}
          <div className="absolute top-4 left-6 text-xs text-gray-400">
            {prompt.length}/1000 characters
          </div>

          {/* Buttons positioned absolutely on top */}
          <div className="absolute bottom-5 left-6 flex items-center gap-x-4">
            {/* Plus Button */}
            <button 
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-12 h-12 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
              disabled={isSubmitting}
              title="Add files or screenshots"
            >
              <Plus className="h-6 w-6 text-gray-600" />
            </button>

            {/* Attach Chip */}
            <button 
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center h-10 px-4 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
              disabled={isSubmitting}
              title="Attach files or images"
            >
              <Paperclip className="h-5 w-5 mr-1 text-gray-600" />
              <span className="text-base font-medium text-gray-800">Attach</span>
            </button>

            {/* Live Preview Toggle */}
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCreateSandbox(!createSandbox);
              }}
              className={`flex items-center h-10 px-4 rounded-full shadow-sm hover:shadow-md transition-all duration-300 ${
                createSandbox 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
              disabled={isSubmitting}
              title="Create live preview immediately"
            >
              <Zap className="h-5 w-5 mr-1" />
              <span className="text-base font-medium">Live Preview</span>
            </button>
          </div>

          {/* Send Button - positioned absolutely on right */}
          <button 
            type="submit"
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-5 right-6 flex items-center justify-center w-12 h-12 rounded-full shadow-sm transition-all duration-300 ${
              isSubmitting
                ? 'bg-blue-500 border-blue-500 cursor-not-allowed'
                : justSubmitted
                ? 'bg-green-500 border-green-500'
                : prompt.trim().length >= 10
                ? 'bg-blue-500 border-blue-500 hover:bg-blue-600'
                : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
            }`}
            disabled={isSubmitting || prompt.trim().length < 10}
            title={prompt.trim().length < 10 ? 'Enter at least 10 characters' : createSandbox ? 'Create project with live preview' : 'Create project with AI'}
          >
            {isSubmitting ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : justSubmitted ? (
              <CheckCircle className="h-6 w-6 text-white" />
            ) : (
              <ArrowUp className={`h-6 w-6 ${prompt.trim().length >= 10 ? 'text-white' : 'text-gray-600'}`} />
            )}
          </button>
        </div>
      </form>
      
      {/* Enhanced hint text */}
      <div className="text-center mt-3 space-y-1">
        <p className="text-sm text-gray-500">
          Press {isMac ? '⌘' : 'Ctrl'} + Enter to submit • Powered by AI {createSandbox && '+ Live Preview'}
        </p>
        <p className="text-xs text-gray-400">
          Example: &quot;Build a task management app with React, drag-and-drop, and user authentication&quot;
        </p>
      </div>
    </div>
  );
} 