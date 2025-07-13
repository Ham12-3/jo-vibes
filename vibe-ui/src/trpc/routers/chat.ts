import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../innit';
import { TRPCError } from '@trpc/server';
import OpenAI from 'openai';
// import { AIPromptProcessor } from '@/lib/ai-processor';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Input schemas
const createChatSessionSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().optional(),
});

const sendMessageSchema = z.object({
  chatSessionId: z.string(),
  content: z.string().min(1),
});

const getChatSessionSchema = z.object({
  chatSessionId: z.string(),
});

const getProjectChatSessionSchema = z.object({
  projectId: z.string(),
});

export const chatRouter = createTRPCRouter({
  // Create a new chat session
  createChatSession: protectedProcedure
    .input(createChatSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      
      // If projectId is provided, verify user owns the project
      if (input.projectId) {
        const project = await db.project.findFirst({
          where: {
            id: input.projectId,
            userId: user.id,
          },
        });
        
        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }
      }

      const chatSession = await db.chatSession.create({
        data: {
          userId: user.id,
          projectId: input.projectId,
          title: input.title || 'New Chat',
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              framework: true,
              styling: true,
              database: true,
            },
          },
        },
      });

      return chatSession;
    }),

  // Get chat session with messages
  getChatSession: protectedProcedure
    .input(getChatSessionSchema)
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const chatSession = await db.chatSession.findFirst({
        where: {
          id: input.chatSessionId,
          userId: user.id,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              framework: true,
              styling: true,
              database: true,
            },
          },
        },
      });

      if (!chatSession) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat session not found',
        });
      }

      return chatSession;
    }),

  // Get or create chat session for a project
  getOrCreateProjectChatSession: protectedProcedure
    .input(getProjectChatSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Verify user owns the project
      const project = await db.project.findFirst({
        where: {
          id: input.projectId,
          userId: user.id,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check if chat session already exists for this project
      let chatSession = await db.chatSession.findFirst({
        where: {
          projectId: input.projectId,
          userId: user.id,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              framework: true,
              styling: true,
              database: true,
            },
          },
        },
      });

      // If no chat session exists, create one
      if (!chatSession) {
        chatSession = await db.chatSession.create({
          data: {
            userId: user.id,
            projectId: input.projectId,
            title: `Chat about ${project.name}`,
          },
          include: {
            messages: {
              orderBy: {
                createdAt: 'asc',
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                  },
                },
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                framework: true,
                styling: true,
                database: true,
              },
            },
          },
        });
      }

      return chatSession;
    }),

  // Send a message and get AI response
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Verify user owns the chat session
      const chatSession = await db.chatSession.findFirst({
        where: {
          id: input.chatSessionId,
          userId: user.id,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              framework: true,
              styling: true,
              database: true,
              initialPrompt: true,
            },
          },
        },
      });

      if (!chatSession) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat session not found',
        });
      }

      // Create user message
      const userMessage = await db.message.create({
        data: {
          chatSessionId: input.chatSessionId,
          userId: user.id,
          content: input.content,
          role: 'USER',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      // Generate AI response
      try {
        const messages = chatSession.messages.concat(userMessage);
        const aiResponse = await generateAIResponse(messages, chatSession.project);
        
        // Create AI message
        const aiMessage = await db.message.create({
          data: {
            chatSessionId: input.chatSessionId,
            userId: user.id, // System messages still need a userId
            content: aiResponse,
            role: 'ASSISTANT',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
              },
            },
          },
        });

        return {
          userMessage,
          aiMessage,
        };
      } catch (error) {
        console.error('Error generating AI response:', error);
        
        // Create error message
        const errorMessage = await db.message.create({
          data: {
            chatSessionId: input.chatSessionId,
            userId: user.id,
            content: 'I apologize, but I encountered an error processing your message. Please try again.',
            role: 'ASSISTANT',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
              },
            },
          },
        });

        return {
          userMessage,
          aiMessage: errorMessage,
        };
      }
    }),

  // Get user's chat sessions
  getUserChatSessions: protectedProcedure
    .query(async ({ ctx }) => {
      const { db, user } = ctx;

      const chatSessions = await db.chatSession.findMany({
        where: {
          userId: user.id,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              content: true,
              createdAt: true,
              role: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return chatSessions;
    }),

  // Delete chat session
  deleteChatSession: protectedProcedure
    .input(getChatSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const chatSession = await db.chatSession.findFirst({
        where: {
          id: input.chatSessionId,
          userId: user.id,
        },
      });

      if (!chatSession) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat session not found',
        });
      }

      await db.chatSession.delete({
        where: {
          id: input.chatSessionId,
        },
      });

      return { success: true };
    }),
});

// Helper function to generate AI response
async function generateAIResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any
): Promise<string> {
  const systemMessage = `You are an AI assistant helping with software development. ${
    project 
      ? `The user is working on a project called "${project.name}" - ${project.description || 'No description provided'}. 
         Project details: Framework: ${project.framework || 'Not specified'}, 
         Styling: ${project.styling || 'Not specified'}, 
         Database: ${project.database || 'Not specified'}.
         ${project.initialPrompt ? `Original project prompt: "${project.initialPrompt}"` : ''}`
      : 'The user is having a general conversation about software development.'
  }

You should:
- Provide helpful, accurate programming advice
- Help with debugging and problem-solving
- Suggest best practices and improvements
- Answer questions about the project or general development
- Be encouraging and supportive
- Keep responses concise but comprehensive
- Use code examples when helpful
- Ask clarifying questions when needed

Be conversational and friendly while maintaining technical accuracy.`;

  const openaiMessages = [
    {
      role: 'system' as const,
      content: systemMessage,
    },
    ...messages.map((msg) => ({
      role: msg.role.toLowerCase() === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    })),
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openaiMessages,
    max_tokens: 1000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
} 