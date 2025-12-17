
type Manifest = Record<string, string | string[]>;

import data from "../package.json";

function generateComment(manifest: Manifest): string {
  const keys = Object.keys(manifest);
  const largestKey = keys.reduce((a, b) => (a.length > b.length ? a : b), '').length;

  const generateLine = (key: string, value: string): string => `// @${key.padEnd(largestKey, ' ')} ${value}`;

  const lines = Object.entries(manifest)
    .map(([key, value]) => {
      if (Array.isArray(value)) return value.map((v) => generateLine(key, v)).join('\n');
      return generateLine(key, value);
    })
    .join('\n');

  return ['// ==UserScript==', lines, '// ==/UserScript==', ''].join('\n');
}

export default function userScriptMetadataBlock(): string {
  const metadata = {
    name: data.nameFull,
    description: data.description,
    version: data.version,
    author: data.author,
    homepageURL: data.homepage,
    supportURL: data.bugs.url,
    // match: data.userScript.match,
    license: data.license,
    ...data.userScript,
  } as const;

  return generateComment(metadata);
}
