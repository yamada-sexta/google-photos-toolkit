import Api from './api/api';
import ApiUtils from './api/api-utils';
import Core from './gptk-core';

export const core = new Core();
// ApiUtils' JS constructor defaults its first arg to null; cast for TS.
export const apiUtils = new ApiUtils(core as any);

// exposing api to be accesible globally
unsafeWindow.gptkApi = new Api();
unsafeWindow.gptkCore = core;
unsafeWindow.gptkApiUtils = apiUtils;
