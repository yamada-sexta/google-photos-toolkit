import fs from 'fs';
import path from 'path';
import type { BunPlugin } from 'bun';
import userScriptMetadataBlock from './build/metadata.mjs';

const loadJSON = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pkg = loadJSON(path.resolve('./package.json'));

// CSS as text with minimal whitespace adjustments, mirroring esbuild's plugin
const cssAsTextPlugin: BunPlugin = {
  name: 'css-as-text',
  setup(builder) {
    builder.onLoad({ filter: /\.css$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const transformed = source
        .replace(/;\s*\n\s*/g, '; ')
        .replace(/\{\n */g, '{ ')
        .replace(/^\s*\n/gm, '')
        .replace(/;\s(\/\*.+\*\/)\n/g, '; $1 ')
        .trim();
      return { contents: transformed, loader: 'text' };
    });
  },
};

// Build with Bun, mirroring esbuild.mjs behavior
const bannerText = userScriptMetadataBlock();
await Bun.build({
  entrypoints: ['src/index.js'],
  outdir: '.',
  naming: { entry: 'google_photos_toolkit.user.[ext]' },
  format: 'iife',
  target: 'browser',
  splitting: false,
  sourcemap: 'none',
  banner: bannerText,
  define: {
    __VERSION__: JSON.stringify(pkg.version),
    __HOMEPAGE__: JSON.stringify(pkg.homepage),
  },
  loader: {
    '.html': 'text',
  },
  plugins: [cssAsTextPlugin],
});