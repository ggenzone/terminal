import { BaseCommand } from './BaseCommand.js';
import type { ICommandContext, ICommandResult } from '../types/interfaces.js';

export class PwdCommand extends BaseCommand {
  name = 'pwd';
  description = 'Print name of current/working directory';
  usage = 'pwd';

  execute(context: ICommandContext): ICommandResult {
    const currentDir = context.fileSystem.getCurrentDirectory();
    const absolutePath = context.fileSystem.getAbsolutePath(currentDir);
    return this.success([absolutePath]);
  }
}

export class LsCommand extends BaseCommand {
  name = 'ls';
  description = 'List directory contents';
  usage = 'ls [options] [directory]';
  aliases = ['dir'];

  execute(context: ICommandContext): ICommandResult {
    const { args, flags } = context;
    const showAll = this.hasFlag(flags, 'a') || this.hasFlag(flags, 'all');
    const longFormat = this.hasFlag(flags, 'l') || this.hasFlag(flags, 'long');
    
    const targetPath = args[0] || '';
    const files = context.fileSystem.listDirectory(targetPath);
    
    if (files.length === 0) {
      return this.success([]);
    }

    const output: string[] = [];
    
    files.forEach(file => {
      // Skip hidden files unless -a flag is used
      if (!showAll && file.name.startsWith('.')) {
        return;
      }
      
      if (longFormat) {
        const permissions = file.permissions;
        const size = file.size.toString().padStart(8);
        const modified = file.modified.toLocaleDateString();
        const type = file.type === 'directory' ? 'd' : '-';
        const name = file.type === 'directory' ? `${file.name}/` : file.name;
        
        output.push(`${type}${permissions} ${size} ${modified} ${name}`);
      } else {
        const name = file.type === 'directory' ? `${file.name}/` : file.name;
        output.push(name);
      }
    });
    
    if (!longFormat) {
      // Format as columns
      return this.success([output.join('  ')]);
    }
    
    return this.success(output);
  }
}

export class CdCommand extends BaseCommand {
  name = 'cd';
  description = 'Change the current directory';
  usage = 'cd [directory]';

  execute(context: ICommandContext): ICommandResult {
    const { args } = context;
    const targetPath = args[0] || '~';
    
    const success = context.fileSystem.setCurrentDirectory(targetPath);
    
    if (!success) {
      return this.error(`cd: ${targetPath}: No such file or directory`);
    }
    
    return this.success();
  }
}

export class MkdirCommand extends BaseCommand {
  name = 'mkdir';
  description = 'Create directories';
  usage = 'mkdir [options] directory...';

  execute(context: ICommandContext): ICommandResult {
    const { args } = context;
    
    const validation = this.validateArgs(args, 1);
    if (validation) return validation;
    
    const errors: string[] = [];
    const created: string[] = [];
    
    for (const dirName of args) {
      const success = context.fileSystem.createDirectory(dirName);
      if (success) {
        created.push(dirName);
      } else {
        errors.push(`mkdir: cannot create directory '${dirName}': File exists or invalid name`);
      }
    }
    
    if (errors.length > 0) {
      return this.error(errors.join('\n'));
    }
    
    return this.success();
  }
}

export class TouchCommand extends BaseCommand {
  name = 'touch';
  description = 'Create empty files or update file timestamps';
  usage = 'touch file...';

  execute(context: ICommandContext): ICommandResult {
    const { args } = context;
    
    const validation = this.validateArgs(args, 1);
    if (validation) return validation;
    
    const errors: string[] = [];
    
    for (const fileName of args) {
      if (context.fileSystem.exists(fileName)) {
        // File exists, update timestamp (simulated)
        const node = context.fileSystem.getNode(fileName);
        if (node) {
          node.modified = new Date();
        }
      } else {
        // Create new file
        const success = context.fileSystem.createFile(fileName);
        if (!success) {
          errors.push(`touch: cannot touch '${fileName}': Invalid file name`);
        }
      }
    }
    
    if (errors.length > 0) {
      return this.error(errors.join('\n'));
    }
    
    return this.success();
  }
}

export class CatCommand extends BaseCommand {
  name = 'cat';
  description = 'Display file contents';
  usage = 'cat file...';

  execute(context: ICommandContext): ICommandResult {
    const { args } = context;
    
    const validation = this.validateArgs(args, 1);
    if (validation) return validation;
    
    const output: string[] = [];
    
    for (const fileName of args) {
      const content = context.fileSystem.readFile(fileName);
      if (content === null) {
        return this.error(`cat: ${fileName}: No such file or directory`);
      }
      
      if (content) {
        output.push(...content.split('\n'));
      }
    }
    
    return this.success(output);
  }
}

export class RmCommand extends BaseCommand {
  name = 'rm';
  description = 'Remove files and directories';
  usage = 'rm [options] file...';

  execute(context: ICommandContext): ICommandResult {
    const { args, flags } = context;
    
    const validation = this.validateArgs(args, 1);
    if (validation) return validation;
    
    const recursive = this.hasFlag(flags, 'r') || this.hasFlag(flags, 'R') || this.hasFlag(flags, 'recursive');
    const force = this.hasFlag(flags, 'f') || this.hasFlag(flags, 'force');
    
    const errors: string[] = [];
    
    for (const fileName of args) {
      if (!context.fileSystem.exists(fileName) && !force) {
        errors.push(`rm: cannot remove '${fileName}': No such file or directory`);
        continue;
      }
      
      const success = context.fileSystem.deleteNode(fileName, recursive);
      if (!success && !force) {
        errors.push(`rm: cannot remove '${fileName}': Directory not empty (use -r to remove directories)`);
      }
    }
    
    if (errors.length > 0) {
      return this.error(errors.join('\n'));
    }
    
    return this.success();
  }
}
