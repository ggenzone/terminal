import { BaseCommand } from './BaseCommand.js';
import type { ICommandContext, ICommandResult } from '../types/interfaces.js';

export class HelpCommand extends BaseCommand {
  name = 'help';
  description = 'Show available commands and their descriptions';
  usage = 'help [command]';
  aliases = ['?'];

  execute(context: ICommandContext): ICommandResult {
    const { args } = context;
    
    if (args.length === 0) {
      // Show all commands
      const output = [
        'Available commands:',
        ''
      ];
      
      // This would be injected in a real implementation
      const commands = [
        { name: 'help', description: 'Show this help message' },
        { name: 'version', description: 'Show version and project information' },
        { name: 'clear', description: 'Clear the terminal screen' },
        { name: 'pwd', description: 'Print working directory' },
        { name: 'ls', description: 'List directory contents' },
        { name: 'cd', description: 'Change directory' },
        { name: 'mkdir', description: 'Create directory' },
        { name: 'touch', description: 'Create empty file' },
        { name: 'cat', description: 'Display file contents' },
        { name: 'rm', description: 'Remove files or directories' },
        { name: 'echo', description: 'Display text' },
        { name: 'nano', description: 'Simple file editor (see nano --help)' },
        { name: 'bash', description: 'Execute bash scripts' },
        { name: 'whoami', description: 'Display current user' },
        { name: 'hostname', description: 'Display system hostname' },
        { name: 'date', description: 'Display current date and time' },
        { name: 'history', description: 'Show command history' }
      ];
      
      commands.forEach(cmd => {
        output.push(`  ${cmd.name.padEnd(12)} - ${cmd.description}`);
      });
      
      output.push('');
      output.push('Special features:');
      output.push('  • File redirection: echo "text" > file.txt');
      output.push('  • Script execution: ./script.sh or bash script.sh');
      output.push('');
      output.push('Aliases available: about, version, -v, --version');
      output.push('');
      output.push('Type "help <command>" for detailed information about a specific command.');
      
      return this.success(output);
    } else {
      // Show help for specific command
      const commandName = args[0];
      return this.success([`Help for "${commandName}" command would be shown here`]);
    }
  }
}

export class ClearCommand extends BaseCommand {
  name = 'clear';
  description = 'Clear the terminal screen';
  usage = 'clear';
  aliases = ['cls'];

  execute(context: ICommandContext): ICommandResult {
    context.terminal.clearOutput();
    return this.success();
  }
}

export class EchoCommand extends BaseCommand {
  name = 'echo';
  description = 'Display a line of text';
  usage = 'echo [text...]';

  execute(context: ICommandContext): ICommandResult {
    const { args } = context;
    const text = args.join(' ');
    return this.success([text]);
  }
}

export class WhoamiCommand extends BaseCommand {
  name = 'whoami';
  description = 'Display the current username';
  usage = 'whoami';

  execute(context: ICommandContext): ICommandResult {
    const user = context.environment.get('USER') || 'user';
    return this.success([user]);
  }
}

export class HostnameCommand extends BaseCommand {
  name = 'hostname';
  description = 'Display the system hostname';
  usage = 'hostname';

  execute(context: ICommandContext): ICommandResult {
    const hostname = context.environment.get('HOSTNAME') || 'localhost';
    return this.success([hostname]);
  }
}

export class DateCommand extends BaseCommand {
  name = 'date';
  description = 'Display the current date and time';
  usage = 'date';

  execute(): ICommandResult {
    const now = new Date();
    return this.success([now.toString()]);
  }
}

export class HistoryCommand extends BaseCommand {
  name = 'history';
  description = 'Display command history';
  usage = 'history';

  execute(): ICommandResult {
    // In a real implementation, this would access the terminal's history
    const output = [
      'Command history:',
      '(History access would be implemented through dependency injection)'
    ];
    return this.success(output);
  }
}
