import { updateUI } from './update-state';

export default async function filterListenersSetUp(): Promise<void> {
  function resetDateInput(event: Event): void {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) {
      console.warn('resetDateInput: event has no currentTarget');
      return;
    }
    const parent = el.parentElement;
    const input = parent?.querySelector<HTMLInputElement>('input');
    if (!input) {
      console.warn('resetDateInput: input element not found');
      return;
    }
    input.value = '';
    updateUI();
  }

  function toggleClicked(event: Event): void {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) {
      console.warn('toggleClicked: event has no currentTarget');
      return;
    }
    el.classList.add('clicked');
    setTimeout(() => {
      el.classList.remove('clicked');
    }, 500);
  }

  function resetAllFilters(): void {
    const form = document.querySelector<HTMLFormElement>('.filters-form');
    if (!form) {
      console.warn('resetAllFilters: .filters-form not found');
      return;
    }
    form.reset();
    updateUI();
  }

  const resetDateButtons = document.querySelectorAll<HTMLElement>('[name="dateReset"]');
  for (const resetButton of resetDateButtons) {
    if (!!resetButton) resetButton.addEventListener('click', resetDateInput);
  }

  // reset all filters button

  const filterResetButton = document.querySelector<HTMLElement>('#filterResetButton');
  if (!!filterResetButton) filterResetButton.addEventListener('click', resetAllFilters);

  // date reset button animation
  const dateResets = document.querySelectorAll<HTMLElement>('.date-reset');
  for (const reset of dateResets) {
    if (!!reset) reset.addEventListener('click', toggleClicked);
  }
}
