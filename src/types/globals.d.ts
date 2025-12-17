// Global typings for user-script environment and exposed GPTK globals

export { };

declare global {
  const __VERSION__: string;
  const __HOMEPAGE__: string;
  const __BUILD_DATE__: string;
  const GM_registerMenuCommand: (name: string, func: (e: MouseEvent | KeyboardEvent) => void, options_or_accessKey: {
    accessKey?: string;
    insertBefore?: string;
    autoClose?: boolean;
  } | string) => void;

  interface Window {
    gptkApi: import('../api/api').default;
    gptkCore: import('../gptk-core').default;
    gptkApiUtils: import('../api/api-utils').default;
    // Google Photos global data bag used by GPTK
    WIZ_global_data: any;
    trustedTypes?: TrustedTypePolicyFactory;
  }
}

/// <reference types="greasemonkey" />
