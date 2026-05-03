import fs from 'fs';
import path from 'path';

const isVercel = Boolean(process.env.VERCEL);
const logsDir = path.resolve(process.cwd(), 'logs');

export const apiLogPath = isVercel ? 'stdout' : path.join(logsDir, 'api.log');
export const authLogPath = isVercel ? 'stdout' : path.join(logsDir, 'auth.log');

const createApiLogStream = (): NodeJS.WritableStream => {
  if (isVercel) {
    return process.stdout;
  }

  try {
    fs.mkdirSync(logsDir, { recursive: true });
    fs.closeSync(fs.openSync(apiLogPath, 'a'));
    fs.closeSync(fs.openSync(authLogPath, 'a'));

    return fs.createWriteStream(apiLogPath, { flags: 'a' });
  } catch (error) {
    console.warn('Could not initialize file logging, using stdout instead:', error);
    return process.stdout;
  }
};

export const apiLogStream = createApiLogStream();

export const writeAuthLog = (message: string) => {
  const line = `[${new Date().toISOString()}] ${message}\n`;

  if (isVercel) {
    console.log(line.trim());
    return;
  }

  fs.appendFile(authLogPath, line, error => {
    if (error) {
      console.error('Could not write auth log:', error);
      console.log(line.trim());
    }
  });
};
