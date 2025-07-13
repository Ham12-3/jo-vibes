"use client"
import { useRef, useState, useEffect } from 'react'
import { Loader2, Sparkles, Zap } from 'lucide-react'
import { api } from '@/trpc/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AIProcessingIndicator } from '@/components/ui/loading-states'

export function LovablePromptBar() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [processingStage, setProcessingStage] = useState<"analyzing" | "generating" | "creating" | "deploying" | "complete">("analyzing");
  const [isMac, setIsMac] = useState(false);

  // Clean, inspiring placeholder
  const placeholderText = "Describe your app idea... (e.g., 'Create a modern task management app with drag-and-drop boards and real-time collaboration')";

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
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
    setTimeout(() => setProcessingStage("deploying"), 3000);
    
    createProject.mutate({
      prompt: prompt.trim(),
      createSandbox: true,
    });
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Clean, elegant prompt input */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="relative">
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500" />
          
          {/* Main textarea */}
          <div className="relative p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span className="text-lg font-semibold text-gray-900">Create with AI</span>
            </div>
            
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholderText}
              className="w-full h-24 resize-none border-none outline-none text-gray-800 placeholder-gray-400 text-base leading-relaxed bg-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          
          {/* Clean bottom bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center space-x-3 text-sm text-gray-500">
              <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">
                {isMac ? '⌘' : 'Ctrl'} + Enter
              </kbd>
              <span>to create</span>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isSubmitting}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                !prompt.trim() || isSubmitting
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Build App</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Processing indicator */}
      {(isSubmitting || justSubmitted) && (
        <div className="mt-6">
          <AIProcessingIndicator stage={processingStage} />
        </div>
      )}
    </div>
  );
} 