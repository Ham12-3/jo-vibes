import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get latest container ID
    const { stdout } = await execAsync('docker ps -a --filter "name=sandbox-" --format "{{.Names}}" --latest', {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });
    
    const containerId = stdout.trim();
    
    if (!containerId) {
      return NextResponse.json({ error: 'No sandbox containers found' }, { status: 404 });
    }

    // Get basic container info
    const { stdout: status } = await execAsync(`docker inspect ${containerId} --format='{{.State.Status}}'`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    const { stdout: restartCount } = await execAsync(`docker inspect ${containerId} --format='{{.RestartCount}}'`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    return NextResponse.json({
      containerId,
      status: status.trim(),
      restartCount: parseInt(restartCount.trim()),
      debugUrl: `/api/debug-container/${containerId}`
    });

  } catch (error) {
    console.error('Failed to get latest container:', error);
    return NextResponse.json(
      { error: `Failed to get latest container: ${error}` },
      { status: 500 }
    );
  }
} 