import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  DeadLetterQueue,
  atomicAppendLine,
  atomicWriteFile,
} from '../DeadLetterQueue';

describe('DeadLetterQueue atomic writes (#434)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlq-atomic-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('atomicWriteFile replaces the destination via rename', () => {
    const file = path.join(tmpDir, 'state.json');
    atomicWriteFile(file, '{"a":1}\n');
    expect(fs.readFileSync(file, 'utf8')).toBe('{"a":1}\n');
    atomicWriteFile(file, '{"a":2}\n');
    expect(fs.readFileSync(file, 'utf8')).toBe('{"a":2}\n');
    const leftovers = fs.readdirSync(tmpDir).filter((n) => n.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });

  it('atomicAppendLine appends without leaving a torn final line', () => {
    const file = path.join(tmpDir, 'dead-letter-queue.log');
    atomicAppendLine(file, 'line-one\n');
    atomicAppendLine(file, 'line-two\n');
    expect(fs.readFileSync(file, 'utf8')).toBe('line-one\nline-two\n');
  });

  it('writes terminally failed ledgers through the atomic append path', () => {
    const dlqFile = path.join(tmpDir, 'dead-letter-queue.log');
    const stateFile = path.join(tmpDir, 'dead-letter-queue-state.json');
    const queue = new DeadLetterQueue({
      maxRetries: 2,
      baseDelayMs: 1,
      dlqFile,
      stateFile,
      loadOnInit: false,
    });

    queue.push(100, 'first');
    expect(fs.existsSync(dlqFile)).toBe(false);

    queue.push(100, 'second');
    expect(fs.existsSync(dlqFile)).toBe(true);
    const contents = fs.readFileSync(dlqFile, 'utf8');
    expect(contents).toContain('Terminally failed ledger');
    expect(contents).toContain('"sequence":100');
    expect(queue.size()).toBe(0);
  });
});
