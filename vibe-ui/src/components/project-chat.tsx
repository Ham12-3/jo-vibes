"use client"

import { useState, useRef, useEffect } from 'react'
import { api } from '@/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MessageCircle, Send, Bot, User, Loader2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
// import { ChatMessageSkeleton, LoadingDots } from '@/components/ui/loading-states'

interface ProjectChatProps {
  projectId: string
}

interface Message {
  id: string
  content: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'FUNCTION'
  createdAt: string
  user: {
    id: string
    name: string | null
    username: string
    avatar: string | null
  }
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get or create chat session for the project
  const getOrCreateChatSession = api.chat.getOrCreateProjectChatSession.useMutation()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chatSession, setChatSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize chat session on mount
  useEffect(() => {
    getOrCreateChatSession.mutate(
      { projectId },
      {
        onSuccess: (data) => {
          setChatSession(data)
          setIsLoading(false)
        },
        onError: () => {
          setIsLoading(false)
        },
      }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Send message mutation
  const sendMessage = api.chat.sendMessage.useMutation()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatSession?.messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || !chatSession) return

    setIsTyping(true)
    const messageContent = message.trim()
    setMessage('')

    try {
      const response = await sendMessage.mutateAsync({
        chatSessionId: chatSession.id,
        content: messageContent,
      })

      // Update the chat session with new messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setChatSession((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          messages: [
            ...prev.messages,
            response.userMessage,
            response.aiMessage,
          ],
        }
      })
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error(`Failed to send message: ${(error as any).message}`)
      setMessage(messageContent) // Restore message on error
    } finally {
      setIsTyping(false)
      inputRef.current?.focus()
    }
  }

  const copyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      toast.success('Message copied to clipboard')
      
      // Reset copy state after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch {
      toast.error('Failed to copy message')
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading chat...</span>
      </div>
    )
  }

  if (!chatSession) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load chat session</p>
      </div>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span>AI Assistant</span>
          {chatSession.project && (
            <Badge variant="secondary" className="ml-2">
              {chatSession.project.name}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Ask questions about your project, request changes, or get development guidance
        </p>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {chatSession.messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">Start a conversation</p>
                <p className="text-sm text-gray-400">
                  Ask me anything about your project, request modifications, or get development help
                </p>
              </div>
            ) : (
              chatSession.messages.map((msg: Message) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.role === 'USER' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'ASSISTANT' && (
                    <Avatar className="h-8 w-8 bg-blue-500">
                      <AvatarFallback>
                        <Bot className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[70%] ${msg.role === 'USER' ? 'order-2' : ''}`}>
                    <div
                      className={`p-3 rounded-lg ${
                        msg.role === 'USER'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-2 mt-1 ${
                      msg.role === 'USER' ? 'justify-end' : 'justify-start'
                    }`}>
                      <span className="text-xs text-gray-500">
                        {formatTime(msg.createdAt)}
                      </span>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {msg.role === 'USER' && (
                    <Avatar className="h-8 w-8 bg-gray-500">
                      <AvatarImage src={msg.user.avatar || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 bg-blue-500">
                  <AvatarFallback>
                    <Bot className="h-4 w-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <Separator />
        
        {/* Input */}
        <div className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything about your project..."
              disabled={isTyping}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!message.trim() || isTyping}
              className="px-4"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          
          <div className="mt-2 text-xs text-gray-500">
            Press Enter to send • AI powered by OpenAI
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 