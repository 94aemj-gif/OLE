// @ts-check
import { wipeLocalShift } from './sequence.js';

/**
 * Idempotent event applier. Wired into the sync loop so a receiving
 * device wipes local state when it pulls a day_reset event it hasn't
 * applied before.
 *
 * @param {{id:string, kind:string, payload?:any}} event
 */
export function handleEventLocally(event) {
  if (event.kind !== 'day_reset') return;
  wipeLocalShift();
}
