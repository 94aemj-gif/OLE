// @ts-check
import { t } from '../i18n/index.js';

export function createDowntimeRowEditor(reasons) {
  const wrapper = document.createElement('div');
  const rows = [];
  const list = document.createElement('div');
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn';
  addBtn.textContent = t('capture.downtime.add');
  addBtn.addEventListener('click', () => addRow());
  wrapper.append(list, addBtn);

  function addRow(initial = { reason_id: '', minutes: 0 }) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = 'var(--space-3)';
    row.style.alignItems = 'center';
    row.style.marginBottom = 'var(--space-3)';

    const select = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('capture.reason.placeholder');
    select.append(placeholder);
    for (const r of reasons) {
      if (!r.active) continue;
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      select.append(opt);
    }
    select.value = initial.reason_id;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.placeholder = t('capture.downtime.minutes');
    input.value = String(initial.minutes || '');
    input.style.maxWidth = '120px';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn';
    remove.textContent = '−';
    remove.addEventListener('click', () => {
      list.removeChild(row);
      const idx = rows.indexOf(item);
      if (idx >= 0) rows.splice(idx, 1);
    });

    const item = initial;
    select.addEventListener('change', () => (item.reason_id = select.value));
    input.addEventListener('input', () => (item.minutes = Number(input.value) || 0));
    rows.push(item);

    row.append(select, input, remove);
    list.append(row);
  }

  return {
    el: wrapper,
    get rows() {
      return rows.filter((r) => r.reason_id && r.minutes > 0);
    }
  };
}
