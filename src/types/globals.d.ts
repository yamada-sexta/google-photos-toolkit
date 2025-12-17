// Global typings for user-script environment and exposed GPTK globals

declare global {
  interface Window {
    gptkApi: import('../api/api').default;
    gptkCore: import('../gptk-core').default;
    gptkApiUtils: import('../api/api-utils').default;
  }

  // Provided by Tampermonkey/Greasemonkey in user-script context
  const unsafeWindow: Window & typeof globalThis;
}

export {};
