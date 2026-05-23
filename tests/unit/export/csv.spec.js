import { describe, it, expect } from 'vitest';
import { buildCaptureCsv } from '@/modules/export/csv.js';

const SNAPSHOT = {
  unitsProduced: 470,
  scrapUnits: 8,
  goodUnits: 462,
  plannedMinutes: 450,
  runMinutes: 435,
  downtimeMinutes: 15,
  availability: 0.9667,
  performance: 0.92,
  quality: 0.983,
  oee: 0.875
};

const captures = [
  {
    client_timestamp: '2026-05-22T12:00:00Z',
    line_id: 'L-01',
    operator_number: '12345',
    shift_id: 'M',
    units_produced: 240,
    scrap_rows: [{ pieces: 5 }],
    downtime_rows: [{ minutes: 15 }]
  },
  {
    client_timestamp: '2026-05-22T13:00:00Z',
    line_id: 'L-01',
    operator_number: '12345',
    shift_id: 'M',
    units_produced: 230,
    scrap_rows: [{ pieces: 3 }],
    downtime_rows: []
  },
  {
    client_timestamp: '2026-05-22T14:00:00Z',
    line_id: 'L-01',
    operator_number: '12345',
    shift_id: 'M',
    units_produced: 999,
    scrap_rows: [],
    downtime_rows: [],
    undone: true
  }
];

describe('buildCaptureCsv', () => {
  it('includes header, one row per non-undone capture, and aggregates', () => {
    const csv = buildCaptureCsv({ captures, snapshot: SNAPSHOT });
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('capture_timestamp');
    expect(lines[1]).toContain('12345');
    expect(lines.length).toBe(1 + 2 + 1 + 10); // header + 2 captures + blank + 10 aggregates (1 blank + 10 rows includes blank row)
    expect(csv).toContain('__aggregate_oee,0.8750');
    expect(csv).toContain('__aggregate_availability,0.9667');
  });

  it('omits undone captures', () => {
    const csv = buildCaptureCsv({ captures, snapshot: SNAPSHOT });
    expect(csv).not.toContain('999');
  });

  it('escapes commas, quotes, and newlines in cells', () => {
    const csv = buildCaptureCsv({
      captures: [
        {
          client_timestamp: 'with, comma',
          line_id: 'has "quote"',
          operator_number: '12345',
          shift_id: 'M',
          units_produced: 1,
          scrap_rows: [],
          downtime_rows: []
        }
      ],
      snapshot: SNAPSHOT
    });
    expect(csv).toContain('"with, comma"');
    expect(csv).toContain('"has ""quote"""');
  });
});
