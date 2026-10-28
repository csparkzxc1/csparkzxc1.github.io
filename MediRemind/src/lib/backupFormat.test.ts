import { describe, expect, it } from '@jest/globals';
import { parseBundle } from './backupFormat';
import { dose, medicine } from '../test/factories';

describe('parseBundle', () => {
  it('accepts a valid backup and keeps its records', () => {
    const bundle = parseBundle({
      app: 'mediremind',
      schemaVersion: 1,
      exportedAt: '2026-03-01T00:00:00Z',
      medicines: [medicine()],
      doseRecords: [dose('2026-03-01', true)],
    });
    expect(bundle.medicines).toHaveLength(1);
    expect(bundle.doseRecords).toHaveLength(1);
  });

  it('rejects files from other apps', () => {
    expect(() => parseBundle({ app: 'other', medicines: [] })).toThrow();
    expect(() => parseBundle(null)).toThrow();
  });

  it('rejects backups from a newer schema', () => {
    expect(() => parseBundle({ app: 'mediremind', schemaVersion: 99, medicines: [] })).toThrow();
  });

  it('drops malformed entries instead of failing the whole import', () => {
    const bundle = parseBundle({
      app: 'mediremind',
      medicines: [medicine(), { id: 'broken' }],
      doseRecords: [{ nope: true }],
    });
    expect(bundle.medicines).toHaveLength(1);
    expect(bundle.doseRecords).toHaveLength(0);
  });
});
