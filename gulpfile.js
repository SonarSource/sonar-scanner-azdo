const path = require("path");
const gulp = require("gulp");
const fs = require("fs-extra");
const yargs = require("yargs");
const gulpReplace = require("gulp-replace");
const gulpJsonEditor = require("gulp-json-editor");
const gulpRename = require("gulp-rename");
const gulpArtifactoryUpload = require("gulp-artifactory-upload");
const ts = require("gulp-typescript");
const gulpUtil = require("gulp-util");
const globby = require("globby");
const mergeStream = require("merge-stream");
const typescript = require("typescript");
const decompress = require("gulp-decompress");
const needle = require("needle");
const del = require("del");
const esbuild = require("esbuild");
const {
  SOURCE_DIR,
  BUILD_TS_DIR,
  BUILD_EXTENSION_DIR,
  BUILD_DIR,
  BUILD_SCANNER_DIR,
  BUILD_SCANNER_MSBUILD_DIRNAME,
  BUILD_SCANNER_CLI_DIRNAME,
  DIST_DIR,
} = require("./config/paths");
const {
  fileHashsum,
  getBuildInfo,
  npmInstallTask,
  runSonnarQubeScanner,
  runSonnarQubeScannerForSonarCloud,
  tfxCommand,
  cycloneDxPipe,
  downloadOrCopy,
  getFullVersion,
  run,
} = require("./config/utils");
const { string } = require("yargs");
const {
  getTaskExtension,
  getTaskCommonFolder,
  taskNeedsCliScanner,
  taskNeedsMsBuildScanner,
} = require("./config/tasks");
const { getSignature } = require("./config/gulp-sign");

const packageJSON = fs.readJsonSync("package.json");

const isProd = process.env.NODE_ENV === "production";

/**
 * Delete all files in the build directory
 */
gulp.task("clean", () => del([path.join(BUILD_DIR, "**"), path.join(DIST_DIR, "**")]));

/** BUILD *****************************************************************************************/

/**
 * Run npm install for all common folders
 */
gulp.task("build:install-dependencies", async () => {
  const commonFolders = globby.sync(["src/common/*/index.ts"]);

  for (const commonFolder of commonFolders) {
    const folder = path.dirname(commonFolder);
    const packageJson = path.join(folder, "package.json");
    await npmInstallTask(packageJson);
  }
});

/**
 * Copy all files needed for the extension
 */
gulp.task("build:copy-extension", () => {
  return gulp
    .src([
      // Copy all files except test files and tasks code
      "src/extensions/**/*",
      "!src/extensions/*/tasks/**/*.ts",
    ])
    .pipe(gulp.dest(BUILD_EXTENSION_DIR));
});

/**
 * Build TypeScript files
 */
gulp.task("build:typescript", () => {
  // Get all tsconfig files in src
  const tscPaths = globby.sync(["src/tsconfig*.json"]);

  // Build each tsconfig
  return mergeStream(
    tscPaths.map((tscPath) => {
      const tsProject = ts.createProject(tscPath, { typescript });

      return tsProject
        .src()
        .pipe(tsProject())
        .js.pipe(gulp.dest("build/ts"))
        .once("error", () => {
          this.once("finish", () => process.exit(1));
        });
    }),
  );
});

/**
 * Bundle tasks
 */
gulp.task("build:bundle", async () => {
  const tasks = globby.sync(["src/extensions/*/tasks/*/v*/*.ts"]);
  for (const task of tasks) {
    const [extension, , taskName, version] = task.split(path.sep).slice(-5);
    const commonFolder = getTaskCommonFolder(taskName, version);
    const outFilePath = task.replace(/^src/, BUILD_DIR).replace(/\.ts$/, ".js");

    // eslint-disable-next-line import/no-dynamic-require
    const esbuildConfig = require(
      path.join(SOURCE_DIR, "common", commonFolder, "esbuild.config.js"),
    );

    await esbuild.build({
      ...esbuildConfig,
      entryPoints: [task],
      outfile: outFilePath,
    });
  }
});

/**
 * Build all scanners needed by tasks
 */
gulp.task("build:download-scanners", () => {
  const configJss = globby.sync([path.join(BUILD_TS_DIR, "common", "*", "config.js")]);
  const streams = [];
  for (const configJs of configJss) {
    // eslint-disable-next-line import/no-dynamic-require
    const { scanner } = require(configJs);

    streams.push(
      downloadOrCopy(scanner.classicUrl)
        .pipe(decompress())
        .pipe(
          gulp.dest(path.join(BUILD_SCANNER_DIR, BUILD_SCANNER_CLI_DIRNAME, scanner.cliVersion)),
        ),
    );

    streams.push(
      downloadOrCopy(scanner.dotnetUrl)
        .pipe(decompress())
        .pipe(
          gulp.dest(
            path.join(BUILD_SCANNER_DIR, BUILD_SCANNER_MSBUILD_DIRNAME, scanner.msBuildVersion),
          ),
        ),
    );
  }

  return mergeStream(streams);
});

/**
 * Copy all task files to the build directory
 */
gulp.task("build:copy", () => {
  const tasks = globby.sync(["build/ts/extensions/*/tasks/*/v*/*.js"]);

  const streams = [];

  for (const task of tasks) {
    const taskName = path.basename(task).split(".")[0];
    const extension = getTaskExtension(taskName);
    const version = path.basename(path.dirname(task));
    const commonPath = getTaskCommonFolder(taskName, version); // What common files to copy (latest vs legacy?)

    // Where to copy the task code
    const outPath = path.join(BUILD_EXTENSION_DIR, extension, "tasks", taskName, version);

    // Copy task icon
    streams.push(
      gulp
        .src(
          path.join(
            SOURCE_DIR,
            "extensions",
            extension,
            "tasks_icons",
            isProd ? "task_icon.png" : "task_icon.test.png",
          ),
        )
        .pipe(gulpRename("icon.png"))
        .pipe(gulp.dest(outPath)),
    );

    // Get the config.js file for the task to know what scanner to use
    const configJs = path.join(BUILD_TS_DIR, "common", commonPath, "config.js");
    // eslint-disable-next-line import/no-dynamic-require
    const { scanner } = require(configJs);

    // Copy Scanner CLI
    if (taskNeedsCliScanner(taskName) && scanner.embedScanners) {
      streams.push(
        gulp
          .src(
            path.join(
              BUILD_SCANNER_DIR,
              BUILD_SCANNER_CLI_DIRNAME,
              scanner.cliVersion,
              `sonar-scanner-${scanner.cliVersion}`,
              "**/*",
            ),
          )
          .pipe(gulp.dest(path.join(outPath, "sonar-scanner"))),
      );
    }

    // Copy Scanner MSBuild
    if (taskNeedsMsBuildScanner(taskName) && scanner.embedScanners) {
      streams.push(
        gulp
          .src(path.join(BUILD_SCANNER_DIR, BUILD_SCANNER_CLI_DIRNAME, scanner.cliVersion, "**/*"))
          .pipe(gulp.dest(path.join(outPath, BUILD_SCANNER_CLI_DIRNAME))),
      );
      streams.push(
        gulp
          .src(
            path.join(
              BUILD_SCANNER_DIR,
              BUILD_SCANNER_MSBUILD_DIRNAME,
              scanner.msBuildVersion,
              "**/*",
            ),
          )
          .pipe(gulp.dest(path.join(outPath, BUILD_SCANNER_MSBUILD_DIRNAME))),
      );
    }
  }

  return mergeStream(streams);
});

/**
 * Patch the extension when testing
 */
gulp.task("extension:patch-test", () => {
  if (isProd) {
    return Promise.resolve();
  }

  const replaceTestFiles = gulp
    .src([path.join(BUILD_EXTENSION_DIR, "**", "*test.png")])
    .pipe(
      gulpRename((path) => {
        path.basename = path.basename.replace(".test", "");
      }),
    )
    .pipe(gulp.dest("build/extensions"));

  const hotixVssExtension = gulp
    .src("build/extensions/*/vss-extension.json")
    .pipe(
      gulpJsonEditor((json) => ({
        ...json,
        name: "[Test] " + json.name,
        public: false,
        branding: {
          color: "#ff0000",
          theme: "dark",
        },
      })),
    )
    .pipe(gulp.dest(BUILD_EXTENSION_DIR));

  return mergeStream(replaceTestFiles, hotixVssExtension);
});

gulp.task(
  "build",
  gulp.series(
    "build:install-dependencies",
    "build:copy-extension",
    "build:typescript",
    "build:bundle",
    "build:download-scanners",
    "build:copy",
    "extension:patch-test",
  ),
);

/** EXTENSION *************************************************************************************/

gulp.task("extension:build", (done) => {
  const publisher = isProd ? null : yargs.argv.publisher ?? "sonarsource";

  const vssExtensions = globby.sync([
    path.join(SOURCE_DIR, "extensions", "*", "vss-extension.json"),
  ]);

  for (const vssExtension of vssExtensions) {
    // eslint-disable-next-line import/no-dynamic-require
    const { version } = require(vssExtension);
    const extension = path.basename(path.dirname(vssExtension));
    const fullVersion = getFullVersion(version);
    const vsixFileName = `sonar-scanner-vsts-${fullVersion}-${extension}.vsix`;
    const outPath = path.join(DIST_DIR, vsixFileName);
    const cwd = path.join(BUILD_EXTENSION_DIR, extension);

    run(`tfx extension create --output-path "${outPath}" --publisher ${publisher}`, { cwd });
  }

  done();
});

gulp.task("extension", gulp.series("extension:build"));

/** DEFAULT ***************************************************************************************/

gulp.task("default", gulp.series("clean", "build", "extension"));

/** SONAR *****************************************************************************************/

gulp.task("sonarqube:scan", async () => {
  const extensionVssPaths = globby.sync([
    path.join(SOURCE_DIR, "extensions", "*", "vss-extension.json"),
  ]);

  const promises = [];

  for (const extensionVssPath of extensionVssPaths) {
    const { version } = fs.readJsonSync(extensionVssPath);

    await new Promise((resolve) => {
      if (process.env.CIRRUS_BRANCH === "master" && !process.env.CIRRUS_PR) {
        runSonnarQubeScanner(resolve, {
          "sonar.analysis.sha1": process.env.CIRRUS_CHANGE_IN_REPO,
        });
      } else if (process.env.CIRRUS_PR) {
        runSonnarQubeScanner(resolve, {
          "sonar.analysis.prNumber": process.env.CIRRUS_PR,
          "sonar.pullrequest.key": process.env.CIRRUS_PR,
          "sonar.pullrequest.branch": process.env.CIRRUS_BRANCH,
          "sonar.pullrequest.base": process.env.CIRRUS_BASE,
          "sonar.analysis.sha1": process.env.CIRRUS_BASE_SHA,
        });
      } else {
        resolve();
      }
    });
  }
});

/** DEPLOY ****************************************************************************************/

gulp.task("upload:sign", () => {
  return gulp
    .src(path.join("dist", "*{.vsix,-cyclonedx.json}"))
    .pipe(
      getSignature({
        privateKeyArmored: process.env.GPG_SIGNING_KEY,
        passphrase: process.env.GPG_SIGNING_PASSPHRASE,
      }),
    )
    .pipe(gulp.dest("dist"));
});

gulp.task("upload:cyclonedx", () => {
  const commonPaths = globby.sync([path.join(SOURCE_DIR, "common", "*", "package.json")]);

  return cycloneDxPipe(packageJSON, ...commonPaths.map((commonPath) => path.dirname(commonPath)));
});

gulp.task("upload:vsix:sonarqube", () => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gulpUtil.log("Not on master nor PR, skip upload:vsix");
    return gulpUtil.noop;
  }
  if (process.env.CIRRUS_PR && process.env.DEPLOY_PULL_REQUEST === "false") {
    gulpUtil.log("On PR, but artifacts should not be deployed, skip upload:vsix");
    return gulpUtil.noop;
  }
  const { name } = packageJSON;

  return mergeStream(
    globby
      .sync(path.join(DIST_DIR, "*{-sonarqube.vsix,-sonarqube-cyclonedx.json,-sonarqube*.asc}"))
      .map((filePath) => {
        const [sha1, md5] = fileHashsum(filePath);
        const extensionPath = path.join(BUILD_EXTENSION_DIR, "sonarqube");
        const vssExtension = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
        const packageVersion = getFullVersion(vssExtension.version);
        return gulp
          .src(filePath)
          .pipe(
            gulpArtifactoryUpload({
              url:
                process.env.ARTIFACTORY_URL +
                "/" +
                process.env.ARTIFACTORY_DEPLOY_REPO +
                "/org/sonarsource/scanner/vsts/" +
                name +
                "/" +
                "sonarqube" +
                "/" +
                packageVersion,
              username: process.env.ARTIFACTORY_DEPLOY_USERNAME,
              password: process.env.ARTIFACTORY_DEPLOY_PASSWORD,
              properties: {
                "vcs.revision": process.env.CIRRUS_CHANGE_IN_REPO,
                "vcs.branch": process.env.CIRRUS_BRANCH,
                "build.name": name,
                "build.number": process.env.BUILD_NUMBER,
              },
              request: {
                headers: {
                  "X-Checksum-MD5": md5,
                  "X-Checksum-Sha1": sha1,
                },
              },
            }),
          )
          .on("error", gulpUtil.log);
      }),
  );
});

gulp.task("upload:vsix:sonarcloud", () => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gulpUtil.log("Not on master nor PR, skip upload:vsix");
    return gulpUtil.noop;
  }
  if (process.env.CIRRUS_PR && process.env.DEPLOY_PULL_REQUEST === "false") {
    gulpUtil.log("On PR, but artifacts should not be deployed, skip upload:vsix");
    return gulpUtil.noop;
  }
  const { name } = packageJSON;

  return mergeStream(
    globby
      .sync(path.join(DIST_DIR, "*{-sonarcloud.vsix,-sonarcloud-cyclonedx.json,-sonarcloud*.asc}"))
      .map((filePath) => {
        const extensionPath = path.join(BUILD_EXTENSION_DIR, "sonarcloud");
        const vssExtension = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
        const packageVersion = getFullVersion(vssExtension.version);
        const [sha1, md5] = fileHashsum(filePath);
        return gulp
          .src(filePath)
          .pipe(
            gulpArtifactoryUpload({
              url:
                process.env.ARTIFACTORY_URL +
                "/" +
                process.env.ARTIFACTORY_DEPLOY_REPO +
                "/org/sonarsource/scanner/vsts/" +
                name +
                "/" +
                "sonarcloud" +
                "/" +
                packageVersion,
              username: process.env.ARTIFACTORY_DEPLOY_USERNAME,
              password: process.env.ARTIFACTORY_DEPLOY_PASSWORD,
              properties: {
                "vcs.revision": process.env.CIRRUS_CHANGE_IN_REPO,
                "vcs.branch": process.env.CIRRUS_BRANCH,
                "build.name": name,
                "build.number": process.env.BUILD_NUMBER,
              },
              request: {
                headers: {
                  "X-Checksum-MD5": md5,
                  "X-Checksum-Sha1": sha1,
                },
              },
            }),
          )
          .on("error", gulpUtil.log);
      }),
  );
});

gulp.task("upload:buildinfo", () => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gulpUtil.log("Not on master nor PR, skip upload:buildinfo");
    return gulpUtil.noop;
  }
  if (process.env.CIRRUS_PR && process.env.DEPLOY_PULL_REQUEST === "false") {
    gulpUtil.log("On PR, but artifacts should not be deployed, skip upload:buildinfo");
    return gulpUtil.noop;
  }

  const sqVssExtension = fs.readJsonSync(
    path.join(BUILD_EXTENSION_DIR, "sonarqube", "vss-extension.json"),
  );
  const scVssExtension = fs.readJsonSync(
    path.join(BUILD_EXTENSION_DIR, "sonarcloud", "vss-extension.json"),
  );
  const buildInfo = getBuildInfo(packageJSON, sqVssExtension, scVssExtension);
  console.log("upload build info", buildInfo);
  return fetch(process.env.ARTIFACTORY_URL + "/api/build", {
    method: "put",
    body: JSON.stringify(buildInfo),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(
        `${process.env.ARTIFACTORY_DEPLOY_USERNAME}:${process.env.ARTIFACTORY_DEPLOY_PASSWORD}`,
      ).toString("base64")}`,
    },
  });
});

gulp.task(
  "upload",
  gulp.series("upload:sign", "upload:buildinfo", "upload:vsix:sonarqube", "upload:vsix:sonarcloud"),
);

gulp.task("promote", (done) => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gulpUtil.log("Not on master nor PR, skip promote");
    return gulpUtil.noop;
  }
  return needle(
    "post",
    `${process.env.ARTIFACTORY_URL}/api/build/promote/${process.env.CIRRUS_REPO_NAME}/${process.env.BUILD_NUMBER}`,
    {
      status: `it-passed${process.env.CIRRUS_PR ? "-pr" : ""}`,
      sourceRepo: process.env.ARTIFACTORY_DEPLOY_REPO,
      targetRepo: process.env.ARTIFACTORY_DEPLOY_REPO.replace(
        "qa",
        process.env.CIRRUS_PR ? "dev" : "builds",
      ),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.ARTIFACTORY_PROMOTE_ACCESS_TOKEN}`,
      },
      json: true,
    },
  )
    .then((resp) => {
      if (resp.statusCode !== 200) {
        done(new Error(resp.statusMessage + "\n" + JSON.stringify(resp.body, null, 2)));
      }
    })
    .catch((err) => {
      done(new Error(err));
    });
});

gulp.task("burgr:sonarcloud", () => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gulpUtil.log("Not on master nor PR, skip burgr");
    return gulpUtil.noop;
  }

  const extensionPath = path.join(SOURCE_DIR, "extensions", "sonarcloud");
  const manifestFile = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
  const extensionVersion = manifestFile.version;
  const packageVersion = getFullVersion(extensionVersion);

  const url = `${process.env.ARTIFACTORY_URL}/sonarsource/org/sonarsource/scanner/vsts/sonar-scanner-vsts/sonarcloud/${packageVersion}/sonar-scanner-vsts-${packageVersion}-sonarcloud.vsix`;

  const apiUrl = [
    process.env.BURGR_URL,
    "api/promote",
    process.env.CIRRUS_REPO_OWNER,
    process.env.CIRRUS_REPO_NAME,
    process.env.CIRRUS_BUILD_ID,
  ].join("/");

  return fetch(apiUrl, {
    method: "post",
    body: JSON.stringify({
      version: packageVersion,
      url,
      buildNumber: process.env.BUILD_NUMBER,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(
        `${process.env.BURGR_USERNAME}:${process.env.BURGR_PASSWORD}`,
      ).toString("base64")}`,
    },
  });
});

gulp.task("burgr:sonarqube", () => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gulpUtil.log("Not on master nor PR, skip burgr");
    return gulpUtil.noop;
  }

  const extensionPath = path.join(SOURCE_DIR, "extensions", "sonarqube");
  const manifestFile = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
  const extensionVersion = manifestFile.version;
  const packageVersion = getFullVersion(extensionVersion);

  const url = `${process.env.ARTIFACTORY_URL}/sonarsource/org/sonarsource/scanner/vsts/sonar-scanner-vsts/sonarqube/${packageVersion}/sonar-scanner-vsts-${packageVersion}-sonarqube.vsix`;

  const apiUrl = [
    process.env.BURGR_URL,
    "api/promote",
    process.env.CIRRUS_REPO_OWNER,
    process.env.CIRRUS_REPO_NAME,
    process.env.CIRRUS_BUILD_ID,
  ].join("/");

  return fetch(apiUrl, {
    method: "post",
    body: JSON.stringify({
      version: packageVersion,
      url,
      buildNumber: process.env.BUILD_NUMBER,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(
        `${process.env.BURGR_USERNAME}:${process.env.BURGR_PASSWORD}`,
      ).toString("base64")}`,
    },
  });
});
