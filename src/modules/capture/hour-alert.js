// @ts-check
import { t } from '../i18n/index.js';

export function startHourAlert({ enabled, onTick }) {
  let timer;
  function schedule() {
    const now = new Date();
    const ms = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
    timer = setTimeout(
      () => {
        if (enabled()) onTick(t('capture.cta'));
        schedule();
      },
      Math.max(ms, 1000)
    );
  }
  schedule();
  return { stop: () => clearTimeout(timer) };
}
