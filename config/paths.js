const path = require("path");
const fs = require("fs-extra");

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());

function resolveRelativePath(relativePath) {
  return path.resolve(appDirectory, relativePath);
}
exports.resolveRelativePath = resolveRelativePath;

const BUILD_DIR = resolveRelativePath("build");
exports.BUILD_DIR = BUILD_DIR;

const SCANNERS_BUILD_DIR = path.join(BUILD_DIR, "scanners");
exports.SCANNERS_BUILD_DIR = SCANNERS_BUILD_DIR;

const EXTENSION_BUILD_DIR = path.join(BUILD_DIR, "extensions");
exports.EXTENSION_BUILD_DIR = EXTENSION_BUILD_DIR;

const DIST_DIR = resolveRelativePath("dist");
exports.DIST_DIR = DIST_DIR;

exports.pathAllFiles = function (...paths) {
  return path.join(...paths, "**", "*");
};

const commonPath = resolveRelativePath("common");
const commonv5Path = resolveRelativePath("commonv5");
const extensionsPath = resolveRelativePath("extensions");

exports.paths = {
  root: appDirectory,
  common: {
    old: path.join(commonPath, "powershell"),
    new: path.join(commonPath, "ts"),
  },
  commonv5: {
    new: path.join(commonv5Path, "ts"),
  },
  extensions: {
    root: extensionsPath,
    tasks: {
      root: path.join(extensionsPath, "**", "tasks"),
      old: path.join(extensionsPath, "**", "tasks", "**", "old"),
      scv1: path.join(extensionsPath, "**", "tasks", "**", "v1"),
      v4: path.join(extensionsPath, "**", "tasks", "**", "v4"),
      v5: path.join(extensionsPath, "**", "tasks", "**", "v5"),
    },
  },
};
