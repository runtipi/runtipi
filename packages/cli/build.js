const { build } = require('esbuild');

const commandArgs = process.argv.slice(2);

async function bundle() {
  const start = Date.now();
  const options = {
    entryPoints: ['./src/index.ts'],
    outfile: './dist/index.js',
    platform: 'node',
    target: 'node20',
    bundle: true,
    color: true,
    sourcemap: commandArgs.includes('--sourcemap'),
  };

  await build({ ...options, minify: true });
  console.log(`Build time: ${Date.now() - start}ms`);
}

bundle();
