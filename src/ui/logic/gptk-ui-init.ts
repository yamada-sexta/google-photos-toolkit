import { insertUi } from './insert-ui';
import { updateUI } from './update-state';
import log from './log';
import getFromStorage from '../../utils/getFromStorage';
import { addAlbums } from './album-selects-update';
import { actionsListenersSetUp } from './action-bar';
import { albumSelectsControlsSetUp } from './album-selects-controls';
import controlButttonsListeners from './main-control-buttons';
import advancedSettingsListenersSetUp from './advanced-settings';
import filterListenersSetUp from './filter-listeners';
import registerMenuCommand from './register-menu-command';

export default async function initUI() {
  registerMenuCommand();
  insertUi();
  actionsListenersSetUp();
  filterListenersSetUp();
  controlButttonsListeners();
  albumSelectsControlsSetUp();
  advancedSettingsListenersSetUp();
  updateUI();

  const cachedAlbums = getFromStorage('albums');
  if (cachedAlbums) {
    log('Cached Albums Restored');
    addAlbums(cachedAlbums);
  }

  // confirm exit if process is running
  window.addEventListener('beforeunload', function (e) {
    if (unsafeWindow.gptkCore.isProcessRunning) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
