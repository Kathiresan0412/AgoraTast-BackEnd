import fs from 'fs';
import path from 'path';
import type { Request } from 'express';

const isVercel = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === 'production';
const logsDir = path.resolve(process.cwd(), 'logs');

export const apiLogPath = isVercel ? 'stdout' : path.join(logsDir, 'api.log');
export const authLogPath = isVercel ? 'stdout' : path.join(logsDir, 'auth.log');
const errorLogPath = isVercel ? 'stdout' : path.join(logsDir, 'error.log');

const createApiLogStream = (): NodeJS.WritableStream => {
  if (isVercel) {
    return process.stdout;
  }

  try {
    fs.mkdirSync(logsDir, { recursive: true });
    fs.closeSync(fs.openSync(apiLogPath, 'a'));
    fs.closeSync(fs.openSync(authLogPath, 'a'));
    fs.closeSync(fs.openSync(errorLogPath, 'a'));

    return fs.createWriteStream(apiLogPath, { flags: 'a' });
  } catch (error) {
    console.warn('Could not initialize file logging, using stdout instead:', error);
    return process.stdout;
  }
};

export const apiLogStream = createApiLogStream();

type LogLevel = 'info' | 'warn' | 'error';
type LogValue = string | number | boolean | null | undefined | LogValue[] | { [key: string]: LogValue };

const clean = (value: LogValue): LogValue => {
  if (Array.isArray(value)) {
    return value.map(item => clean(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined && entry !== '')
        .map(([key, entry]) => [key, clean(entry)])
    );
  }

  return value;
};

const writeLine = (targetPath: string, line: string, level: LogLevel = 'info') => {
  if (isVercel) {
    if (level === 'error') {
      console.error(line);
      return;
    }

    if (level === 'warn') {
      console.warn(line);
      return;
    }

    console.log(line);
    return;
  }

  fs.appendFile(targetPath, `${line}\n`, error => {
    if (error) {
      console.error('Could not write log:', error);
      console.log(line);
    }
  });
};

export const getRequestLogContext = (req: Request) => ({
  requestId: req.requestId,
  method: req.method,
  path: req.originalUrl,
  ip: req.ip,
  origin: req.get('origin'),
  userAgent: req.get('user-agent'),
  userId: req.user?.id,
  role: req.user?.role,
});

export const serializeError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }

  const err = error as Record<string, any>;
  return clean({
    name: err.name,
    message: err.message,
    code: err.code,
    status: err.status,
    statusCode: err.statusCode,
    details: err.details,
    hint: err.hint,
    stack: isProduction ? undefined : err.stack,
  });
};

export const writeApiEvent = (
  level: LogLevel,
  event: string,
  details: Record<string, LogValue>
) => {
  writeLine(
    apiLogPath,
    JSON.stringify(clean({
      ts: new Date().toISOString(),
      level,
      event,
      ...details,
    })),
    level
  );
};

export const writeAuthLog = (message: string) => {
  const line = `[${new Date().toISOString()}] ${message}`;

  if (isVercel) {
    console.log(line);
    return;
  }

  writeLine(authLogPath, line);
};

export const writeAuthEvent = (
  event: string,
  details: Record<string, LogValue>
) => {
  writeLine(
    authLogPath,
    JSON.stringify(clean({
      ts: new Date().toISOString(),
      level: 'warn',
      event,
      ...details,
    })),
    'warn'
  );
};
