// @ts-check
/**
 * Error banner enforcing the Principle III contract: title + cause + action.
 *
 * @param {{title:string, cause:string, action:string}} props
 */
export function createErrorBanner({ title, cause, action }) {
  const el = document.createElement('div');
  el.className = 'error-banner';
  el.setAttribute('role', 'alert');
  const titleEl = document.createElement('strong');
  titleEl.textContent = title;
  const causeEl = document.createElement('span');
  causeEl.textContent = cause;
  const actionEl = document.createElement('span');
  actionEl.textContent = action;
  el.append(titleEl, causeEl, actionEl);
  return el;
}
