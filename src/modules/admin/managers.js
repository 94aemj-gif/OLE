// @ts-check
import { hashPin, newSalt } from '../auth/pin.js';
import { mergeCatalog, patchCatalog } from './catalog-store.js';

/**
 * @param {any} client
 * @param {{id:string, display_name:string, pin:string}} input
 */
export async function createManager(client, input) {
  const pin_salt = newSalt();
  const pin_hash = await hashPin(input.pin, pin_salt);
  return patchCatalog(client, (data) =>
    mergeCatalog(data, {
      managers: [
        ...(data.managers ?? []),
        {
          id: input.id,
          display_name: input.display_name,
          pin_salt,
          pin_hash,
          active: true,
          created_at: new Date().toISOString()
        }
      ]
    })
  );
}

/**
 * @param {any} client
 * @param {{id:string, new_pin:string}} input
 */
export async function rotateManagerPin(client, input) {
  const pin_salt = newSalt();
  const pin_hash = await hashPin(input.new_pin, pin_salt);
  return patchCatalog(client, (data) => ({
    ...data,
    managers: (data.managers ?? []).map((m) =>
      m.id === input.id ? { ...m, pin_salt, pin_hash } : m
    )
  }));
}

/**
 * @param {any} client
 * @param {{id:string}} input
 */
export async function deactivateManager(client, input) {
  return patchCatalog(client, (data) => ({
    ...data,
    managers: (data.managers ?? []).map((m) => (m.id === input.id ? { ...m, active: false } : m))
  }));
}
