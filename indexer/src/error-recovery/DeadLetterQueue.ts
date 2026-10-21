import fs from 'fs';
import path from 'path';

const DLQ_FILE = path.join(__dirname, '../../..', 'dead-letter-queue.log');
const STATE_FILE = path.join(__dirname, '../../..', 'dead-letter-queue-state.json');

/**
 * Issue #36 – Indexer Error Recovery
 * Issue #434 – Atomic DLQ writes (temp file + fsync + rename)
 * Issue #435 – Load DLQ entries after restart
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

interface PersistedLedger {
  sequence: number;
  attemptCount: number;
  firstFailedAt: string;
  lastFailedAt: string;
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
  private readonly stateFile: string;
  private readonly persistEnabled: boolean;

  constructor(options?: {
    maxRetries?: number;
    baseDelayMs?: number;
    dlqFile?: string;
    stateFile?: string;
    /** When false, skip disk I/O (memory-only). */
    persist?: boolean;
    /** When true (default), load persisted active entries from disk. */
    loadOnInit?: boolean;
  }) {
    this.maxRetries = options?.maxRetries ?? 5;
    this.baseDelayMs = options?.baseDelayMs ?? 1000;
    this.dlqFile = options?.dlqFile ?? DLQ_FILE;
    this.stateFile = options?.stateFile ?? STATE_FILE;
    this.persistEnabled = options?.persist ?? true;

    if (this.persistEnabled && options?.loadOnInit !== false) {
      this.loadFromDisk();
    }
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
        return;
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

    this.persistState();
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
    const before = this.failedLedgers.length;
    this.failedLedgers = this.failedLedgers.filter((l) => l.sequence !== sequence);
    if (this.failedLedgers.length !== before) {
      this.persistState();
    }
  }

  /**
   * Get all failed ledgers
   */
  getAll(): RetryableLedger[] {
    return [...this.failedLedgers];
  }

  /**
   * Clear the in-memory queue and persisted state.
   */
  clear(): void {
    this.failedLedgers = [];
    this.persistState();
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

  /**
   * Persist active (retryable) queue entries atomically (#434 / #435).
   */
  persistState(): void {
    if (!this.persistEnabled) return;

    const payload: PersistedLedger[] = this.failedLedgers.map((l) => ({
      sequence: l.sequence,
      attemptCount: l.attemptCount,
      firstFailedAt: l.firstFailedAt.toISOString(),
      lastFailedAt: l.lastFailedAt.toISOString(),
      lastError: l.lastError,
    }));

    atomicWriteFile(this.stateFile, `${JSON.stringify(payload, null, 2)}\n`);
  }

  /**
   * Load active DLQ entries from disk after restart (#435).
   */
  loadFromDisk(): void {
    if (!this.persistEnabled) return;
    if (!fs.existsSync(this.stateFile)) return;

    try {
      const raw = fs.readFileSync(this.stateFile, 'utf8').trim();
      if (!raw) {
        this.failedLedgers = [];
        return;
      }

      const parsed = JSON.parse(raw) as PersistedLedger[];
      if (!Array.isArray(parsed)) return;

      this.failedLedgers = parsed
        .filter(
          (entry) =>
            entry &&
            typeof entry.sequence === 'number' &&
            typeof entry.attemptCount === 'number' &&
            typeof entry.lastError === 'string'
        )
        .map((entry) => ({
          sequence: entry.sequence,
          attemptCount: entry.attemptCount,
          firstFailedAt: new Date(entry.firstFailedAt),
          lastFailedAt: new Date(entry.lastFailedAt),
          lastError: entry.lastError,
        }))
        .filter(
          (entry) =>
            !Number.isNaN(entry.firstFailedAt.getTime()) &&
            !Number.isNaN(entry.lastFailedAt.getTime())
        );
    } catch {
      // Corrupted state file — start empty rather than crash the indexer.
      this.failedLedgers = [];
    }
  }

  private writeToDlqFile(ledger: RetryableLedger): void {
    const logEntry = `[${new Date().toISOString()}] Terminally failed ledger: ${JSON.stringify(
      ledger
    )}\n`;
    atomicAppendLine(this.dlqFile, logEntry);
  }
}

export const dlq = new DeadLetterQueue();
