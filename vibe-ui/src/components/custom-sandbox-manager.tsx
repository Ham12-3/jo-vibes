'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Square, RotateCcw, ExternalLink, Terminal } from 'lucide-react';

interface SandboxStatus {
  id: string;
  status: 'CREATING' | 'RUNNING' | 'STOPPED' | 'ERROR';
  url: string | null;
  port: number | null;
  containerId: string | null;
  logs: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;
  name: string;
  framework: string | null;
  status: string;
}

export function CustomSandboxManager({ projects }: { projects: Project[] }) {
  const [sandboxes, setSandboxes] = useState<SandboxStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<string>('nextjs');
  const [customFiles, setCustomFiles] = useState<string>('');
  const [error, setError] = useState<string>('');

  const frameworks = [
    { value: 'nextjs', label: 'Next.js' },
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue.js' },
    { value: 'vanilla', label: 'Vanilla JS' }
  ];

  // Load existing sandboxes
  useEffect(() => {
    loadSandboxes();
  }, []);

  const loadSandboxes = async () => {
    try {
      const response = await fetch('/api/sandbox/list');
      if (response.ok) {
        const data = await response.json();
        setSandboxes(data.sandboxes || []);
      }
    } catch (error) {
      console.error('Failed to load sandboxes:', error);
    }
  };

  const createSandbox = async () => {
    if (!selectedProject) {
      setError('Please select a project');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Parse custom files
      const files: Record<string, string> = {};
      if (customFiles.trim()) {
        try {
          const parsed = JSON.parse(customFiles);
          Object.assign(files, parsed);
        } catch {
          setError('Invalid JSON format for custom files');
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/sandbox/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject,
          framework: selectedFramework,
          files
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Sandbox created:', data);
        await loadSandboxes();
        setSelectedProject('');
        setCustomFiles('');
      } else {
        setError(data.error || 'Failed to create sandbox');
      }
    } catch (error) {
      setError('Failed to create sandbox');
      console.error('Create sandbox error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopSandbox = async (sandboxId: string) => {
    try {
      const response = await fetch(`/api/sandbox/stop/${sandboxId}`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadSandboxes();
      } else {
        setError('Failed to stop sandbox');
      }
    } catch (error) {
      setError('Failed to stop sandbox');
      console.error('Stop sandbox error:', error);
    }
  };

  const restartSandbox = async (sandboxId: string) => {
    try {
      const response = await fetch(`/api/sandbox/restart/${sandboxId}`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadSandboxes();
      } else {
        setError('Failed to restart sandbox');
      }
    } catch (error) {
      setError('Failed to restart sandbox');
      console.error('Restart sandbox error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-500';
      case 'CREATING': return 'bg-yellow-500';
      case 'STOPPED': return 'bg-gray-500';
      case 'ERROR': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING': return <Play className="w-4 h-4" />;
      case 'CREATING': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'STOPPED': return <Square className="w-4 h-4" />;
      case 'ERROR': return <Terminal className="w-4 h-4" />;
      default: return <Square className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Sandbox</CardTitle>
          <CardDescription>
            Create a new Docker-based sandbox for your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="framework">Framework</Label>
              <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frameworks.map((framework) => (
                    <SelectItem key={framework.value} value={framework.value}>
                      {framework.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="files">Custom Files (JSON)</Label>
            <Textarea
              id="files"
              placeholder='{"src/App.js": "function App() { return <div>Hello World</div> }"}'
              value={customFiles}
              onChange={(e) => setCustomFiles(e.target.value)}
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Optional: Provide custom files as JSON with filename as key and content as value
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={createSandbox} 
            disabled={loading || !selectedProject}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Sandbox...
              </>
            ) : (
              'Create Sandbox'
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Sandboxes</h3>
        
        {sandboxes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No sandboxes created yet. Create your first sandbox above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sandboxes.map((sandbox) => (
              <Card key={sandbox.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(sandbox.status)}
                      <CardTitle className="text-lg">{sandbox.id}</CardTitle>
                      <Badge className={getStatusColor(sandbox.status)}>
                        {sandbox.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      {sandbox.status === 'RUNNING' && sandbox.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(sandbox.url!, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      )}
                      {sandbox.status === 'RUNNING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => stopSandbox(sandbox.id)}
                        >
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                      )}
                      {sandbox.status === 'STOPPED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restartSandbox(sandbox.id)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restart
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Port:</span> {sandbox.port || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Container:</span> {sandbox.containerId?.substring(0, 12) || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(sandbox.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  {sandbox.logs.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Recent Logs</Label>
                      <div className="mt-2 p-3 bg-muted rounded-md max-h-32 overflow-y-auto">
                        <pre className="text-xs">
                          {sandbox.logs.slice(-5).join('\n')}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 