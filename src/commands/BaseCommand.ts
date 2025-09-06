import type { ICommand, ICommandContext, ICommandResult } from '../types/interfaces.js';

export abstract class BaseCommand implements ICommand {
  abstract name: string;
  abstract description: string;
  abstract usage: string;
  aliases?: string[];

  abstract execute(context: ICommandContext): Promise<ICommandResult> | ICommandResult;

  protected success(output?: string[]): ICommandResult {
    return {
      success: true,
      output: output || [],
      exitCode: 0
    };
  }

  protected error(message: string, exitCode: number = 1): ICommandResult {
    return {
      success: false,
      error: message,
      exitCode
    };
  }

  protected validateArgs(args: string[], minArgs: number, maxArgs?: number): ICommandResult | null {
    if (args.length < minArgs) {
      return this.error(`${this.name}: missing arguments\nUsage: ${this.usage}`);
    }
    
    if (maxArgs !== undefined && args.length > maxArgs) {
      return this.error(`${this.name}: too many arguments\nUsage: ${this.usage}`);
    }
    
    return null;
  }

  protected hasFlag(flags: Map<string, string | boolean>, flag: string): boolean {
    return flags.has(flag) && flags.get(flag) === true;
  }

  protected getFlagValue(flags: Map<string, string | boolean>, flag: string): string | null {
    const value = flags.get(flag);
    return typeof value === 'string' ? value : null;
  }
}
