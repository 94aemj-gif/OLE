import { describe, it, expect } from 'vitest';
import { validateCapture } from '@/modules/capture/validate.js';

const CATALOG = {
  operators: [
    { employee_number: '12345', display_name: 'Ana', role: 'capturist', active: true },
    { employee_number: '12346', display_name: 'Luis', active: false },
    { employee_number: '12350', display_name: 'Supervisión', role: 'viewer', active: true }
  ],
  scrap_reasons: [
    { id: 'SR-01', name: 'Pistón roto', active: true },
    { id: 'SR-OLD', name: 'Legacy', active: false }
  ],
  downtime_reasons: [{ id: 'DR-01', name: 'Junta', active: true }]
};

describe('validateCapture', () => {
  it('accepts a valid units-only capture', () => {
    const r = validateCapture(
      { employee_number: '12345', units_produced: 240, scrap_rows: [], downtime_rows: [] },
      CATALOG
    );
    expect(r.ok).toBe(true);
  });

  it('rejects non-5-digit employee number', () => {
    const r = validateCapture(
      { employee_number: '1234', units_produced: 1, scrap_rows: [], downtime_rows: [] },
      CATALOG
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatchObject({ field: 'employee_number', code: 'invalid_format' });
  });

  it('rejects an inactive or unknown operator', () => {
    const r1 = validateCapture(
      { employee_number: '99999', units_produced: 1, scrap_rows: [], downtime_rows: [] },
      CATALOG
    );
    expect(r1.errors[0].code).toBe('unknown');

    const r2 = validateCapture(
      { employee_number: '12346', units_produced: 1, scrap_rows: [], downtime_rows: [] },
      CATALOG
    );
    expect(r2.errors[0].code).toBe('unknown');
  });

  it('rejects a viewer (read-only role) from capturing', () => {
    const r = validateCapture(
      { employee_number: '12350', units_produced: 240, scrap_rows: [], downtime_rows: [] },
      CATALOG
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'viewer_readonly')).toBe(true);
  });

  it('rejects zero-everything capture', () => {
    const r = validateCapture(
      { employee_number: '12345', units_produced: 0, scrap_rows: [], downtime_rows: [] },
      CATALOG
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'empty_capture')).toBe(true);
  });

  it('rejects scrap > units', () => {
    const r = validateCapture(
      {
        employee_number: '12345',
        units_produced: 10,
        scrap_rows: [{ reason_id: 'SR-01', pieces: 11 }],
        downtime_rows: []
      },
      CATALOG
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'exceeds_units')).toBe(true);
  });

  it('rejects inactive scrap reason', () => {
    const r = validateCapture(
      {
        employee_number: '12345',
        units_produced: 10,
        scrap_rows: [{ reason_id: 'SR-OLD', pieces: 1 }],
        downtime_rows: []
      },
      CATALOG
    );
    expect(r.errors.some((e) => e.code === 'unknown_reason')).toBe(true);
  });

  it('accepts downtime-only capture (no units)', () => {
    const r = validateCapture(
      {
        employee_number: '12345',
        units_produced: 0,
        scrap_rows: [],
        downtime_rows: [{ reason_id: 'DR-01', minutes: 15 }]
      },
      CATALOG
    );
    expect(r.ok).toBe(true);
  });
});
