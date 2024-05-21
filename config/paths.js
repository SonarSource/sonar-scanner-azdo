const path = require("path");
const fs = require("fs-extra");

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
function resolveRelativePath(relativePath) {
  return path.resolve(appDirectory, relativePath);
}
exports.resolveRelativePath = resolveRelativePath;

// /src
exports.SOURCE_DIR = path.join(appDirectory, "src");

// /build
exports.BUILD_DIR = path.join(appDirectory, "build");

// /build/ts
exports.BUILD_TS_DIR = path.join(appDirectory, "build", "ts");

// /build/extension
exports.BUILD_EXTENSION_DIR = path.join(appDirectory, "build", "extensions");

// /build/scanner
exports.BUILD_SCANNER_DIR = path.join(appDirectory, "build", "scanner");

// /build/scanner/classic-sonar-scanner-msbuild
exports.BUILD_SCANNER_CLI_DIR = path.join(
  appDirectory,
  "build",
  "scanner",
  "classic-sonar-scanner-msbuild",
);

// /build/scanner/dotnet-sonar-scanner-msbuild
exports.BUILD_SCANNER_MSBUILD_DIR = path.join(
  appDirectory,
  "build",
  "scanner",
  "dotnet-sonar-scanner-msbuild",
);

// /dist
exports.DIST_DIR = path.join(appDirectory, "dist");

exports.BUILD_SCANNER_CLI_DIRNAME = "classic-sonar-scanner-msbuild";
exports.BUILD_SCANNER_MSBUILD_DIRNAME = "dotnet-sonar-scanner-msbuild";
