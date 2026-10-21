import fs from 'fs';
import os from 'os';
import path from 'path';
import { DeadLetterQueue } from '../DeadLetterQueue';

describe('DeadLetterQueue reload after restart (#435)', () => {
  let tmpDir: string;
  let stateFile: string;
  let dlqFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlq-reload-'));
    stateFile = path.join(tmpDir, 'dead-letter-queue-state.json');
    dlqFile = path.join(tmpDir, 'dead-letter-queue.log');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('persists active entries and restores them in a new instance', () => {
    const first = new DeadLetterQueue({
      maxRetries: 5,
      baseDelayMs: 1,
      dlqFile,
      stateFile,
      loadOnInit: false,
    });

    first.push(42, 'horizon timeout');
    first.push(43, 'validation failed');
    expect(first.size()).toBe(2);
    expect(fs.existsSync(stateFile)).toBe(true);

    const second = new DeadLetterQueue({
      maxRetries: 5,
      baseDelayMs: 1,
      dlqFile,
      stateFile,
    });

    expect(second.size()).toBe(2);
    const restored = second.getAll().sort((a, b) => a.sequence - b.sequence);
    expect(restored.map((l) => l.sequence)).toEqual([42, 43]);
    expect(restored[0].lastError).toBe('horizon timeout');
    expect(restored[1].attemptCount).toBe(1);
  });

  it('removes persisted entries after successful retry', () => {
    const queue = new DeadLetterQueue({
      maxRetries: 5,
      baseDelayMs: 1,
      dlqFile,
      stateFile,
      loadOnInit: false,
    });

    queue.push(99, 'transient');
    queue.remove(99);

    const reloaded = new DeadLetterQueue({
      maxRetries: 5,
      baseDelayMs: 1,
      dlqFile,
      stateFile,
    });
    expect(reloaded.size()).toBe(0);
  });

  it('ignores corrupted state files instead of crashing', () => {
    fs.writeFileSync(stateFile, '{not-json', 'utf8');
    const queue = new DeadLetterQueue({
      maxRetries: 5,
      baseDelayMs: 1,
      dlqFile,
      stateFile,
    });
    expect(queue.size()).toBe(0);
  });
});
