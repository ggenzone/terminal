import type { ITerminalIO, ITerminalHistory, ITerminalConfig } from '../types/interfaces.js';

export class TerminalIO implements ITerminalIO {
  private outputElement: HTMLDivElement;
  private inputElement: HTMLInputElement;
  private promptElement: HTMLSpanElement;
  private config: ITerminalConfig;

  constructor(
    outputElement: HTMLDivElement,
    inputElement: HTMLInputElement,
    promptElement: HTMLSpanElement,
    config: ITerminalConfig
  ) {
    this.outputElement = outputElement;
    this.inputElement = inputElement;
    this.promptElement = promptElement;
    this.config = config;
    
    this.updatePrompt();
  }

  addOutput(text: string, className: string = 'output-line'): void {
    const lines = text.split('\n');
    
    lines.forEach((line) => {
      const lineElement = document.createElement('div');
      lineElement.className = className;
      lineElement.textContent = line;
      this.outputElement.appendChild(lineElement);
    });
    
    this.scrollToBottom();
  }

  clearOutput(): void {
    this.outputElement.innerHTML = '';
  }

  updatePrompt(): void {
    this.promptElement.textContent = this.config.prompt;
  }

  focus(): void {
    this.inputElement.focus();
  }

  getInputValue(): string {
    return this.inputElement.value;
  }

  setInputValue(value: string): void {
    this.inputElement.value = value;
  }

  clearInput(): void {
    this.inputElement.value = '';
  }

  updateConfig(config: Partial<ITerminalConfig>): void {
    this.config = { ...this.config, ...config };
    this.updatePrompt();
  }

  private scrollToBottom(): void {
    this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }
}

export class TerminalHistory implements ITerminalHistory {
  private history: string[] = [];
  private currentIndex: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.loadFromStorage();
  }

  add(command: string): void {
    if (command.trim() === '') return;
    
    // Remove duplicate if it's the last command
    if (this.history[this.history.length - 1] === command) {
      return;
    }
    
    this.history.push(command);
    
    // Maintain max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
    
    this.currentIndex = this.history.length;
    this.saveToStorage();
  }

  get(index: number): string | undefined {
    return this.history[index];
  }

  getAll(): string[] {
    return [...this.history];
  }

  getPrevious(): string | undefined {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return undefined;
  }

  getNext(): string | undefined {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    } else {
      this.currentIndex = this.history.length;
      return '';
    }
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.saveToStorage();
  }

  size(): number {
    return this.history.length;
  }

  resetIndex(): void {
    this.currentIndex = this.history.length;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('h-terminal-history', JSON.stringify(this.history));
    } catch (error) {
      console.warn('Failed to save history to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('h-terminal-history');
      if (data) {
        this.history = JSON.parse(data);
        this.currentIndex = this.history.length;
      }
    } catch (error) {
      console.warn('Failed to load history from localStorage:', error);
    }
  }
}

export class TerminalInputHandler {
  private io: ITerminalIO;
  private history: ITerminalHistory;
  private onCommandExecute: (command: string) => void;
  private onTabComplete: (input: string) => string[];

  constructor(
    io: ITerminalIO,
    history: ITerminalHistory,
    onCommandExecute: (command: string) => void,
    onTabComplete: (input: string) => string[] = () => []
  ) {
    this.io = io;
    this.history = history;
    this.onCommandExecute = onCommandExecute;
    this.onTabComplete = onTabComplete;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const inputElement = (this.io as any).inputElement;
    
    inputElement.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeyDown(e);
    });

    // Keep focus on input
    document.addEventListener('click', () => {
      this.io.focus();
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
        this.handleEnter();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.handleArrowUp();
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        this.handleArrowDown();
        break;
        
      case 'Tab':
        e.preventDefault();
        this.handleTab();
        break;
        
      case 'c':
        if (e.ctrlKey) {
          e.preventDefault();
          this.handleCtrlC();
        }
        break;
        
      case 'l':
        if (e.ctrlKey) {
          e.preventDefault();
          this.io.clearOutput();
        }
        break;
    }
  }

  private handleEnter(): void {
    const command = (this.io as any).getInputValue();
    this.history.add(command);
    this.history.resetIndex();
    this.onCommandExecute(command);
    (this.io as any).clearInput();
  }

  private handleArrowUp(): void {
    const previous = this.history.getPrevious();
    if (previous !== undefined) {
      (this.io as any).setInputValue(previous);
    }
  }

  private handleArrowDown(): void {
    const next = this.history.getNext();
    if (next !== undefined) {
      (this.io as any).setInputValue(next);
    }
  }

  private handleTab(): void {
    const currentInput = (this.io as any).getInputValue();
    const completions = this.onTabComplete(currentInput);
    
    if (completions.length === 1) {
      (this.io as any).setInputValue(completions[0]);
    } else if (completions.length > 1) {
      this.io.addOutput('Available options:', 'output-line');
      this.io.addOutput(completions.join('  '), 'output-line');
    }
  }

  private handleCtrlC(): void {
    this.io.addOutput('^C', 'output-line');
    (this.io as any).clearInput();
  }
}
