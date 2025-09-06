import type { IFileSystem, ICommandContext } from '../types/interfaces.js';

export class BashInterpreter {
  private fileSystem: IFileSystem;
  private environment: Map<string, string>;

  constructor(fileSystem: IFileSystem, environment: Map<string, string>) {
    this.fileSystem = fileSystem;
    this.environment = environment;
  }

  async executeScript(scriptPath: string, context: ICommandContext): Promise<boolean> {
    const content = this.fileSystem.readFile(scriptPath);
    if (!content) {
      context.terminal.addOutput(`bash: ${scriptPath}: No such file or directory`, 'error-line');
      return false;
    }

    // Check if it's a bash script
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return true;

    // Check shebang
    if (lines[0].startsWith('#!')) {
      const shebang = lines[0].slice(2).trim();
      if (!shebang.includes('bash') && !shebang.includes('sh')) {
        context.terminal.addOutput(`bash: ${scriptPath}: cannot execute binary file`, 'error-line');
        return false;
      }
    }

    // Execute each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;

      // Execute the command
      if (!await this.executeScriptLine(line, context)) {
        return false;
      }
    }

    return true;
  }

  private async executeScriptLine(line: string, context: ICommandContext): Promise<boolean> {
    // Simple command parsing
    const parts = this.parseCommand(line);
    if (parts.length === 0) return true;

    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'echo':
        return this.executeEcho(args, context);
      
      case 'export':
        return this.executeExport(args, context);
      
      case 'cd':
        return this.executeCd(args, context);
      
      case 'ls':
        return this.executeLs(args, context);
      
      default:
        // Try to execute as external command through command processor
        context.terminal.addOutput(`bash: ${command}: command not found`, 'error-line');
        return false;
    }
  }

  private executeEcho(args: string[], context: ICommandContext): boolean {
    const output = args.join(' ')
      .replace(/\$(\w+)/g, (_match, varName) => {
        return this.environment.get(varName) || '';
      });
    
    context.terminal.addOutput(output, 'output-line');
    return true;
  }

  private executeExport(args: string[], _context: ICommandContext): boolean {
    for (const arg of args) {
      const [key, value] = arg.split('=', 2);
      if (key && value) {
        this.environment.set(key, value);
      }
    }
    return true;
  }

  private executeCd(args: string[], _context: ICommandContext): boolean {
    const path = args[0] || '~';
    return this.fileSystem.setCurrentDirectory(path);
  }

  private executeLs(_args: string[], context: ICommandContext): boolean {
    const files = this.fileSystem.listDirectory();
    files.forEach(file => {
      const prefix = file.type === 'directory' ? 'd' : '-';
      const permissions = file.permissions || 'rw-r--r--';
      const size = file.size?.toString().padStart(8) || '0';
      const name = file.type === 'directory' ? `\x1b[34m${file.name}\x1b[0m` : file.name;
      
      context.terminal.addOutput(`${prefix}${permissions} ${size} ${name}`, 'output-line');
    });
    return true;
  }

  private parseCommand(line: string): string[] {
    // Simple parsing - can be enhanced for complex cases
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }
}