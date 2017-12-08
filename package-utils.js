var fs = require('fs-extra');
var path = require('path');
var execSync = require('child_process').execSync;

const fail = (exports.fail = function(message) {
  console.error('ERROR: ' + message);
  process.exit(1);
});

const run = (exports.run = function(cl, options = {}) {
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
});

exports.npmInstallTask = function(packagePath) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath).toString());
  if (packageJson) {
    if (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0) {
      fail(
        'Task package.json should not contain dev dependencies. Offending package.json: ' +
          packagePath
      );
    }
    run(`cd ${path.dirname(packagePath)} && npm install && cd ${__dirname}`);
  }
};

exports.tfxCommand = function(extensionPath, params = '') {
  run(`tfx extension create ${params}`, {
    cwd: path.join(__dirname, extensionPath)
  });
};

exports.pathAllFiles = function(...paths) {
  return path.join(...paths, '**', '*');
};
