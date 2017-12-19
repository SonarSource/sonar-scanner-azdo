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

exports.getAllTasksOfType = function(tasksPath, type) {
  return fs
    .readdirSync(tasksPath)
    .filter(folder => fs.pathExistsSync(path.join(tasksPath, folder, type)));
};

const buildPath = resolveApp('build');
const commonPath = resolveApp('common');
const tasksPath = resolveApp('tasks');

exports.paths = {
  root: appDirectory,
  build: {
    root: buildPath,
    extension: path.join(buildPath, 'sonarqube'),
    tasks: path.join(buildPath, 'sonarqube', 'tasks'),
    tmp: path.join(buildPath, 'tmp'),
    scanner: path.join(buildPath, 'tmp', 'scanner-msbuild')
  },
  common: {
    old: path.join(commonPath, 'powershell'),
    new: path.join(commonPath, 'ts'),
    icons: path.join(commonPath, 'icons')
  },
  tasks: {
    root: tasksPath,
    old: path.join(tasksPath, '**', 'old'),
    new: path.join(tasksPath, '**', 'new')
  }
};
