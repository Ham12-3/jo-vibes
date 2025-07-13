import { inngest } from './client'
import { db } from '@/lib/db'
import { aiProcessor } from '@/lib/ai-processor'

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

// Background function to generate project files with AI
export const generateProjectFiles = inngest.createFunction(
  { id: 'project.files.generate' },
  { event: 'project/files/generate' },
  async ({ event, step }) => {
    const { projectId, analysisData, fileStructure } = event.data

    // Step 1: Update project status to BUILDING
    await step.run('update-project-status', async () => {
      await db.project.update({
        where: { id: projectId },
        data: { status: 'BUILDING' }
      })
      console.log(`📁 Started generating files for project ${projectId}`)
    })

    // Step 2: Generate files in batches
    const batchSize = 5
    let processedFiles = 0
    
    for (let i = 0; i < fileStructure.length; i += batchSize) {
      const batch = fileStructure.slice(i, i + batchSize)
      
      await step.run(`generate-batch-${Math.floor(i / batchSize)}`, async () => {
        const projectFiles = await Promise.all(
          batch.map(async (filePath: string) => {
            try {
              const content = await aiProcessor.generateFileContent(filePath, analysisData)
              return {
                filename: filePath.split('/').pop() || 'file',
                path: filePath,
                content: content || `// Generated file: ${filePath}`,
                language: getLanguageFromPath(filePath),
                projectId: projectId,
              }
            } catch (error) {
              console.error(`Failed to generate content for ${filePath}:`, error)
              return {
                filename: filePath.split('/').pop() || 'file',
                path: filePath,
                content: `// File: ${filePath}\n// Content generation failed, will be updated soon...`,
                language: getLanguageFromPath(filePath),
                projectId: projectId,
              }
            }
          })
        )

        // Save batch to database
        await db.projectFile.createMany({
          data: projectFiles,
        })

        processedFiles += projectFiles.length
        console.log(`✅ Generated ${projectFiles.length} files (${processedFiles}/${fileStructure.length} total)`)
      })
    }

    // Step 3: Update project status to READY
    await step.run('finalize-project', async () => {
      await db.project.update({
        where: { id: projectId },
        data: { status: 'READY' }
      })
      console.log(`🎉 Project ${projectId} ready with ${processedFiles} files`)
    })

    return { 
      projectId, 
      filesGenerated: processedFiles,
      totalFiles: fileStructure.length,
      completed: true 
    }
  }
)

// Legacy vibe notification function (keeping for backwards compatibility)
export const onVibeCreated = inngest.createFunction(
  { id: 'vibe.created.notification' },
  { event: 'vibe/created' },
  async ({ event, step }) => {
    const { vibeId, authorId, mood } = event.data

    // Step 1: Log the vibe creation
    await step.run('log-vibe-creation', async () => {
      console.log(`📱 Legacy vibe event received: ${vibeId}, Author: ${authorId}, Mood: ${mood}`)
    })

    // This function is kept for backwards compatibility but doesn't process vibes
    // since the vibe system has been replaced by the project system
    return { 
      vibeId, 
      processed: false, 
      message: 'Vibe system has been replaced by project system'
    }
  }
)

// Helper function to determine file language
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()
  switch (ext) {
    case 'tsx':
    case 'ts': return 'typescript'
    case 'jsx':
    case 'js': return 'javascript'
    case 'css': return 'css'
    case 'json': return 'json'
    case 'md': return 'markdown'
    case 'html': return 'html'
    default: return 'text'
  }
}
