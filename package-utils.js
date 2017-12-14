/* eslint-disable no-console */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const rollup = require('rollup');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const rollupTs = require('rollup-plugin-typescript2');
const uglify = require('rollup-plugin-uglify');
const { minify } = require('uglify-es');
const typescript = require('typescript');

function fail(message) {
  console.error('ERROR: ' + message);
  process.exit(1);
}
exports.fail = fail;

function run(cl, options = {}) {
  console.log();
  console.log('> ' + cl);

  const opts = { stdio: 'inherit', ...options };
  let output;
  try {
    output = execSync(cl, opts);
  } catch (err) {
    if (opts.stdio === 'inherit') {
      console.error(err.output ? err.output.toString() : err.message);
    }
    process.exit(1);
  }

  return (output || '').toString().trim();
}
exports.run = run;

function npmIntall(packagePath) {
  run(`cd ${path.dirname(packagePath)} && npm install && cd ${__dirname}`);
}
exports.npmInstall = npmIntall;

exports.npmInstallTask = function(packagePath) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath).toString());
  if (packageJson) {
    if (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0) {
      fail(
        'Task package.json should not contain dev dependencies. Offending package.json: ' +
          packagePath
      );
    }
    npmInstall(packagePath);
  }
};

exports.tfxCommand = function(extensionPath, params = '') {
  run(
    `${path.join(
      __dirname,
      'node_modules/.bin/tfx'
    )} extension create --output-path "../" ${params}`,
    {
      cwd: path.join(__dirname, extensionPath)
    }
  );
};

exports.pathAllFiles = function(...paths) {
  return path.join(...paths, '**', '*');
};

exports.bundleTsTask = function(path, destPath) {
  return rollup
    .rollup({
      input: path,
      plugins: [
        rollupTs({ typescript }),
        resolve({ jsnext: true, browser: false }),
        commonjs({
          sourceMap: false,
          namedExports: {
            'node_modules/request/index.js': ['get'],
            'node_modules/fs-extra/lib/index.js': ['ensureDirSync', 'writeFileSync']
          }
        }),
        uglify({}, minify)
      ],
      external: [
        'process',
        'events',
        'stream',
        'util',
        'path',
        'buffer',
        'querystring',
        'url',
        'string_decoder',
        'punycode',
        'http',
        'https',
        'os',
        'assert',
        'constants',
        'timers',
        'console',
        'vm',
        'zlib',
        'tty',
        'domain',
        'dns',
        'dgram',
        'child_process',
        'cluster',
        'module',
        'net',
        'readline',
        'repl',
        'tls',
        'fs',
        'crypto'
      ]
    })
    .then(
      bundle =>
        bundle.write({
          file: destPath,
          format: 'cjs'
        }),
      err => {
        console.error('\nRollup error: ' + err.message);
        process.exit(1);
      }
    );
};
