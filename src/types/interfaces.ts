/**
 * Core interfaces for the terminal system
 */

export interface ITerminalIO {
  addOutput(text: string, className?: string): void;
  clearOutput(): void;
  updatePrompt(): void;
  focus(): void;
}

export interface IFileSystemNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: Map<string, IFileSystemNode>;
  permissions: string;
  created: Date;
  modified: Date;
  size: number;
}

export interface IFileSystem {
  getCurrentDirectory(): string;
  setCurrentDirectory(path: string): boolean;
  listDirectory(path?: string): IFileSystemNode[];
  createFile(name: string, content?: string): boolean;
  createDirectory(name: string): boolean;
  deleteNode(name: string, recursive?: boolean): boolean;
  readFile(name: string): string | null;
  writeFile(name: string, content: string): boolean;
  exists(path: string): boolean;
  getNode(path: string): IFileSystemNode | null;
  resolvePath(path: string): string;
  getAbsolutePath(path: string): string;
}

export interface ICommandContext {
  args: string[];
  flags: Map<string, string | boolean>;
  terminal: ITerminalIO;
  fileSystem: IFileSystem;
  environment: Map<string, string>;
  workingDirectory: string;
}

export interface ICommandResult {
  success: boolean;
  output?: string[];
  error?: string;
  exitCode: number;
}

export interface ICommand {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  execute(context: ICommandContext): Promise<ICommandResult> | ICommandResult;
}

export interface ICommandProcessor {
  registerCommand(command: ICommand): void;
  unregisterCommand(name: string): void;
  executeCommand(input: string, context: Omit<ICommandContext, 'args' | 'flags'>): Promise<ICommandResult>;
  getCommand(name: string): ICommand | undefined;
  getAllCommands(): ICommand[];
  parseInput(input: string): { command: string; args: string[]; flags: Map<string, string | boolean> };
}

export interface ITerminalHistory {
  add(command: string): void;
  get(index: number): string | undefined;
  getAll(): string[];
  getPrevious(): string | undefined;
  getNext(): string | undefined;
  clear(): void;
  size(): number;
  resetIndex(): void;
}

export interface ITerminalConfig {
  user: string;
  hostname: string;
  homeDirectory: string;
  prompt: string;
  theme: string;
  maxHistorySize: number;
}

export interface ITerminalState {
  isRunning: boolean;
  currentCommand: string | null;
  environment: Map<string, string>;
  aliases: Map<string, string>;
  config: ITerminalConfig;
}

export interface ITerminal {
  start(): void;
  stop(): void;
  executeCommand(command: string): Promise<void>;
  getState(): ITerminalState;
  getHistory(): ITerminalHistory;
  getFileSystem(): IFileSystem;
  getIO(): ITerminalIO;
}

// Utility types
export type CommandExecutor = (context: ICommandContext) => Promise<ICommandResult> | ICommandResult;

export type FileType = 'file' | 'directory' | 'symlink';

export type OutputType = 'output-line' | 'command-line' | 'error-line' | 'success-line' | 'warning-line';

// Event interfaces
export interface ITerminalEvent {
  type: string;
  timestamp: Date;
  data?: any;
}

export interface ICommandExecutedEvent extends ITerminalEvent {
  type: 'command-executed';
  data: {
    command: string;
    result: ICommandResult;
    duration: number;
  };
}

export interface IFileSystemChangedEvent extends ITerminalEvent {
  type: 'filesystem-changed';
  data: {
    operation: 'create' | 'delete' | 'modify' | 'move';
    path: string;
  };
}
