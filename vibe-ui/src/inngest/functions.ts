import { inngest } from './client'
import { db } from '@/lib/db'

// This function fires whenever you send an event named "demo/hello".
export const helloWorld = inngest.createFunction(
  { id: 'hello.world' },
  { event: 'demo/hello' },
  async ({ event, step }) => {
    // Log something or run any side-effect you like
    await step.run('log', () => {
      console.log('👋 Hello from Inngest! Payload:', event.data)
    })

    // Return something small just for demonstration
    return { message: 'Hello World from Inngest', data: event.data }
  }
)

// Background function that triggers when a vibe is created
export const onVibeCreated = inngest.createFunction(
  { id: 'vibe.created.notification' },
  { event: 'vibe/created' },
  async ({ event, step }) => {
    const { vibeId, authorId, mood } = event.data

    // Step 1: Log the vibe creation
    await step.run('log-vibe-creation', async () => {
      console.log(`📱 New vibe created! ID: ${vibeId}, Author: ${authorId}, Mood: ${mood}`)
    })

    // Step 2: Example - notify followers (you can extend this based on your needs)
    const followerNotifications = await step.run('notify-followers', async () => {
      // Get the vibe details first
      const vibe = await db.vibe.findUnique({
        where: { id: vibeId },
        include: {
          author: {
            select: { id: true, username: true, name: true }
          }
        }
      })

      if (!vibe) {
        console.log('Vibe not found, skipping notifications')
        return { notified: 0 }
      }

      // TODO: When you implement followers, you can query them here:
      // const followers = await db.follow.findMany({
      //   where: { followingId: authorId },
      //   select: { followerId: true, follower: { select: { username: true } } }
      // })

      // For now, just log what would happen
      console.log(`🔔 Would notify followers about new ${mood} vibe: "${vibe.title}" by @${vibe.author.username}`)
      
      // Example: send push notifications, emails, etc.
      // await sendPushNotification(followers, vibe)
      // await sendEmailNotification(followers, vibe)

      return { notified: 0 } // Would be followers.length when implemented
    })

    // Step 3: Example - process mood analytics
    await step.run('process-mood-analytics', async () => {
      // You could track mood trends, update user mood history, etc.
      console.log(`📊 Processing mood analytics for ${mood} vibe`)
      
      // Example: update mood statistics
      // await updateMoodStats(authorId, mood)
    })

    // Step 4: Example - generate thumbnail or process media (if applicable)
    await step.run('process-media', async () => {
      // If the vibe had media URLs, you could:
      // - Generate thumbnails
      // - Optimize images
      // - Extract video metadata
      // - Run content moderation
      console.log(`🎨 Processing media for vibe ${vibeId}`)
    })

    return {
      vibeId,
      mood,
      followersNotified: followerNotifications.notified,
      timestamp: new Date().toISOString()
    }
  }
)

// You can export more functions from this file later
