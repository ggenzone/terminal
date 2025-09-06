import { BaseCommand } from './BaseCommand.js';
import type { ICommandContext, ICommandResult } from '../types/interfaces.js';

export class VersionCommand extends BaseCommand {
  name = 'version';
  description = 'Show version and project information';
  usage = 'version';
  aliases = ['about', '--version', '-v'];

  execute(_context: ICommandContext): ICommandResult {
    const output = [
      '╭─────────────────────────────────────────╮',
      '│              H-Terminal v1.0.0          │',
      '├─────────────────────────────────────────┤',
      '│                                         │',
      '│  🚀 A modern web-based terminal         │',
      '│     emulator built with TypeScript      │',
      '│                                         │',
      '│  🔗 Repository:                         │',
      '│     https://github.com/ggenzone/terminal│',
      '│                                         │',
      '│  🌐 Live Demo:                          │',
      '│     https://ggenzone.github.io/terminal │',
      '│                                         │',
      '│  📚 Features:                           │',
      '│     • Virtual File System               │',
      '│     • Bash Script Execution             │',
      '│     • File Redirection (>, >>)          │',
      '│     • 20+ Built-in Commands             │',
      '│     • Persistent Storage                │',
      '│     • Tab Completion                    │',
      '│                                         │',
      '╰─────────────────────────────────────────╯',
      '',
      'Type "help" to see all available commands.',
      'Visit the GitHub repository for documentation and updates.'
    ];

    return this.success(output);
  }
}
