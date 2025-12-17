import fs, { watch } from 'fs';
import path from 'path';
import type { BunPlugin } from 'bun';
import userScriptMetadataBlock from './build/metadata';

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




async function buildOnce({ banner }: { banner: string }) {
    await Bun.build({
        entrypoints: ['src/index.ts'],
        outdir: '.',
        naming: { entry: 'google_photos_toolkit.user.[ext]' },
        format: 'iife',
        target: 'browser',
        splitting: false,
        sourcemap: 'none',
        banner,
        define: {
            __VERSION__: JSON.stringify(pkg.version),
            __HOMEPAGE__: JSON.stringify(pkg.homepage),
            __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
        },
        loader: {
            '.html': 'text',
        },
        plugins: [cssAsTextPlugin],
    });
    console.log('Build completed.');
}

// Check if there is --dev argument
const isDevMode = process.argv.includes('--dev');

const OUT_FILE_NAME = 'google_photos_toolkit.user.js';
const OUT_FILE_PATH = path.resolve(`./${OUT_FILE_NAME}`);

if (isDevMode) {
    const port = Number(process.env.PORT || 3001);
    const url = `http://localhost:${port}/${OUT_FILE_NAME}`;
    // Build with Bun, mirroring esbuild.mjs behavior
    const bannerText = userScriptMetadataBlock({
        urlOverrides: url
    });

    // Initial build so the file exists before serving
    await buildOnce({ banner: bannerText });

    // Watch for changes and rebuild
    const srcWatcher = watch(
        path.resolve('./src'),
        { recursive: true },
        async (event, filename) => {
            console.log(`Detected ${event} in ${filename} (src)`);
            await buildOnce({ banner: bannerText });
        }
    );


    const server = Bun.serve({
        port,
        fetch: async (req) => {
            const url = new URL(req.url);
            if (url.pathname === '/' || url.pathname === `/${OUT_FILE_NAME}`) {
                if (!fs.existsSync(OUT_FILE_PATH)) {
                    return new Response('Build artifact not found. Try again after rebuild.', { status: 503 });
                }
                const file = Bun.file(OUT_FILE_PATH);
                return new Response(file, {
                    headers: {
                        'content-type': 'application/javascript; charset=utf-8',
                        'cache-control': 'no-store',
                    },
                });
            }
            return new Response('Not Found', { status: 404 });
        },
    });

    console.log(`Dev server running at ${url}`);
    console.log('Watching for changes in src/ ...');

    process.on('SIGINT', () => {
        try { server.stop(); } catch { }
        srcWatcher.close();
        process.exit(0);
    });
} else {
    // Single build
    const bannerText = userScriptMetadataBlock({});
    await buildOnce({ banner: bannerText });
}




