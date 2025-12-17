import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import userScriptMetadataBlock from './metadata.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadJSON = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const pkg = loadJSON('../package.json');

// CSS as text with minimal whitespace adjustments, to match prior Rollup transform
const cssAsTextPlugin = {
  name: 'css-as-text',
  setup(build) {
    const fsPromises = fs.promises;
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const source = await fsPromises.readFile(args.path, 'utf8');
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

const isWatch = process.argv.includes('--watch');

async function build() {
  const bannerText = userScriptMetadataBlock();

  const buildOptions = {
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'iife',
    outfile: pkg.main,
    sourcemap: false,
    banner: { js: bannerText },
    define: {
      __VERSION__: JSON.stringify(pkg.version),
      __HOMEPAGE__: JSON.stringify(pkg.homepage),
    },
    loader: {
      '.html': 'text',
    },
    plugins: [cssAsTextPlugin],
    logLevel: 'info',
    target: ['es2020'],
  };

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
