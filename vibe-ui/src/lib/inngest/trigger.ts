import { inngest } from './client'

// Service to trigger background jobs
export class BackgroundJobService {
  private static instance: BackgroundJobService

  static getInstance(): BackgroundJobService {
    if (!BackgroundJobService.instance) {
      BackgroundJobService.instance = new BackgroundJobService()
    }
    return BackgroundJobService.instance
  }

  // Trigger AI project generation
  async triggerProjectGeneration(projectId: string, userId: string, userPrompt: string) {
    try {
      await inngest.send({
        name: "project.generate",
        data: {
          projectId,
          userId,
          userPrompt
        }
      })
      console.log(`✅ Triggered project generation for ${projectId}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to trigger project generation:`, error)
      return false
    }
  }

  // Trigger cleanup
  async triggerCleanup() {
    try {
      await inngest.send({
        name: "cleanup.expired",
        data: {}
      })
      console.log(`✅ Triggered cleanup job`)
      return true
    } catch (error) {
      console.error(`❌ Failed to trigger cleanup:`, error)
      return false
    }
  }

  // Schedule periodic cleanup (runs every 24 hours)
  async schedulePeriodicCleanup() {
    try {
      await inngest.send({
        name: "cleanup.expired",
        data: {},
        ts: Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now
      })
      console.log(`✅ Scheduled periodic cleanup`)
      return true
    } catch (error) {
      console.error(`❌ Failed to schedule cleanup:`, error)
      return false
    }
  }
}

// Export singleton instance
export const backgroundJobService = BackgroundJobService.getInstance() 