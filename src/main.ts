import './style.css';
import { VirtualFileSystem } from './core/VirtualFileSystem.js';
import { TerminalIO, TerminalHistory, TerminalInputHandler } from './core/Terminal.js';
import { CommandProcessor } from './core/CommandProcessor.js';

// Import commands
import { 
  HelpCommand, 
  ClearCommand, 
  EchoCommand, 
  WhoamiCommand, 
  HostnameCommand, 
  DateCommand,
  HistoryCommand 
} from './commands/BasicCommands.js';
import { 
  PwdCommand, 
  LsCommand, 
  CdCommand, 
  MkdirCommand, 
  TouchCommand, 
  CatCommand, 
  RmCommand 
} from './commands/FileCommands.js';

import type { ITerminalConfig, ICommandContext } from './types/interfaces.js';

class HTerminal {
  private fileSystem: VirtualFileSystem;
  private terminalIO: TerminalIO;
  private history: TerminalHistory;
  private commandProcessor: CommandProcessor;
  private config: ITerminalConfig;
  private environment: Map<string, string>;

  constructor() {
    // Get DOM elements
    const outputElement = document.getElementById('terminal-output') as HTMLDivElement;
    const inputElement = document.getElementById('terminal-input') as HTMLInputElement;
    const promptElement = document.getElementById('prompt') as HTMLSpanElement;

    if (!outputElement || !inputElement || !promptElement) {
      throw new Error('Required terminal DOM elements not found');
    }

    // Initialize configuration
    this.config = {
      user: 'user',
      hostname: 'localhost',
      homeDirectory: '/home/user',
      prompt: 'user@localhost:~$ ',
      theme: 'dark',
      maxHistorySize: 1000
    };

    // Initialize environment variables
    this.environment = new Map([
      ['USER', this.config.user],
      ['HOSTNAME', this.config.hostname],
      ['HOME', this.config.homeDirectory],
      ['PWD', this.config.homeDirectory],
      ['SHELL', '/bin/bash'],
      ['TERM', 'xterm-256color']
    ]);

    // Initialize core components
    this.fileSystem = new VirtualFileSystem(this.config.homeDirectory);
    this.history = new TerminalHistory(this.config.maxHistorySize);
    this.terminalIO = new TerminalIO(outputElement, inputElement, promptElement, this.config);
    this.commandProcessor = new CommandProcessor();

    // Register commands
    this.registerCommands();

    // Initialize input handler (no need to store reference)
    new TerminalInputHandler(
      this.terminalIO,
      this.history,
      (command) => this.executeCommand(command),
      (input) => this.getCompletions(input)
    );

    // Show welcome message
    this.showWelcome();
  }

  private registerCommands(): void {
    const commands = [
      new HelpCommand(),
      new ClearCommand(),
      new EchoCommand(),
      new WhoamiCommand(),
      new HostnameCommand(),
      new DateCommand(),
      new HistoryCommand(),
      new PwdCommand(),
      new LsCommand(),
      new CdCommand(),
      new MkdirCommand(),
      new TouchCommand(),
      new CatCommand(),
      new RmCommand()
    ];

    commands.forEach(command => {
      this.commandProcessor.registerCommand(command);
    });
  }

  private async executeCommand(command: string): Promise<void> {
    if (!command.trim()) return;

    // Update prompt display
    this.updatePrompt();

    // Show command being executed
    const currentPrompt = this.config.prompt;
    this.terminalIO.addOutput(`${currentPrompt}${command}`, 'command-line');

    try {
      // Create command context
      const context: Omit<ICommandContext, 'args' | 'flags'> = {
        terminal: this.terminalIO,
        fileSystem: this.fileSystem,
        environment: this.environment,
        workingDirectory: this.fileSystem.getCurrentDirectory()
      };

      // Execute command
      const result = await this.commandProcessor.executeCommand(command, context);

      // Display result
      if (result.output && result.output.length > 0) {
        result.output.forEach(line => {
          this.terminalIO.addOutput(line, 'output-line');
        });
      }

      if (!result.success && result.error) {
        this.terminalIO.addOutput(result.error, 'error-line');
      }

    } catch (error) {
      this.terminalIO.addOutput(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error-line'
      );
    }

    // Update environment and prompt after command execution
    this.updateEnvironment();
    this.updatePrompt();
  }

  private getCompletions(input: string): string[] {
    return this.commandProcessor.getCompletions(input);
  }

  private updatePrompt(): void {
    const currentDir = this.fileSystem.getCurrentDirectory();
    this.config.prompt = `${this.config.user}@${this.config.hostname}:${currentDir}$ `;
    this.terminalIO.updateConfig({ prompt: this.config.prompt });
  }

  private updateEnvironment(): void {
    const currentDir = this.fileSystem.getCurrentDirectory();
    const absolutePath = this.fileSystem.getAbsolutePath(currentDir);
    this.environment.set('PWD', absolutePath);
  }

  private showWelcome(): void {
    this.terminalIO.addOutput('Welcome to H-Terminal', 'success-line');
    this.terminalIO.addOutput('A modern web-based terminal emulator', 'success-line');
    this.terminalIO.addOutput('Type "help" to see available commands', 'success-line');
    this.terminalIO.addOutput('', 'output-line');
    this.updatePrompt();
    this.terminalIO.focus();
  }

  public start(): void {
    this.terminalIO.focus();
  }
}

// Initialize terminal when DOM is ready
function initializeTerminal(): void {
  try {
    const terminal = new HTerminal();
    terminal.start();
  } catch (error) {
    console.error('Failed to initialize terminal:', error);
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTerminal);
} else {
  initializeTerminal();
}
