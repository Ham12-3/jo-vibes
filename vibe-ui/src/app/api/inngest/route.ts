import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { helloWorld, onVibeCreated } from '@/inngest/functions'

// Add Inngest serverless functions here when created
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const functions = [helloWorld, onVibeCreated] as const

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
