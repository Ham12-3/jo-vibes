import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { enhancedJobs } from '@/lib/inngest/functions'

// Create the Inngest handler with all our enhanced jobs
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: enhancedJobs,
})
