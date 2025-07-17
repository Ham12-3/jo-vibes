export interface CodeSandboxPIDAConfig {
  baseUrl: string
  apiKey?: string
  timeout?: number
}

export interface SandboxDefinition {
  files: Record<string, { content: string }>
  template: string
  title?: string
  description?: string
}

export class CodeSandboxPIDA {
  private config: CodeSandboxPIDAConfig

  constructor(config: CodeSandboxPIDAConfig) {
    this.config = {
      timeout: 30000,
      ...config
    }
  }

  async createSandbox(definition: SandboxDefinition): Promise<string | null> {
    try {
      console.log('🚀 Creating sandbox via CodeSandbox PIDA...')
      
      const response = await fetch(`${this.config.baseUrl}/api/v1/sandboxes/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(definition),
        signal: AbortSignal.timeout(this.config.timeout!)
      })

      if (response.ok) {
        const result = await response.json()
        const sandboxUrl = `${this.config.baseUrl}/s/${result.sandbox_id}`
        console.log('✅ CodeSandbox PIDA created:', sandboxUrl)
        return sandboxUrl
      } else {
        console.error('❌ CodeSandbox PIDA failed:', response.status, await response.text())
        return null
      }
    } catch (error) {
      console.error('❌ CodeSandbox PIDA error:', error)
      return null
    }
  }

  async createSandboxViaDefine(definition: SandboxDefinition): Promise<string | null> {
    try {
      console.log('🔄 Creating sandbox via define endpoint...')
      
      const formData = new FormData()
      formData.append('parameters', JSON.stringify(definition))
      
      const response = await fetch(`${this.config.baseUrl}/api/v1/sandboxes/define`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        signal: AbortSignal.timeout(this.config.timeout!)
      })

      if (response.ok) {
        const result = await response.json()
        const sandboxUrl = `${this.config.baseUrl}/s/${result.sandbox_id}`
        console.log('✅ CodeSandbox PIDA define created:', sandboxUrl)
        return sandboxUrl
      } else {
        console.error('❌ CodeSandbox PIDA define failed:', response.status, await response.text())
        return null
      }
    } catch (error) {
      console.error('❌ CodeSandbox PIDA define error:', error)
      return null
    }
  }

  async getSandboxInfo(sandboxId: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/sandboxes/${sandboxId}`, {
        headers: {
          'Accept': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        signal: AbortSignal.timeout(this.config.timeout!)
      })

      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (error) {
      console.error('❌ Error getting sandbox info:', error)
      return null
    }
  }
}

// Default PIDA configuration
export const defaultPIDAConfig: CodeSandboxPIDAConfig = {
  baseUrl: process.env.CODESANDBOX_PIDA_URL || 'https://codesandbox.io',
  apiKey: process.env.CODESANDBOX_API_KEY,
  timeout: 30000
}

// Singleton instance
export const codesandboxPIDA = new CodeSandboxPIDA(defaultPIDAConfig) 