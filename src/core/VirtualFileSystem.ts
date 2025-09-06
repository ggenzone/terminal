import type { IFileSystem, IFileSystemNode } from '../types/interfaces.js';

export class VirtualFileSystem implements IFileSystem {
  private root: IFileSystemNode;
  private currentPath: string;
  private readonly homeDirectory: string;

  constructor(homeDirectory: string = '/home/user') {
    this.homeDirectory = homeDirectory;
    this.currentPath = '~';
    this.root = this.createInitialStructure();
    this.loadFromStorage();
  }

  private createInitialStructure(): IFileSystemNode {
    const now = new Date();
    
    const root: IFileSystemNode = {
      name: '',
      type: 'directory',
      children: new Map(),
      permissions: 'rwxr-xr-x',
      created: now,
      modified: now,
      size: 0
    };

    // Create basic directory structure
    const home = this.createNode('home', 'directory');
    const user = this.createNode('user', 'directory');
    const documents = this.createNode('Documents', 'directory');
    const downloads = this.createNode('Downloads', 'directory');
    const pictures = this.createNode('Pictures', 'directory');
    const videos = this.createNode('Videos', 'directory');

    // Create some sample files
    const readme = this.createNode('readme.txt', 'file', 'Welcome to H-Terminal!\nThis is a virtual file system.');
    const script = this.createNode('script.sh', 'file', '#!/bin/bash\necho "Hello World!"');

    // Build structure
    user.children!.set('Documents', documents);
    user.children!.set('Downloads', downloads);
    user.children!.set('Pictures', pictures);
    user.children!.set('Videos', videos);
    user.children!.set('readme.txt', readme);
    user.children!.set('script.sh', script);

    home.children!.set('user', user);
    root.children!.set('home', home);

    return root;
  }

  private createNode(name: string, type: 'file' | 'directory', content?: string): IFileSystemNode {
    const now = new Date();
    return {
      name,
      type,
      content: content || '',
      children: type === 'directory' ? new Map() : undefined,
      permissions: type === 'directory' ? 'rwxr-xr-x' : 'rw-r--r--',
      created: now,
      modified: now,
      size: content ? content.length : 0
    };
  }

  getCurrentDirectory(): string {
    return this.currentPath;
  }

  setCurrentDirectory(path: string): boolean {
    const resolvedPath = this.resolvePath(path);
    const node = this.getNodeByPath(resolvedPath);
    
    if (!node || node.type !== 'directory') {
      return false;
    }

    this.currentPath = this.normalizeDisplayPath(resolvedPath);
    this.saveToStorage();
    return true;
  }

  listDirectory(path?: string): IFileSystemNode[] {
    const targetPath = path ? this.resolvePath(path) : this.getAbsolutePath(this.currentPath);
    const node = this.getNodeByPath(targetPath);
    
    if (!node || node.type !== 'directory' || !node.children) {
      return [];
    }

    return Array.from(node.children.values()).sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  createFile(name: string, content: string = ''): boolean {
    if (this.exists(name)) {
      return false;
    }

    const currentNode = this.getCurrentDirectoryNode();
    if (!currentNode || !currentNode.children) {
      return false;
    }

    const file = this.createNode(name, 'file', content);
    currentNode.children.set(name, file);
    currentNode.modified = new Date();
    
    this.saveToStorage();
    return true;
  }

  createDirectory(name: string): boolean {
    if (this.exists(name)) {
      return false;
    }

    const currentNode = this.getCurrentDirectoryNode();
    if (!currentNode || !currentNode.children) {
      return false;
    }

    const directory = this.createNode(name, 'directory');
    currentNode.children.set(name, directory);
    currentNode.modified = new Date();
    
    this.saveToStorage();
    return true;
  }

  deleteNode(name: string, recursive: boolean = false): boolean {
    const currentNode = this.getCurrentDirectoryNode();
    if (!currentNode || !currentNode.children) {
      return false;
    }

    const node = currentNode.children.get(name);
    if (!node) {
      return false;
    }

    if (node.type === 'directory' && node.children && node.children.size > 0 && !recursive) {
      return false; // Directory not empty
    }

    currentNode.children.delete(name);
    currentNode.modified = new Date();
    
    this.saveToStorage();
    return true;
  }

  readFile(name: string): string | null {
    const node = this.getNode(name);
    if (!node || node.type !== 'file') {
      return null;
    }
    return node.content || '';
  }

  writeFile(name: string, content: string): boolean {
    const node = this.getNode(name);
    if (node && node.type === 'file') {
      // Update existing file
      node.content = content;
      node.size = content.length;
      node.modified = new Date();
      this.saveToStorage();
      return true;
    } else {
      // Create new file
      return this.createFile(name, content);
    }
  }

  exists(path: string): boolean {
    return this.getNode(path) !== null;
  }

  getNode(path: string): IFileSystemNode | null {
    if (path.includes('/')) {
      return this.getNodeByPath(this.resolvePath(path));
    } else {
      // Simple filename in current directory
      const currentNode = this.getCurrentDirectoryNode();
      if (!currentNode || !currentNode.children) {
        return null;
      }
      return currentNode.children.get(path) || null;
    }
  }

  resolvePath(path: string): string {
    if (path === '~') {
      return this.homeDirectory;
    }
    
    if (path.startsWith('~/')) {
      return this.homeDirectory + path.slice(1);
    }
    
    if (path.startsWith('/')) {
      return path;
    }
    
    // Relative path
    const currentAbsolute = this.getAbsolutePath(this.currentPath);
    if (path === '.') {
      return currentAbsolute;
    }
    
    if (path === '..') {
      const parts = currentAbsolute.split('/').filter(p => p);
      parts.pop();
      return '/' + parts.join('/');
    }
    
    if (path.startsWith('../')) {
      const parts = currentAbsolute.split('/').filter(p => p);
      const pathParts = path.split('/');
      
      for (const part of pathParts) {
        if (part === '..') {
          parts.pop();
        } else if (part !== '.') {
          parts.push(part);
        }
      }
      
      return '/' + parts.join('/');
    }
    
    return currentAbsolute + (currentAbsolute.endsWith('/') ? '' : '/') + path;
  }

  getAbsolutePath(path: string): string {
    if (path === '~') {
      return this.homeDirectory;
    }
    if (path.startsWith('~/')) {
      return this.homeDirectory + path.slice(1);
    }
    if (path.startsWith('/')) {
      return path;
    }
    return this.homeDirectory + '/' + path;
  }

  private getCurrentDirectoryNode(): IFileSystemNode | null {
    return this.getNodeByPath(this.getAbsolutePath(this.currentPath));
  }

  private getNodeByPath(absolutePath: string): IFileSystemNode | null {
    if (absolutePath === '/') {
      return this.root;
    }

    const parts = absolutePath.split('/').filter(p => p);
    let current = this.root;

    for (const part of parts) {
      if (!current.children || !current.children.has(part)) {
        return null;
      }
      current = current.children.get(part)!;
    }

    return current;
  }

  private normalizeDisplayPath(absolutePath: string): string {
    if (absolutePath === this.homeDirectory) {
      return '~';
    }
    if (absolutePath.startsWith(this.homeDirectory + '/')) {
      return '~' + absolutePath.slice(this.homeDirectory.length);
    }
    return absolutePath;
  }

  private saveToStorage(): void {
    try {
      const data = {
        root: this.serializeNode(this.root),
        currentPath: this.currentPath,
        homeDirectory: this.homeDirectory
      };
      localStorage.setItem('h-terminal-filesystem', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save filesystem to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('h-terminal-filesystem');
      if (data) {
        const parsed = JSON.parse(data);
        this.root = this.deserializeNode(parsed.root);
        this.currentPath = parsed.currentPath || '~';
      }
    } catch (error) {
      console.warn('Failed to load filesystem from localStorage:', error);
      // Keep the default structure
    }
  }

  private serializeNode(node: IFileSystemNode): any {
    const serialized: any = {
      name: node.name,
      type: node.type,
      content: node.content,
      permissions: node.permissions,
      created: node.created.toISOString(),
      modified: node.modified.toISOString(),
      size: node.size
    };

    if (node.children) {
      serialized.children = Array.from(node.children.entries()).map(([key, child]) => [
        key,
        this.serializeNode(child)
      ]);
    }

    return serialized;
  }

  private deserializeNode(data: any): IFileSystemNode {
    const node: IFileSystemNode = {
      name: data.name,
      type: data.type,
      content: data.content,
      permissions: data.permissions,
      created: new Date(data.created),
      modified: new Date(data.modified),
      size: data.size
    };

    if (data.children) {
      node.children = new Map();
      for (const [key, childData] of data.children) {
        node.children.set(key, this.deserializeNode(childData));
      }
    }

    return node;
  }
}
