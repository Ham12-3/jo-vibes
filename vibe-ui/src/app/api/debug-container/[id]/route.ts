import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const containerId = params.id;
    
    if (!containerId) {
      return NextResponse.json({ error: 'Container ID required' }, { status: 400 });
    }

    // Get container logs with timestamps
    const { stdout: logs } = await execAsync(`docker logs --timestamps ${containerId}`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    // Get container inspect info
    const { stdout: inspect } = await execAsync(`docker inspect ${containerId}`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    // Get container status
    const { stdout: status } = await execAsync(`docker inspect ${containerId} --format='{{.State.Status}}'`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    // Get container restart count
    const { stdout: restartCount } = await execAsync(`docker inspect ${containerId} --format='{{.RestartCount}}'`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    // Get container exit code
    const { stdout: exitCode } = await execAsync(`docker inspect ${containerId} --format='{{.State.ExitCode}}'`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    return NextResponse.json({
      containerId,
      status: status.trim(),
      restartCount: parseInt(restartCount.trim()),
      exitCode: parseInt(exitCode.trim()),
      logs: logs.split('\n').filter((line: string) => line.trim()),
      inspect: JSON.parse(inspect)
    });

  } catch (error) {
    console.error('Failed to debug container:', error);
    return NextResponse.json(
      { error: `Failed to debug container: ${error}` },
      { status: 500 }
    );
  }
} 