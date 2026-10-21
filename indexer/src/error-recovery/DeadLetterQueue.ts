import fs from 'fs';
import path from 'path';

const DLQ_FILE = path.join(__dirname, '../../..', 'dead-letter-queue.log');

/**
 * Issue #36 – Indexer Error Recovery
 * Issue #434 – Atomic DLQ writes (temp file + fsync + rename)
 *
 * Dead letter queue for failed ledger processing with exponential backoff retry.
 */

export interface RetryableLedger {
  sequence: number;
  attemptCount: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  lastError: string;
}

/**
 * Atomically replace `filePath` with `content`.
 * Write to a unique temp file, fsync, then rename over the destination.
 */
export function atomicWriteFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeFileSync(fd, content, 'utf8');
    fs.fsyncSync(fd);
  } catch (err) {
    try {
      fs.closeSync(fd);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    throw err;
  }
  fs.closeSync(fd);
  fs.renameSync(tmpPath, filePath);
}

/**
 * Atomically append a line by rewriting the full file contents.
 * Avoids torn writes from a mid-append crash (#434).
 */
export function atomicAppendLine(filePath: string, line: string): void {
  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf8');
  }
  const next = existing.endsWith('\n') || existing.length === 0 ? existing : `${existing}\n`;
  atomicWriteFile(filePath, `${next}${line}`);
}

export class DeadLetterQueue {
  private failedLedgers: RetryableLedger[] = [];
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly dlqFile: string;

  constructor(options?: { maxRetries?: number; baseDelayMs?: number; dlqFile?: string }) {
    this.maxRetries = options?.maxRetries ?? 5;
    this.baseDelayMs = options?.baseDelayMs ?? 1000;
    this.dlqFile = options?.dlqFile ?? DLQ_FILE;
  }

  /**
   * Add a failed ledger to the dead letter queue
   */
  push(sequence: number, error: string): void {
    const now = new Date();
    const existing = this.failedLedgers.find((l) => l.sequence === sequence);

    if (existing) {
      existing.attemptCount++;
      existing.lastFailedAt = now;
      existing.lastError = error;

      if (existing.attemptCount >= this.maxRetries) {
        this.writeToDlqFile(existing);
        this.remove(existing.sequence);
      }
    } else {
      this.failedLedgers.push({
        sequence,
        attemptCount: 1,
        firstFailedAt: now,
        lastFailedAt: now,
        lastError: error,
      });
    }
  }

  /**
   * Get ledgers ready for retry with exponential backoff
   */
  getReadyForRetry(now: Date = new Date()): RetryableLedger[] {
    return this.failedLedgers.filter((ledger) => {
      if (ledger.attemptCount >= this.maxRetries) return false;
      const backoffMs = this.calculateBackoff(ledger.attemptCount);
      const readyTime = ledger.lastFailedAt.getTime() + backoffMs;
      return now.getTime() >= readyTime;
    });
  }

  /**
   * Remove a ledger after successful retry
   */
  remove(sequence: number): void {
    this.failedLedgers = this.failedLedgers.filter((l) => l.sequence !== sequence);
  }

  /**
   * Get all failed ledgers
   */
  getAll(): RetryableLedger[] {
    return [...this.failedLedgers];
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    return Math.min(this.baseDelayMs * 2 ** attempt, 300_000);
  }

  size(): number {
    return this.failedLedgers.length;
  }

  private writeToDlqFile(ledger: RetryableLedger): void {
    const logEntry = `[${new Date().toISOString()}] Terminally failed ledger: ${JSON.stringify(
      ledger
    )}\n`;
    atomicAppendLine(this.dlqFile, logEntry);
  }
}

export const dlq = new DeadLetterQueue();
