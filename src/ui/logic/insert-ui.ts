import gptkMainTemplate from '../markup/gptk-main-template.html';
import buttonHtml from '../markup/gptk-button.html';
import css from '../markup/style.css';
import { updateUI } from './update-state';

const version = `v${__VERSION__} (BUILD: ${__BUILD_DATE__})`;
const homepage = __HOMEPAGE__;

function htmlTemplatePrep(template: string): string {
  return template.replace('%version%', version).replace('%homepage%', homepage);
}

export function insertUi() {
  // for inserting html to work
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    window.trustedTypes.createPolicy('default', {
      createHTML: (value: string) => value,
    });
  }
  // html
  let buttonInsertLocation = '.J3TAe';
  if (window.location.href.includes('lockedfolder')) buttonInsertLocation = '.c9yG5b';
  const buttonContainer = document.querySelector<HTMLElement>(buttonInsertLocation);
  if (buttonContainer) {
    buttonContainer.insertAdjacentHTML('afterbegin', buttonHtml);
  }
  document.body.insertAdjacentHTML('afterbegin', htmlTemplatePrep(gptkMainTemplate));
  // css
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  baseListenersSetUp();
}

export function showMainMenu() {
  const overlay = document.querySelector<HTMLElement>('.overlay');
  const gptk = document.getElementById('gptk') as HTMLElement | null;
  if (!overlay || !gptk) {alert('Missing overlay or gptk element'); return};

  gptk.style.display = 'flex';
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function hideMainMenu() {
  const overlay = document.querySelector<HTMLElement>('.overlay');
  const gptk = document.getElementById('gptk') as HTMLElement | null;
  if (!overlay || !gptk) {alert('Missing overlay or gptk element'); return};

  gptk.style.display = 'none';
  overlay.style.display = 'none';
  document.body.style.overflow = 'visible';
}

function baseListenersSetUp() {
  document.addEventListener('change', () => updateUI());

  const gptkButton = document.getElementById('gptk-button');
  gptkButton?.addEventListener('click', showMainMenu);

  const exitMenuButton = document.querySelector<HTMLElement>('#hide');
  exitMenuButton?.addEventListener('click', hideMainMenu);
}
