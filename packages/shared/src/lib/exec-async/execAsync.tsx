import { exec } from 'child_process';
import { promisify } from 'util';

type ExecAsyncParams = [command: string];

type ExecResult = { stdout: string; stderr: string };

export const execAsync = async (...args: ExecAsyncParams): Promise<ExecResult> => {
  try {
    const { stdout, stderr } = await promisify(exec)(...args);

    return { stdout, stderr };
  } catch (error) {
    if (error instanceof Error) {
      return { stderr: error.message, stdout: '' };
    }

    return { stderr: String(error), stdout: '' };
  }
};
