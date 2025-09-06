import { BaseCommand } from './BaseCommand.js';
import type { ICommandContext, ICommandResult } from '../types/interfaces.js';

export class NanoCommand extends BaseCommand {
  name = 'nano';
  description = 'Simple line editor for creating and editing files';
  usage = 'nano [filename]';

  execute(context: ICommandContext): ICommandResult {
    const { args, fileSystem } = context;
    
    if (args.length === 0) {
      return this.error('Usage: nano <filename>');
    }

    const filename = args[0];
    
    // Show instructions for the simplified editor
    const output = [
      `--- Simplified Nano Editor for ${filename} ---`,
      '',
      'This is a simplified version. Use these commands:',
      '• nano-write <filename> "content" - Write content to file',
      '• nano-append <filename> "content" - Append content to file',
      '• nano-read <filename> - Show file content with line numbers',
      '',
      'Example:',
      '  nano-write myfile.txt "Hello World"',
      '  nano-append myfile.txt "Second line"',
      '',
      'Or use redirection:',
      '  echo "Hello World" > myfile.txt',
      '  echo "Second line" >> myfile.txt',
      ''
    ];

    // Show existing content if file exists
    if (fileSystem.exists(filename)) {
      const content = fileSystem.readFile(filename);
      if (content !== null) {
        output.push('Current content:');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          output.push(`${(index + 1).toString().padStart(3, ' ')}: ${line}`);
        });
        output.push('');
      }
    } else {
      output.push(`File "${filename}" does not exist. It will be created when you write to it.`);
      output.push('');
    }

    return this.success(output);
  }
}

export class NanoWriteCommand extends BaseCommand {
  name = 'nano-write';
  description = 'Write content to a file (nano helper)';
  usage = 'nano-write <filename> <content>';

  execute(context: ICommandContext): ICommandResult {
    const { args, fileSystem } = context;
    
    if (args.length < 2) {
      return this.error('Usage: nano-write <filename> <content>');
    }

    const filename = args[0];
    const content = args.slice(1).join(' ').replace(/^["']|["']$/g, ''); // Remove quotes
    
    const success = fileSystem.writeFile(filename, content);
    
    if (success) {
      return this.success([`File "${filename}" written successfully.`]);
    } else {
      return this.error(`Error: Could not write to file "${filename}".`);
    }
  }
}

export class NanoAppendCommand extends BaseCommand {
  name = 'nano-append';
  description = 'Append content to a file (nano helper)';
  usage = 'nano-append <filename> <content>';

  execute(context: ICommandContext): ICommandResult {
    const { args, fileSystem } = context;
    
    if (args.length < 2) {
      return this.error('Usage: nano-append <filename> <content>');
    }

    const filename = args[0];
    const newContent = args.slice(1).join(' ').replace(/^["']|["']$/g, ''); // Remove quotes
    
    // Get existing content
    const existingContent = fileSystem.readFile(filename) || '';
    const fullContent = existingContent + (existingContent ? '\n' : '') + newContent;
    
    const success = fileSystem.writeFile(filename, fullContent);
    
    if (success) {
      return this.success([`Content appended to "${filename}" successfully.`]);
    } else {
      return this.error(`Error: Could not append to file "${filename}".`);
    }
  }
}

export class NanoReadCommand extends BaseCommand {
  name = 'nano-read';
  description = 'Show file content with line numbers (nano helper)';
  usage = 'nano-read <filename>';

  execute(context: ICommandContext): ICommandResult {
    const { args, fileSystem } = context;
    
    if (args.length === 0) {
      return this.error('Usage: nano-read <filename>');
    }

    const filename = args[0];
    const content = fileSystem.readFile(filename);
    
    if (content === null) {
      return this.error(`nano-read: ${filename}: No such file or directory`);
    }

    const output = [`--- Content of ${filename} ---`];
    
    if (content === '') {
      output.push('(empty file)');
    } else {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        output.push(`${(index + 1).toString().padStart(3, ' ')}: ${line}`);
      });
    }
    
    output.push('--- End of file ---');
    return this.success(output);
  }
}
