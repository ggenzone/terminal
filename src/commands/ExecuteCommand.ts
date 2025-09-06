import { BaseCommand } from './BaseCommand.js';
import { BashInterpreter } from '../core/BashInterpreter.js';
import type { ICommandContext, ICommandResult } from '../types/interfaces.js';

export class ExecuteCommand extends BaseCommand {
  name = './';
  description = 'Execute script files';
  usage = './<script>';

  async execute(context: ICommandContext): Promise<ICommandResult> {
    // This will be called when user types "./script.sh"
    const scriptName = context.args[0];
    
    if (!scriptName) {
      return {
        success: false,
        error: 'Usage: ./<script>',
        exitCode: 1
      };
    }

    // Remove ./ prefix if present
    const cleanName = scriptName.startsWith('./') ? scriptName.slice(2) : scriptName;

    // Check if file exists
    if (!context.fileSystem.exists(cleanName)) {
      return {
        success: false,
        error: `bash: ${cleanName}: No such file or directory`,
        exitCode: 1
      };
    }

    // Execute with bash interpreter
    const interpreter = new BashInterpreter(
      context.fileSystem,
      context.environment
    );

    const success = await interpreter.executeScript(cleanName, context);
    
    return {
      success,
      exitCode: success ? 0 : 1
    };
  }
}