// @ts-check
/**
 * @param {{initial?:string,maxLength?:number,onChange?:(v:string)=>void}} [opts]
 */
export function createNumpad(opts = {}) {
  const { initial = '', maxLength = 6, onChange } = opts;
  const wrapper = document.createElement('div');
  let value = initial;

  const display = document.createElement('div');
  display.className = 'numpad-display';
  display.setAttribute('aria-live', 'polite');

  const pad = document.createElement('div');
  pad.className = 'numpad';

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
  for (const key of keys) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = key;
    btn.dataset.key = key;
    btn.addEventListener('click', () => press(key));
    pad.appendChild(btn);
  }

  function press(key) {
    if (key === 'C') value = '';
    else if (key === '⌫') value = value.slice(0, -1);
    else if (value.length < maxLength) value += key;
    render();
    if (onChange) onChange(value);
  }

  function render() {
    display.textContent = value || '·';
  }

  render();
  wrapper.append(display, pad);

  return {
    el: wrapper,
    get value() {
      return value;
    },
    set(v) {
      value = String(v ?? '').slice(0, maxLength);
      render();
    }
  };
}
