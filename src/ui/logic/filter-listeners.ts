import { updateUI } from './update-state';

export default async function filterListenersSetUp(): Promise<void> {
  function resetDateInput(this: HTMLElement): void {
    const parent = this.parentNode as Element | null;
    const closestInput = parent?.querySelector<HTMLInputElement>('input') ?? null;
    if (!closestInput) return;
    closestInput.value = '';
    updateUI();
  }

  function toggleClicked(this: HTMLElement): void {
    this.classList.add('clicked');
    setTimeout(() => {
      this.classList.remove('clicked');
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
    resetButton.addEventListener('click', resetDateInput);
  }

  // reset all filters button

  const filterResetButton = document.querySelector<HTMLElement>('#filterResetButton');
  if (filterResetButton) filterResetButton.addEventListener('click', resetAllFilters);

  // date reset button animation
  const dateResets = document.querySelectorAll<HTMLElement>('.date-reset');
  for (const reset of dateResets) {
    reset.addEventListener('click', toggleClicked);
  }
}
