import fs from 'fs';

type ManifestValue = string | string[];
type Manifest = Record<string, ManifestValue>;

const loadJSON = <T>(relPath: string): T => {
  return JSON.parse(
    fs.readFileSync(new URL(relPath, import.meta.url), 'utf8')
  );
};

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

interface PackageJSON {
  nameFull: string;
  description: string;
  version: string;
  author: string;
  homepage: string;
  bugs: { url: string };
  userScript: Record<string, ManifestValue>;
  license: string;
}

export default function userScriptMetadataBlock(): string {
  const pkg = loadJSON<PackageJSON>('../package.json');

  const metadata: Manifest = {
    name: pkg.nameFull,
    description: pkg.description,
    version: pkg.version,
    author: pkg.author,
    homepageURL: pkg.homepage,
    supportURL: pkg.bugs.url,
    match: pkg.userScript.match as ManifestValue,
    license: pkg.license,
    ...pkg.userScript,
  };

  return generateComment(metadata);
}
