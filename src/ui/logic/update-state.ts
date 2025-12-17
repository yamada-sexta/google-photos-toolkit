import { generateFilterDescription } from './filter-description-gen';
import getFormData from './utils/getFormData';
import { disableActionBar } from './utils/disable-action-bar';
import { core } from '../../globals';
import type { Filter } from '../../gptk-core';

export function updateUI() {
  function toggleVisibility(element: HTMLElement, toggle: boolean) {
    const allDescendants = <NodeListOf<HTMLElement & { disabled: boolean }>>element.querySelectorAll('*');
    if (toggle) {
      element.style.display = 'block';
      for (const node of allDescendants) node.disabled = false;
    } else {
      element.style.display = 'none';
      for (const node of allDescendants) node.disabled = true;
    }
  }

  async function filterPreviewUpdate() {
    const previewElement = <HTMLSpanElement>document.querySelector('.filter-preview span')!;
    try {
      const description = generateFilterDescription((getFormData('.filters-form') as any) as Filter);
      previewElement.innerText = description;
    } catch {
      previewElement.innerText = 'Failed to generate description';
    }
  }

  function isActiveTab(tabName: string) {
    return (<HTMLInputElement>document.querySelector('input[name="source"]:checked')!).id === tabName;
  }

  function lockedFolderTabState() {
    const lockedFolderTab = <HTMLInputElement>document.getElementById('lockedFolder')!;
    if (!window.location.href.includes('lockedfolder')) {
      lockedFolderTab.disabled = true;
      lockedFolderTab.parentElement!.title = 'To process items in the locked folder, you must open GPTK while in it';
    }
  }

  function updateActionButtonStates() {
    (<HTMLButtonElement>document.getElementById('unArchive')!).disabled = archivedExcluded;
    (<HTMLButtonElement>document.getElementById('toFavorite')!).disabled = favoritesOnly || isActiveTab('favorites');
    (<HTMLButtonElement>document.getElementById('unFavorite')!).disabled = favoritesExcluded;
    (<HTMLButtonElement>document.getElementById('toArchive')!).disabled = archivedOnly;
    (<HTMLButtonElement>document.getElementById('restoreTrash')!).disabled = !isActiveTab('trash');
    (<HTMLButtonElement>document.getElementById('toTrash')!).disabled = isActiveTab('trash');
    (<HTMLButtonElement>document.getElementById('lock')!).disabled = isActiveTab('lockedFolder');
    (<HTMLButtonElement>document.getElementById('unLock')!).disabled = !isActiveTab('lockedFolder');
    (<HTMLButtonElement>document.getElementById('copyDescFromOther')!).disabled = isActiveTab('trash');
  }

  function updateFilterVisibility() {
    const filterElements = {
      livePhotoType: <HTMLElement>document.querySelector('.type input[value=live]')!.parentElement,
      includeAlbums: <HTMLElement>document.querySelector('.include-albums'),
      owned: <HTMLElement>document.querySelector('.owned'),
      search: <HTMLElement>document.querySelector('.search'),
      favorite: <HTMLElement>document.querySelector('.favorite'),
      quality: <HTMLElement>document.querySelector('.quality'),
      size: <HTMLElement>document.querySelector('.size'),
      filename: <HTMLElement>document.querySelector('.filename'),
      description: <HTMLElement>document.querySelector('.description'),
      space: <HTMLElement>document.querySelector('.space'),
      excludeAlbums: <HTMLElement>document.querySelector('.exclude-albums'),
      uploadStatus: <HTMLElement>document.querySelector('.upload-status'),
      archive: <HTMLElement>document.querySelector('.archive'),
      excludeShared: <HTMLElement>document.querySelector('.exclude-shared'),
      excludeFavorite: <HTMLElement>document.querySelector('.exclude-favorites'),
    };

    // Default: hide all
    Object.values(filterElements).forEach((el) => toggleVisibility(el, false));

    // Conditions for showing filters based on the active tab.
    if (isActiveTab('albums')) {
      toggleVisibility(filterElements.includeAlbums, true);
    }
    if (['library', 'search', 'favorites'].some(isActiveTab)) {
      toggleVisibility(filterElements.owned, true);
      toggleVisibility(filterElements.uploadStatus, true);
      toggleVisibility(filterElements.archive, true);
    }
    if (isActiveTab('search')) {
      toggleVisibility(filterElements.search, true);
      toggleVisibility(filterElements.favorite, true);
    }
    if (!isActiveTab('trash')) {
      toggleVisibility(filterElements.livePhotoType, true);
      toggleVisibility(filterElements.quality, true);
      toggleVisibility(filterElements.size, true);
      toggleVisibility(filterElements.filename, true);
      toggleVisibility(filterElements.description, true);
      toggleVisibility(filterElements.space, true);
      if (!isActiveTab('lockedFolder')) {
        toggleVisibility(filterElements.excludeAlbums, true);
      }
      if (!isActiveTab('sharedLinks')) {
        toggleVisibility(filterElements.excludeShared, true);
      }
    }
    if (isActiveTab('library')) {
      toggleVisibility(filterElements.excludeFavorite, true);
    }
  }

  lockedFolderTabState();

  const filter = getFormData('.filters-form');

  // console.log(filter);

  const favoritesOnly = filter.favorite === 'true';
  const favoritesExcluded = filter.excludeFavorites === 'true' || filter.favorite === 'false';
  const archivedOnly = filter.archived === 'true';
  const archivedExcluded = filter.archived === 'false';

  if (core.isProcessRunning) {
    disableActionBar(true);
    (<HTMLElement>document.getElementById('stopProcess')!).style.display = 'block';
  } else {
    (<HTMLElement>document.getElementById('stopProcess')!).style.display = 'none';
    disableActionBar(false);
    updateActionButtonStates();
  }

  updateFilterVisibility();
  filterPreviewUpdate();
}
