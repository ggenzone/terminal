import { BaseCommand } from './BaseCommand.js';
import { BashInterpreter } from '../core/BashInterpreter.js';
import type { ICommandContext, ICommandResult } from '../types/interfaces.js';

export class BashCommand extends BaseCommand {
  name = 'bash';
  description = 'Execute bash scripts';
  usage = 'bash <script.sh>';

  async execute(context: ICommandContext): Promise<ICommandResult> {
    if (context.args.length === 0) {
      return {
        success: false,
        error: 'bash: usage: bash <script>',
        exitCode: 1
      };
    }

    const scriptName = context.args[0];
    
    // Check if file exists
    if (!context.fileSystem.exists(scriptName)) {
      return {
        success: false,
        error: `bash: ${scriptName}: No such file or directory`,
        exitCode: 1
      };
    }

    // Check if it's a file
    const node = context.fileSystem.getNode(scriptName);
    if (!node || node.type !== 'file') {
      return {
        success: false,
        error: `bash: ${scriptName}: is a directory`,
        exitCode: 1
      };
    }

    // Create interpreter and execute
    const interpreter = new BashInterpreter(
      context.fileSystem,
      context.environment
    );

    const success = await interpreter.executeScript(scriptName, context);
    
    return {
      success,
      exitCode: success ? 0 : 1
    };
  }

  getCompletions(args: string[], fileSystem: any): string[] {
    if (args.length === 1) {
      // Complete with .sh files in current directory
      const files = fileSystem.listDirectory();
      return files
        .filter((file: any) => 
          file.type === 'file' && 
          (file.name.endsWith('.sh') || file.name.endsWith('.bash'))
        )
        .map((file: any) => file.name);
    }
    return [];
  }
}