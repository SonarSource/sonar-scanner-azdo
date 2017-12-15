/* eslint-disable no-console */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

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

function npmInstall(packagePath) {
  run(`cd ${path.dirname(packagePath)} && npm install && cd ${__dirname}`);
}
exports.npmInstall = npmInstall;

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

exports.getAllTasksOfType = function(tasksPath, type) {
  return fs
    .readdirSync(tasksPath)
    .filter(folder => fs.pathExistsSync(path.join(tasksPath, folder, type)));
};

exports.fullVersion = function(version) {
  const buildNumber = process.env.TRAVIS_BUILD_NUMBER;
  if (version.endsWith('-SNAPSHOT') && buildNumber) {
    return version.replace('-SNAPSHOT', '.' + buildNumber);
  }
  return version;
};
