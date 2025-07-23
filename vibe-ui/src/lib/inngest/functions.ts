import { inngest } from './client'

// Basic Inngest functions for the application
export const functions = [
  // Project generation function
  inngest.createFunction(
    { id: "project.generate", name: "project.generate" },
    { event: "project.generate" },
    async ({ event, step }) => {
      const { projectId, userId, userPrompt } = event.data
      
      await step.run("generate-project", async () => {
        console.log(`Generating project ${projectId} for user ${userId} with prompt: ${userPrompt}`)
        // Add your project generation logic here
        return { success: true, projectId }
      })
      
      return { success: true, projectId }
    }
  ),

  // Code review function
  inngest.createFunction(
    { id: "project.code.review", name: "project.code.review" },
    { event: "project.code.review" },
    async ({ event, step }) => {
      const { projectId, userId } = event.data
      
      await step.run("review-code", async () => {
        console.log(`Reviewing code for project ${projectId} by user ${userId}`)
        // Add your code review logic here
        return { success: true, projectId }
      })
      
      return { success: true, projectId }
    }
  ),

  // Deployment function
  inngest.createFunction(
    { id: "project.deploy", name: "project.deploy" },
    { event: "project.deploy" },
    async ({ event, step }) => {
      const { projectId, userId, provider } = event.data
      
      await step.run("deploy-project", async () => {
        console.log(`Deploying project ${projectId} to ${provider} for user ${userId}`)
        // Add your deployment logic here
        return { success: true, projectId, provider }
      })
      
      return { success: true, projectId, provider }
    }
  )
]

// Export as enhancedJobs for backward compatibility
export const enhancedJobs = functions 