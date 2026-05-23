-- Seed catalog: 2 lines, 3 shifts (with breaks), 5 operators, scrap+downtime reasons,
-- one default manager with PIN '1234' (sha256 hash hardcoded — dev only).

insert into public.config (id, data)
values (1, jsonb_build_object(
  'plant', jsonb_build_object(
    'timezone', 'America/Mexico_City',
    'default_language', 'es',
    'hourly_alert_audio', true
  ),
  'lines', jsonb_build_array(
    jsonb_build_object(
      'id', 'L-01',
      'display_name', 'Línea #1 — Jeringa Neomed 60ml',
      'hourly_target', 250,
      'assigned_tablet_id', null,
      'active', true
    ),
    jsonb_build_object(
      'id', 'L-02',
      'display_name', 'Línea #2 — Jeringa Neomed 35ml',
      'hourly_target', 300,
      'assigned_tablet_id', null,
      'active', true
    )
  ),
  'shifts', jsonb_build_array(
    jsonb_build_object(
      'id', 'S-MORNING',
      'name', 'Turno Matutino',
      'start', '06:00', 'end', '14:00',
      'breaks', jsonb_build_array(
        jsonb_build_object('name', 'Almuerzo', 'start', '10:00', 'end', '10:30')
      )
    ),
    jsonb_build_object(
      'id', 'S-EVENING',
      'name', 'Turno Vespertino',
      'start', '14:00', 'end', '22:00',
      'breaks', jsonb_build_array(
        jsonb_build_object('name', 'Cena', 'start', '18:00', 'end', '18:30')
      )
    ),
    jsonb_build_object(
      'id', 'S-NIGHT',
      'name', 'Turno Nocturno',
      'start', '22:00', 'end', '06:00',
      'breaks', jsonb_build_array(
        jsonb_build_object('name', 'Pausa', 'start', '02:00', 'end', '02:30')
      )
    )
  ),
  'operators', jsonb_build_array(
    jsonb_build_object('employee_number','12345','display_name','Ana López','active',true),
    jsonb_build_object('employee_number','12346','display_name','Luis Torres','active',true),
    jsonb_build_object('employee_number','12347','display_name','Marta García','active',true),
    jsonb_build_object('employee_number','12348','display_name','Carlos Ruiz','active',true),
    jsonb_build_object('employee_number','12349','display_name','Sofía Pérez','active',true)
  ),
  'scrap_reasons', jsonb_build_array(
    jsonb_build_object('id','SR-01','name','Pistón roto','active',true,'sort_order',1),
    jsonb_build_object('id','SR-02','name','Empaque defectuoso','active',true,'sort_order',2),
    jsonb_build_object('id','SR-03','name','Calidad fuera de spec','active',true,'sort_order',3),
    jsonb_build_object('id','SR-04','name','Contaminación','active',true,'sort_order',4),
    jsonb_build_object('id','SR-05','name','Material defectuoso','active',true,'sort_order',5),
    jsonb_build_object('id','SR-06','name','Otro','active',true,'sort_order',99)
  ),
  'downtime_reasons', jsonb_build_array(
    jsonb_build_object('id','DR-01','name','Junta de producción','active',true,'sort_order',1),
    jsonb_build_object('id','DR-02','name','Capacitación','active',true,'sort_order',2),
    jsonb_build_object('id','DR-03','name','Cambio de material','active',true,'sort_order',3),
    jsonb_build_object('id','DR-04','name','Mantenimiento preventivo','active',true,'sort_order',4),
    jsonb_build_object('id','DR-05','name','Falla mecánica','active',true,'sort_order',5),
    jsonb_build_object('id','DR-06','name','Otro','active',true,'sort_order',99)
  ),
  'managers', jsonb_build_array(
    jsonb_build_object(
      'id','MGR-DEV-001',
      'display_name','Maestro de Pruebas',
      'pin_hash','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
      'active',true,
      'created_at','2026-05-22T00:00:00Z'
    )
  ),
  'health_thresholds', jsonb_build_object(
    'heartbeat_max_age_seconds', 300,
    'queue_depth_max', 50,
    'delta_max', 0
  )
))
on conflict (id) do update set data = excluded.data, updated_at = now();
