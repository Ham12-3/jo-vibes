'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTRPC } from '@/trpc/client'

export function InngestTest() {
  const [result, setResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const trpc = useTRPC()

  const testBackgroundJob = useMutation(
    trpc.vibe.testBackgroundJob.mutationOptions()
  )

  const handleTest = async () => {
    setIsLoading(true)
    setResult('🔄 Triggering background job...')
    
    try {
      const data = await testBackgroundJob.mutateAsync({
        testData: `Test at ${new Date().toLocaleTimeString()}`
      })
      setResult(`✅ Success: ${data.message} at ${data.timestamp}`)
    } catch (error: unknown) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>🔧 Inngest Background Jobs Test</CardTitle>
        <CardDescription>
          Test the tRPC + Inngest integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleTest} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? '⏳ Testing...' : '🚀 Test Background Job'}
        </Button>
        
        {result && (
          <div className="p-3 rounded-md bg-muted text-sm">
            {result}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <p>This will:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Trigger a tRPC mutation</li>
            <li>Emit an Inngest event</li>
            <li>Run background processing steps</li>
            <li>Check the console/logs for detailed output</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 