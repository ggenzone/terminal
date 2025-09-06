import type { ICommandProcessor, ICommand, ICommandContext, ICommandResult } from '../types/interfaces.js';

export class CommandProcessor implements ICommandProcessor {
  private commands: Map<string, ICommand> = new Map();
  private aliases: Map<string, string> = new Map();

  registerCommand(command: ICommand): void {
    this.commands.set(command.name.toLowerCase(), command);
    
    // Register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      });
    }
  }

  unregisterCommand(name: string): void {
    const command = this.commands.get(name.toLowerCase());
    if (command) {
      // Remove aliases
      if (command.aliases) {
        command.aliases.forEach(alias => {
          this.aliases.delete(alias.toLowerCase());
        });
      }
      this.commands.delete(name.toLowerCase());
    }
  }

  async executeCommand(input: string, context: Omit<ICommandContext, 'args' | 'flags'>): Promise<ICommandResult> {
    if (!input.trim()) {
      return { success: true, exitCode: 0 };
    }

    const { command: commandName, args, flags } = this.parseInput(input);
    
    // Check for alias
    const actualCommandName = this.aliases.get(commandName.toLowerCase()) || commandName.toLowerCase();
    const command = this.commands.get(actualCommandName);

    if (!command) {
      return {
        success: false,
        error: `bash: ${commandName}: command not found`,
        exitCode: 127
      };
    }

    try {
      const fullContext: ICommandContext = {
        ...context,
        args,
        flags
      };

      const result = await Promise.resolve(command.execute(fullContext));
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        exitCode: 1
      };
    }
  }

  getCommand(name: string): ICommand | undefined {
    const actualName = this.aliases.get(name.toLowerCase()) || name.toLowerCase();
    return this.commands.get(actualName);
  }

  getAllCommands(): ICommand[] {
    return Array.from(this.commands.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  parseInput(input: string): { command: string; args: string[]; flags: Map<string, string | boolean> } {
    const tokens = this.tokenize(input);
    if (tokens.length === 0) {
      return { command: '', args: [], flags: new Map() };
    }

    const command = tokens[0];
    const args: string[] = [];
    const flags = new Map<string, string | boolean>();

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.startsWith('--')) {
        // Long flag: --flag or --flag=value
        const equalIndex = token.indexOf('=');
        if (equalIndex > 0) {
          const flagName = token.substring(2, equalIndex);
          const flagValue = token.substring(equalIndex + 1);
          flags.set(flagName, flagValue);
        } else {
          const flagName = token.substring(2);
          // Check if next token is a value for this flag
          if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
            flags.set(flagName, tokens[i + 1]);
            i++; // Skip next token as it's the flag value
          } else {
            flags.set(flagName, true);
          }
        }
      } else if (token.startsWith('-') && token.length > 1) {
        // Short flag(s): -f or -abc
        const flagChars = token.substring(1);
        for (let j = 0; j < flagChars.length; j++) {
          const flagChar = flagChars[j];
          if (j === flagChars.length - 1 && i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
            // Last flag in group might have a value
            flags.set(flagChar, tokens[i + 1]);
            i++; // Skip next token as it's the flag value
          } else {
            flags.set(flagChar, true);
          }
        }
      } else {
        // Regular argument
        args.push(token);
      }
    }

    return { command, args, flags };
  }

  getCompletions(input: string): string[] {
    const { command, args } = this.parseInput(input);
    
    if (args.length === 0 && !input.endsWith(' ')) {
      // Completing command name
      const matchingCommands = Array.from(this.commands.keys())
        .filter(name => name.startsWith(command.toLowerCase()))
        .concat(
          Array.from(this.aliases.keys())
            .filter(alias => alias.startsWith(command.toLowerCase()))
        );
      
      return [...new Set(matchingCommands)].sort();
    } else {
      // Let the specific command handle argument completion
      const actualCommandName = this.aliases.get(command.toLowerCase()) || command.toLowerCase();
      const commandObj = this.commands.get(actualCommandName);
      
      if (commandObj && 'getCompletions' in commandObj) {
        return (commandObj as any).getCompletions(args);
      }
      
      return [];
    }
  }

  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        continue;
      }

      if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
        continue;
      }

      if (!inQuotes && char === ' ') {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }
}
