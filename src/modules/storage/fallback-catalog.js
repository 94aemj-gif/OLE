// @ts-check
import { localStore } from './local-store.js';

/**
 * In-memory seeded catalog used when DATABASE_URL is not set on the
 * deployment. Mirrors `db/seed.sql` so testing without a
 * Neon project still surfaces all roles, including the manager PIN flow.
 */
export const FALLBACK_CATALOG = {
  plant: {
    timezone: 'America/Mexico_City',
    default_language: 'es',
    hourly_alert_audio: true
  },
  lines: [
    {
      id: 'L-01',
      display_name: 'Línea #1 — Jeringa Neomed 60ml',
      hourly_target: 250,
      assigned_tablet_id: null,
      active: true
    },
    {
      id: 'L-02',
      display_name: 'Línea #2 — Jeringa Neomed 35ml',
      hourly_target: 300,
      assigned_tablet_id: null,
      active: true
    }
  ],
  shifts: [
    {
      id: 'S-MORNING',
      name: 'Turno Matutino',
      start: '06:00',
      end: '14:00',
      breaks: [{ name: 'Almuerzo', start: '10:00', end: '10:30' }]
    },
    {
      id: 'S-EVENING',
      name: 'Turno Vespertino',
      start: '14:00',
      end: '22:00',
      breaks: [{ name: 'Cena', start: '18:00', end: '18:30' }]
    },
    {
      id: 'S-NIGHT',
      name: 'Turno Nocturno',
      start: '22:00',
      end: '06:00',
      breaks: [{ name: 'Pausa', start: '02:00', end: '02:30' }]
    }
  ],
  operators: [
    { employee_number: '12345', display_name: 'Ana López', active: true },
    { employee_number: '12346', display_name: 'Luis Torres', active: true },
    { employee_number: '12347', display_name: 'Marta García', active: true },
    { employee_number: '12348', display_name: 'Carlos Ruiz', active: true },
    { employee_number: '12349', display_name: 'Sofía Pérez', active: true }
  ],
  scrap_reasons: [
    { id: 'SR-01', name: 'Pistón roto', active: true, sort_order: 1 },
    { id: 'SR-02', name: 'Empaque defectuoso', active: true, sort_order: 2 },
    { id: 'SR-03', name: 'Calidad fuera de spec', active: true, sort_order: 3 },
    { id: 'SR-04', name: 'Contaminación', active: true, sort_order: 4 },
    { id: 'SR-05', name: 'Material defectuoso', active: true, sort_order: 5 },
    { id: 'SR-06', name: 'Otro', active: true, sort_order: 99 }
  ],
  downtime_reasons: [
    { id: 'DR-01', name: 'Junta de producción', active: true, sort_order: 1 },
    { id: 'DR-02', name: 'Capacitación', active: true, sort_order: 2 },
    { id: 'DR-03', name: 'Cambio de material', active: true, sort_order: 3 },
    { id: 'DR-04', name: 'Mantenimiento preventivo', active: true, sort_order: 4 },
    { id: 'DR-05', name: 'Falla mecánica', active: true, sort_order: 5 },
    { id: 'DR-06', name: 'Otro', active: true, sort_order: 99 }
  ],
  managers: [
    {
      id: 'MGR-DEV-001',
      display_name: 'Maestro de Pruebas',
      pin_salt: 'ole-dev-mgr-001-salt',
      pin_hash: '1cb73ed42aeac7a43efb45db1da9d96068ebbb8c9cd30f623de10909c93f64f6',
      active: true,
      created_at: '2026-05-22T00:00:00Z'
    }
  ],
  health_thresholds: {
    heartbeat_max_age_seconds: 300,
    queue_depth_max: 50,
    delta_max: 0
  }
};

/**
 * Returns the catalog already cached in localStorage, or seeds the fallback
 * (persisting it so other pages can read it on the same device).
 */
export function loadOrSeedCatalog() {
  const stored = localStore.get('catalog', null);
  if (stored) return stored;
  localStore.set('catalog', FALLBACK_CATALOG);
  return FALLBACK_CATALOG;
}
