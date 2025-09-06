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

    const { command: commandName, args, flags, redirectToFile, redirectMode } = this.parseInput(input);
    
    // Check for alias
    const actualCommandName = this.aliases.get(commandName.toLowerCase()) || commandName.toLowerCase();
    const targetCommand = this.commands.get(actualCommandName);

    if (!targetCommand) {
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

      const result = await Promise.resolve(targetCommand.execute(fullContext));
      
      // Handle redirection if specified
      if (redirectToFile && result.success && result.output) {
        const content = result.output.join('\n');
        const writeSuccess = redirectMode === 'append' 
          ? this.appendToFile(context.fileSystem, redirectToFile, content)
          : this.writeToFile(context.fileSystem, redirectToFile, content);
        
        if (writeSuccess) {
          // Don't show output in terminal, it was redirected to file
          return { success: true, exitCode: 0 };
        } else {
          return {
            success: false,
            error: `bash: ${redirectToFile}: cannot redirect output`,
            exitCode: 1
          };
        }
      }
      
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

  parseInput(input: string): { command: string; args: string[]; flags: Map<string, string | boolean>; redirectToFile?: string; redirectMode?: 'write' | 'append' } {
    const tokens = this.tokenize(input);
    if (tokens.length === 0) {
      return { command: '', args: [], flags: new Map() };
    }

    let command = tokens[0];
    const args: string[] = [];
    const flags = new Map<string, string | boolean>();
    let redirectToFile: string | undefined;
    let redirectMode: 'write' | 'append' | undefined;

    // Special handling for ./script patterns
    if (command.startsWith('./') && command.length > 2) {
      // Split "./script.sh" into "./" and "script.sh"
      const scriptName = command.slice(2);
      command = './';
      args.push(scriptName);
      
      // Process remaining tokens starting from index 1
      for (let i = 1; i < tokens.length; i++) {
        i = this.processToken(tokens[i], tokens, i, args, flags, (file, mode) => {
          redirectToFile = file;
          redirectMode = mode;
        });
      }
      
      return { command, args, flags, redirectToFile, redirectMode };
    }

    // Normal processing for other commands
    for (let i = 1; i < tokens.length; i++) {
      i = this.processToken(tokens[i], tokens, i, args, flags, (file, mode) => {
        redirectToFile = file;
        redirectMode = mode;
      });
    }

    return { command, args, flags, redirectToFile, redirectMode };
  }

  private processToken(
    token: string, 
    tokens: string[], 
    currentIndex: number, 
    args: string[], 
    flags: Map<string, string | boolean>,
    onRedirect?: (file: string, mode: 'write' | 'append') => void
  ): number {
    let i = currentIndex;
    
    // Check for redirection operators
    if (token === '>' || token === '>>') {
      const mode = token === '>>' ? 'append' : 'write';
      if (i + 1 < tokens.length && onRedirect) {
        onRedirect(tokens[i + 1], mode);
        return i + 1; // Skip the filename token
      }
      return i;
    }
    
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
    
    return i;
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

  private writeToFile(fileSystem: any, filename: string, content: string): boolean {
    try {
      return fileSystem.writeFile(filename, content);
    } catch (error) {
      return false;
    }
  }

  private appendToFile(fileSystem: any, filename: string, content: string): boolean {
    try {
      // Try to read existing content first
      const existingContent = fileSystem.readFile(filename) || '';
      const newContent = existingContent + (existingContent ? '\n' : '') + content;
      return fileSystem.writeFile(filename, newContent);
    } catch (error) {
      return false;
    }
  }
}
