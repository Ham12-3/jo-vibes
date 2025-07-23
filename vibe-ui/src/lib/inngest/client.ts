import { Inngest } from 'inngest'

// Create Inngest client
export const inngest = new Inngest({
  id: 'vibe-ui',
  name: 'Vibe UI Background Jobs',
  // Add your Inngest signing key from environment variables
  signingKey: process.env.INNGEST_SIGNING_KEY,
})

// Export types for better type safety
export type InngestEvents = {
  'project.generate': {
    data: {
      projectId: string
      userId: string
      userPrompt: string
    }
  }
  'cleanup.expired': {
    data: Record<string, never>
  }
} 