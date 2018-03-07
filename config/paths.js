const path = require('path');
const fs = require('fs-extra');

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());

function resolveApp(relativePath) {
  return path.resolve(appDirectory, relativePath);
}
exports.resolveApp = resolveApp;

exports.pathAllFiles = function(...paths) {
  return path.join(...paths, '**', '*');
};

const buildPath = resolveApp('build');
const commonPath = resolveApp('common');
const extensionsPath = resolveApp('extensions');

exports.paths = {
  root: appDirectory,
  build: {
    root: buildPath,
    extensions: {
      root: path.join(buildPath, 'extensions'),
      tasks: path.join(buildPath, 'extensions', '**', 'tasks'),
      sonarqubeTasks: path.join(buildPath, 'extensions', 'sonarqube', 'tasks'),
      sonarcloudTasks: path.join(buildPath, 'extensions', 'sonarcloud', 'tasks')
    },
    classicScanner: path.join(buildPath, 'tmp', 'classic-sonar-scanner-msbuild'),
    dotnetScanner:  path.join(buildPath, 'tmp', 'dotnet-sonar-scanner-msbuild')
  },
  common: {
    old: path.join(commonPath, 'powershell'),
    new: path.join(commonPath, 'ts')
  },
  extensions: {
    root: extensionsPath,
    tasks: {
      root: path.join(extensionsPath, '**', 'tasks'),
      old: path.join(extensionsPath, '**', 'tasks', '**', 'old'),
      new: path.join(extensionsPath, '**', 'tasks', '**', 'new')
    }
  }
};
