# Background Jobs with Inngest - Vibe UI

This guide explains how background jobs work in Vibe UI using Inngest for reliable, scalable background processing.

## 🚀 Overview

Background jobs are essential for handling time-consuming tasks like:
- **AI Project Generation**: Processing user prompts and generating complete projects
- **Sandbox Creation**: Setting up Docker containers for project previews
- **File Processing**: Handling uploads and file synchronization
- **User Notifications**: Sending emails and notifications
- **Cleanup Tasks**: Removing expired resources

## 🏗️ Architecture

Based on the [background processing article](https://www.pedroalonso.net/blog/background-processing-nextjs-part-1/), we've implemented a modern approach using Inngest instead of traditional polling:

```
User Request → API Route → Inngest Event → Background Job → Database Update → Notification
```

### Key Components:

1. **Inngest Client** (`src/lib/inngest/client.ts`)
   - Handles event sending and job registration
   - Provides type safety for events

2. **Background Jobs** (`src/lib/inngest/simple-jobs.ts`)
   - Define job functions with step-by-step execution
   - Handle errors and retries automatically

3. **Job Trigger Service** (`src/lib/inngest/trigger.ts`)
   - Provides easy API to trigger background jobs
   - Handles error handling and logging

4. **Inngest API Route** (`src/app/api/inngest/route.ts`)
   - Handles job execution and webhook endpoints
   - Manages job lifecycle

## 📋 Available Background Jobs

### 1. AI Project Generation (`project.generate`)

**Purpose**: Generate complete projects from user prompts using AI

**Steps**:
1. Update project status to "PROCESSING"
2. Analyze user prompt with AI
3. Generate project structure
4. Create all project files
5. Save files to database
6. Update project status to "READY"
7. Trigger sandbox creation

**Usage**:
```typescript
import { backgroundJobService } from '@/lib/inngest/trigger'

await backgroundJobService.triggerProjectGeneration(
  projectId,
  userId,
  userPrompt
)
```

### 2. Sandbox Creation (`sandbox.create`)

**Purpose**: Create live preview environments for projects

**Steps**:
1. Try E2B sandbox first
2. Fall back to Docker sandbox if E2B fails
3. Update project with sandbox info
4. Send notification to user

**Usage**:
```typescript
await backgroundJobService.triggerSandboxCreation(
  projectId,
  userId,
  projectFiles,
  framework
)
```

### 3. User Notifications (`notification.send`)

**Purpose**: Send emails and notifications to users

**Steps**:
1. Get user and project information
2. Send appropriate notification based on type
3. Log notification for debugging

**Usage**:
```typescript
await backgroundJobService.triggerNotification(
  userId,
  'PROJECT_READY',
  projectId,
  sandboxUrl
)
```

### 4. Cleanup Jobs (`cleanup.expired`)

**Purpose**: Remove expired resources and old data

**Steps**:
1. Clean up expired E2B sandboxes
2. Clean up expired Docker containers
3. Remove old database records

**Usage**:
```typescript
await backgroundJobService.triggerCleanup()
```

## 🔧 Setup and Configuration

### 1. Environment Variables

Add to your `.env` file:

```bash
# Inngest Configuration
INNGEST_SIGNING_KEY=your_inngest_signing_key
INNGEST_EVENT_KEY=your_inngest_event_key

# Optional: Inngest Dev Server
INNGEST_DEV_SERVER_URL=http://localhost:8288
```

### 2. Install Dependencies

```bash
npm install inngest
```

### 3. Deploy Inngest Functions

Your Inngest functions are automatically deployed via the API route at `/api/inngest`.

## 🎯 Benefits of This Approach

### ✅ **Reliability**
- **Automatic Retries**: Failed jobs are retried automatically
- **Error Handling**: Comprehensive error handling and logging
- **Durability**: Jobs persist even if the server restarts

### ✅ **Scalability**
- **Serverless**: Jobs run on Inngest's infrastructure
- **Parallel Processing**: Multiple jobs can run simultaneously
- **Resource Management**: Automatic resource allocation

### ✅ **Developer Experience**
- **Type Safety**: Full TypeScript support
- **Step-by-Step Execution**: Easy to debug and monitor
- **Visual Dashboard**: Inngest provides a web UI for monitoring

### ✅ **Production Ready**
- **Monitoring**: Built-in job monitoring and alerting
- **Logging**: Comprehensive logging for debugging
- **Scheduling**: Support for scheduled jobs

## 🔄 Job Lifecycle

### 1. **Event Triggered**
```typescript
// User creates a project
await backgroundJobService.triggerProjectGeneration(
  projectId,
  userId,
  prompt
)
```

### 2. **Job Execution**
```typescript
// Inngest executes the job step by step
export const generateProjectJob = inngest.createFunction(
  { id: "generate-ai-project", name: "Generate AI Project" },
  { event: "project.generate" },
  async ({ event, step }) => {
    // Step 1: Update status
    await step.run("update-status", async () => {
      await db.project.update({...})
    })
    
    // Step 2: Process with AI
    const analysis = await step.run("analyze-prompt", async () => {
      return await aiProcessor.analyzePrompt(userPrompt)
    })
    
    // ... more steps
  }
)
```

### 3. **Job Completion**
- Database is updated
- User is notified
- Next job is triggered (if needed)

## 📊 Monitoring and Debugging

### Inngest Dashboard

Access the Inngest dashboard to monitor jobs:
- **Job Status**: See which jobs are running, completed, or failed
- **Execution History**: View detailed logs for each job
- **Performance Metrics**: Monitor job duration and success rates

### Local Development

For local development, you can run the Inngest dev server:

```bash
npx inngest-cli@latest dev
```

This provides a local dashboard at `http://localhost:8288`.

## 🚨 Error Handling

### Automatic Retries

Jobs automatically retry on failure with exponential backoff:
- **First retry**: 1 minute delay
- **Second retry**: 2 minutes delay
- **Third retry**: 4 minutes delay

### Manual Error Handling

```typescript
await step.run("create-sandbox", async () => {
  try {
    return await e2bService.createProjectSandbox({...})
  } catch (error) {
    console.log('Sandbox creation failed:', error)
    return null // Job continues with fallback
  }
})
```

## 🔄 Job Chaining

Jobs can trigger other jobs, creating workflows:

```typescript
// Project generation triggers sandbox creation
await step.sendEvent({
  name: "sandbox.create",
  data: { projectId, userId, files, framework }
})

// Sandbox creation triggers notification
await step.sendEvent({
  name: "notification.send",
  data: { userId, type: 'PROJECT_READY', projectId }
})
```

## 📈 Performance Optimization

### 1. **Batch Processing**
```typescript
// Process files in batches
const batchSize = 10
for (let i = 0; i < projectFiles.length; i += batchSize) {
  const batch = projectFiles.slice(i, i + batchSize)
  await step.run(`save-batch-${i}`, async () => {
    await db.projectFile.createMany({ data: batch })
  })
}
```

### 2. **Parallel Execution**
```typescript
// Run independent steps in parallel
const [analysis, user] = await Promise.all([
  step.run("analyze-prompt", async () => aiProcessor.analyzePrompt(prompt)),
  step.run("get-user", async () => db.user.findUnique({ where: { id: userId } }))
])
```

### 3. **Resource Management**
```typescript
// Limit file generation for performance
for (const filePath of fileStructure.slice(0, 5)) { // Limit to 5 files
  const result = await aiProcessor.generateFileContentEnhanced(filePath, analysis)
  files.push({ path: filePath, content: result.content })
}
```

## 🔒 Security Considerations

### 1. **Input Validation**
```typescript
// Validate all inputs before processing
if (!prompt || prompt.length > 1000) {
  throw new Error('Invalid prompt')
}
```

### 2. **User Authorization**
```typescript
// Ensure users can only access their own projects
const project = await db.project.findFirst({
  where: { id: projectId, userId }
})
if (!project) throw new Error('Project not found')
```

### 3. **Resource Limits**
```typescript
// Limit job execution time
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Job timeout')), 5 * 60 * 1000)
})
```

## 🎯 Best Practices

### 1. **Idempotency**
Make jobs safe to run multiple times:
```typescript
await db.projectFile.upsert({
  where: { projectId_path: { projectId, path: file.path } },
  update: { content: file.content },
  create: { projectId, path: file.path, content: file.content }
})
```

### 2. **Step Naming**
Use descriptive step names for better debugging:
```typescript
await step.run("analyze-user-prompt-with-ai", async () => {
  return await aiProcessor.analyzePrompt(userPrompt)
})
```

### 3. **Error Context**
Provide context in error messages:
```typescript
catch (error) {
  console.error(`Failed to create sandbox for project ${projectId}:`, error)
  throw error
}
```

### 4. **Monitoring**
Add monitoring for critical operations:
```typescript
await step.run("create-sandbox", async () => {
  const startTime = Date.now()
  const result = await e2bService.createProjectSandbox({...})
  console.log(`Sandbox created in ${Date.now() - startTime}ms`)
  return result
})
```

## 🔮 Future Enhancements

### 1. **Advanced Scheduling**
```typescript
// Schedule periodic cleanup
await inngest.send({
  name: "cleanup.expired",
  data: {},
  ts: Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now
})
```

### 2. **Job Dependencies**
```typescript
// Wait for previous job to complete
await step.waitForEvent({
  event: "project.analysis.complete",
  timeout: "5m"
})
```

### 3. **Custom Retry Logic**
```typescript
// Custom retry configuration
export const generateProjectJob = inngest.createFunction(
  { 
    id: "generate-ai-project",
    name: "Generate AI Project",
    retries: 3,
    retryDelay: "1m"
  },
  // ... rest of function
)
```

## 📚 Additional Resources

- [Inngest Documentation](https://www.inngest.com/docs)
- [Background Processing Article](https://www.pedroalonso.net/blog/background-processing-nextjs-part-1/)
- [Next.js Background Jobs](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)

## 🤝 Contributing

When adding new background jobs:

1. **Define the job function** in `src/lib/inngest/simple-jobs.ts`
2. **Add trigger method** in `src/lib/inngest/trigger.ts`
3. **Update types** in `src/lib/inngest/client.ts`
4. **Add tests** for the job function
5. **Update documentation** with usage examples

This background job system provides a robust, scalable foundation for handling complex workflows in Vibe UI! 🚀 