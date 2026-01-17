import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';

export class BackupService {
  
  async backupFolder(sourcePath: string, destPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(sourcePath)) {
        throw new Error('Kaynak klasör bulunamadı: ' + sourcePath);
      }

      // Create destination directory
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }

      // Copy all files recursively
      await this.copyDirectory(sourcePath, destPath);
      
      console.log('Backup completed:', sourcePath, '->', destPath);
      return true;
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  private async copyDirectory(source: string, destination: string): Promise<void> {
    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async createZip(sourcePath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(sourcePath)) {
          reject(new Error('Kaynak klasör bulunamadı: ' + sourcePath));
          return;
        }

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        output.on('close', () => {
          console.log(`ZIP created: ${outputPath} (${archive.pointer()} bytes)`);
          resolve(outputPath);
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);

        // Add folder contents to archive
        const folderName = path.basename(sourcePath);
        archive.directory(sourcePath, folderName);

        archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }

  async createZipWithFiles(files: string[], outputPath: string, basePath: string = ''): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
          zlib: { level: 9 }
        });

        output.on('close', () => {
          console.log(`ZIP created: ${outputPath} (${archive.pointer()} bytes)`);
          resolve(outputPath);
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);

        // Add each file
        for (const file of files) {
          if (fs.existsSync(file)) {
            const name = basePath ? path.relative(basePath, file) : path.basename(file);
            archive.file(file, { name });
          }
        }

        archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }

  getBackupSize(backupPath: string): number {
    if (!fs.existsSync(backupPath)) {
      return 0;
    }

    let totalSize = 0;
    const files = fs.readdirSync(backupPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(backupPath, file.name);
      if (file.isDirectory()) {
        totalSize += this.getBackupSize(filePath);
      } else {
        totalSize += fs.statSync(filePath).size;
      }
    }

    return totalSize;
  }

  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  async cleanOldBackups(backupFolder: string, keepDays: number): Promise<number> {
    if (!fs.existsSync(backupFolder)) {
      return 0;
    }

    const now = Date.now();
    const maxAge = keepDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    const processFolder = (folderPath: string) => {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(folderPath, entry.name);

        if (entry.isDirectory()) {
          processFolder(entryPath);
          
          // Check if directory is empty after processing
          const remaining = fs.readdirSync(entryPath);
          if (remaining.length === 0) {
            fs.rmdirSync(entryPath);
          }
        } else {
          const stats = fs.statSync(entryPath);
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(entryPath);
            deletedCount++;
          }
        }
      }
    };

    processFolder(backupFolder);
    return deletedCount;
  }
}
