// @ts-check
const VALID_ACTIONS = new Set([
  'CAPTURE_CREATE',
  'CAPTURE_UNDO',
  'CATALOG_EDIT',
  'DAY_RESET',
  'DEAD_LETTER_CREATE',
  'DEAD_LETTER_REPLAY',
  'DEAD_LETTER_DISCARD',
  'MANAGER_PIN_ROTATE',
  'MANAGER_DEACTIVATE'
]);

/**
 * @param {Object} input
 * @param {'operator'|'manager'|'system'} input.actorType
 * @param {string} input.actorId
 * @param {string} input.actorName
 * @param {string} input.action
 * @param {string|null=} input.entityType
 * @param {string|null=} input.entityId
 * @param {Record<string,unknown>=} input.detail
 */
export function buildAuditEntry(input) {
  if (!VALID_ACTIONS.has(input.action)) {
    throw new Error(`Unknown audit action: ${input.action}`);
  }
  if (!input.actorName) {
    throw new Error('actor_name required (denormalized for read-time stability)');
  }
  return {
    actor_type: input.actorType,
    actor_id: input.actorId,
    actor_name: input.actorName,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    detail: input.detail ?? {}
  };
}

/** @param {{insertAudit:(entry:any)=>Promise<any>}} client */
export function makeAuditWriter(client) {
  return {
    async write(input) {
      const entry = buildAuditEntry(input);
      await client.insertAudit(entry);
      return entry;
    },
    build: buildAuditEntry
  };
}
