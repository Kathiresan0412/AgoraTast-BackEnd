import fs from 'fs';
import path from 'path';

const logsDir = path.resolve(process.cwd(), 'logs');

fs.mkdirSync(logsDir, { recursive: true });

export const apiLogPath = path.join(logsDir, 'api.log');
export const authLogPath = path.join(logsDir, 'auth.log');

fs.closeSync(fs.openSync(apiLogPath, 'a'));
fs.closeSync(fs.openSync(authLogPath, 'a'));

export const apiLogStream = fs.createWriteStream(apiLogPath, { flags: 'a' });

export const writeAuthLog = (message: string) => {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFile(authLogPath, line, error => {
    if (error) {
      console.error('Could not write auth log:', error);
    }
  });
};
