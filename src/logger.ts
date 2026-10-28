export type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getCurrentLevel(): LogLevel {
  const level = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (level === "debug" || level === "info" || level === "warn" || level === "error") {
    return level;
  }
  return "info";
}

export class Logger {
  private requestId?: string;
  private baseContext: Record<string, unknown> = {};

  constructor(requestId?: string, baseContext: Record<string, unknown> = {}) {
    this.requestId = requestId;
    this.baseContext = baseContext;
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger(this.requestId, { ...this.baseContext, ...context });
  }

  withRequestId(requestId: string): Logger {
    return new Logger(requestId, this.baseContext);
  }

  private log(level: LogLevel, message: string, extra: Record<string, unknown> = {}): void {
    const currentLevel = getCurrentLevel();
    if (levelOrder[level] < levelOrder[currentLevel]) {
      return;
    }

    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(this.requestId ? { requestId: this.requestId } : {}),
      ...this.baseContext,
      ...extra,
    };

    process.stdout.write(JSON.stringify(logEntry) + "\n");
  }

  debug(message: string, extra?: Record<string, unknown>): void {
    this.log("debug", message, extra);
  }

  info(message: string, extra?: Record<string, unknown>): void {
    this.log("info", message, extra);
  }

  warn(message: string, extra?: Record<string, unknown>): void {
    this.log("warn", message, extra);
  }

  error(message: string, extra?: Record<string, unknown>): void {
    this.log("error", message, extra);
  }
}

export const logger = new Logger();
