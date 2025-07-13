import { inngest } from './client'
import { db } from '@/lib/db'
import { aiProcessor } from '@/lib/ai-processor'
import type { GenerationResult, CodeQuality } from '@/lib/ai-processor'

// Type definition for project file
type ProjectFile = {
  filename: string
  path: string
  content: string
  language: string
  projectId: string
  metadata?: {
    qualityScore: number
    generationTime: number
    iterations: number
    model: string
    accessibility: number
    performance: number
    interactivity: number
  }
}

// Enhanced background function to generate project files with AI
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
      console.log(`📁 Started enhanced AI generation for project ${projectId}`)
    })

    // Step 2: Generate files with enhanced multi-pass system
    const batchSize = 3 // Smaller batches for better quality
    let processedFiles = 0
    let totalQualityScore = 0
    const generationResults: GenerationResult[] = []
    
    for (let i = 0; i < fileStructure.length; i += batchSize) {
      const batch = fileStructure.slice(i, i + batchSize)
      
      await step.run(`generate-enhanced-batch-${Math.floor(i / batchSize)}`, async () => {
        const batchResults = await Promise.allSettled(
          batch.map(async (filePath: string) => {
            try {
              console.log(`🔄 Generating ${filePath} with multi-pass system...`)
              
                             // Build context for each file
               const context = {
                 relatedFiles: fileStructure.filter((f: string) => f !== filePath).slice(0, 5),
                 projectContext: `Part of ${analysisData.projectName} - ${analysisData.description}`
               }
              
              // Use enhanced generation system
              const result = await aiProcessor.generateFileContentEnhanced(
                filePath, 
                analysisData,
                context
              )
              
              generationResults.push(result)
              totalQualityScore += calculateOverallQuality(result.quality)
              
              console.log(`✅ Generated ${filePath} - Quality: ${calculateOverallQuality(result.quality)}% - Time: ${result.metadata.generationTime}ms`)
              
              return {
                filename: filePath.split('/').pop() || 'file',
                path: filePath,
                content: result.content,
                language: getLanguageFromPath(filePath),
                projectId: projectId,
                // Store quality metadata
                metadata: {
                  qualityScore: calculateOverallQuality(result.quality),
                  generationTime: result.metadata.generationTime,
                  iterations: result.metadata.iterations,
                  model: result.metadata.model,
                  accessibility: result.quality.accessibilityScore,
                  performance: result.quality.performanceScore,
                  interactivity: result.quality.interactivityScore
                }
              }
            } catch (error) {
              console.error(`❌ Failed to generate ${filePath}:`, error)
              return {
                filename: filePath.split('/').pop() || 'file',
                path: filePath,
                content: `// File: ${filePath}\n// Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}\n// This will be regenerated automatically...`,
                language: getLanguageFromPath(filePath),
                projectId: projectId,
                metadata: {
                  qualityScore: 0,
                  generationTime: 0,
                  iterations: 0,
                  model: 'error',
                  accessibility: 0,
                  performance: 0,
                  interactivity: 0
                }
              }
            }
          })
        )

                 // Extract successful results
         const projectFiles = batchResults
           .filter((result): result is PromiseFulfilledResult<ProjectFile> => result.status === 'fulfilled')
           .map(result => result.value)

        // Save batch to database with enhanced metadata
        await db.projectFile.createMany({
          data: projectFiles.map(file => ({
            filename: file.filename,
            path: file.path,
            content: file.content,
            language: file.language,
            projectId: file.projectId,
          })),
        })

        processedFiles += projectFiles.length
        
        // Log batch completion with quality metrics
        const batchQuality = projectFiles.reduce((sum, file) => sum + (file.metadata?.qualityScore || 0), 0) / projectFiles.length
        console.log(`📊 Batch ${Math.floor(i / batchSize)} complete: ${projectFiles.length} files, avg quality: ${batchQuality.toFixed(1)}%`)
      })
    }

    // Step 3: Generate quality report and finalize
    await step.run('finalize-with-quality-report', async () => {
      const averageQuality = totalQualityScore / generationResults.length
      const totalGenerationTime = generationResults.reduce((sum, r) => sum + r.metadata.generationTime, 0)
      
      // Update project with quality metrics
      await db.project.update({
        where: { id: projectId },
        data: { 
          status: 'READY',
          // Store quality metadata in project if schema supports it
          // This would require updating the Prisma schema
        }
      })

      // Log comprehensive generation report
      console.log(`🎉 Project ${projectId} completed successfully!`)
      console.log(`📊 Quality Report:`)
      console.log(`   - Files Generated: ${processedFiles}/${fileStructure.length}`)
      console.log(`   - Average Quality Score: ${averageQuality.toFixed(1)}%`)
      console.log(`   - Total Generation Time: ${totalGenerationTime}ms`)
      console.log(`   - Average Time per File: ${(totalGenerationTime / processedFiles).toFixed(0)}ms`)
      
      // Quality breakdown
      const qualityBreakdown = generationResults.reduce((acc, result) => {
        acc.accessibility += result.quality.accessibilityScore
        acc.performance += result.quality.performanceScore
        acc.interactivity += result.quality.interactivityScore
        return acc
      }, { accessibility: 0, performance: 0, interactivity: 0 })

      console.log(`   - Accessibility: ${(qualityBreakdown.accessibility / generationResults.length).toFixed(1)}%`)
      console.log(`   - Performance: ${(qualityBreakdown.performance / generationResults.length).toFixed(1)}%`)
      console.log(`   - Interactivity: ${(qualityBreakdown.interactivity / generationResults.length).toFixed(1)}%`)
    })

    return { 
      projectId, 
      filesGenerated: processedFiles,
      totalFiles: fileStructure.length,
      averageQuality: totalQualityScore / generationResults.length,
      totalGenerationTime: generationResults.reduce((sum, r) => sum + r.metadata.generationTime, 0),
      completed: true,
      qualityReport: {
        accessibility: generationResults.reduce((sum, r) => sum + r.quality.accessibilityScore, 0) / generationResults.length,
        performance: generationResults.reduce((sum, r) => sum + r.quality.performanceScore, 0) / generationResults.length,
        interactivity: generationResults.reduce((sum, r) => sum + r.quality.interactivityScore, 0) / generationResults.length,
      }
    }
  }
)

// Enhanced quality calculation function
function calculateOverallQuality(quality: CodeQuality): number {
  if (!quality) return 0
  
  const scores = [
    quality.syntaxValid ? 100 : 0,
    quality.typeScriptCompliant ? 100 : 0,
    quality.accessibilityScore || 0,
    quality.performanceScore || 0,
    quality.interactivityScore || 0,
    quality.responsiveDesign ? 100 : 0,
    quality.errorHandling ? 100 : 0,
  ]
  
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

// This function fires whenever you send an event named "demo/hello".
export const helloWorld = inngest.createFunction(
  { id: 'hello.world' },
  { event: 'demo/hello' },
  async ({ event, step }) => {
    // Log something or run any side-effect you like
    await step.run('log', () => {
      console.log('👋 Hello from Enhanced Inngest! Payload:', event.data)
    })

    // Return something small just for demonstration
    return { message: 'Hello World from Enhanced Inngest', data: event.data }
  }
)

// Legacy vibe notification function (keeping for backwards compatibility)
export const onVibeCreated = inngest.createFunction(
  { id: 'vibe.created.notification' },
  { event: 'vibe/created' },
  async ({ event, step }) => {
    const { vibeId, authorId } = event.data

    await step.run('log-vibe-creation', async () => {
      console.log(`🎉 New vibe created: ${vibeId} by user ${authorId}`)
    })

    return { vibeId, processed: true }
  }
)

// Helper function to determine language from file path
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'css':
      return 'css'
    case 'scss':
    case 'sass':
      return 'scss'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    case 'html':
      return 'html'
    case 'py':
      return 'python'
    default:
      return 'plaintext'
  }
}
