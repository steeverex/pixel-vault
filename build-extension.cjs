const esbuild = require('esbuild');

async function buildExtension() {
  // Build content script - IIFE for direct injection
  await esbuild.build({
    entryPoints: ['src/extension/content-script.ts'],
    bundle: true,
    outfile: 'dist/content-script.js',
    platform: 'browser',
    target: 'chrome100',
    format: 'iife',
    external: ['chrome'],
    loader: {
      '.ts': 'ts'
    }
  });

  // Build background script - IIFE (no ES module features used)
  await esbuild.build({
    entryPoints: ['src/extension/background.ts'],
    bundle: true,
    outfile: 'dist/background.js',
    platform: 'browser',
    target: 'chrome100',
    format: 'iife',
    external: ['chrome'],
    loader: {
      '.ts': 'ts'
    }
  });

  console.log('Extension files built successfully');
}

buildExtension().catch(console.error);