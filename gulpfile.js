const path = require("path");
const globby = require("globby");
const fs = require("fs");
const gulp = require("gulp");
const artifactoryUpload = require("gulp-artifactory-upload");
const fetch = require("node-fetch");
const del = require("del");
const yargs = require("yargs");
const { rollup } = require("rollup");
const jeditor = require("gulp-json-editor");
const gutil = require("gulp-util");
const ts = require("gulp-typescript");
const gulpReplace = require("gulp-replace");
const {
  run,
  downloadOrCopy,
  fullVersion,
  cycloneDxPipe,
  runSonnarQubeScanner,
  runSonnarQubeScannerForSonarCloud,
  getBuildInfo,
  fileHashsum,
} = require("./config/utils");
const rename = require("gulp-rename");
const merge = require("merge-stream");
const decompress = require("gulp-decompress");
const typescript = require("typescript");
const { tasks, branches, scanner, extensions } = require("./config/config");
const needle = require("needle");
const { getSignature } = require("./config/gulp-sign");
const {
  paths,
  BUILD_DIR,
  SCANNERS_BUILD_DIR,
  EXTENSION_BUILD_DIR,
  DIST_DIR,
} = require("./config/paths");

// eslint-disable-next-line import/extensions
const packageJSON = require("./package.json");

// TODO: Cyclone DX

function readJsonSync(file) {
  return JSON.parse(fs.readFileSync(file));
}

const isProd = process.env.NODE_ENV === "production";

gulp.task("clean", () => {
  return del([path.join(DIST_DIR, "**", "*"), path.join(BUILD_DIR, "**", "*")]);
});

gulp.task("scanners:clean", () => {
  return del([path.join(SCANNERS_BUILD_DIR, "**", "*")]);
});

gulp.task("scanners:download", () => {
  const classicDownload = downloadOrCopy(scanner.classicUrl)
    .pipe(decompress())
    .pipe(gulp.dest("build/scanners/classic-sonar-scanner-msbuild"));

  const dotnetDownload = downloadOrCopy(scanner.dotnetUrl)
    .pipe(decompress())
    .pipe(gulp.dest("build/scanners/dotnet-sonar-scanner-msbuild"));

  return merge(classicDownload, dotnetDownload);
});

gulp.task("scanners", gulp.series("scanners:clean", "scanners:download"));

function extensionExists(extension) {
  return fs.existsSync(`./extensions/${extension}/vss-extension.json`);
}

function extensionTaskExists(extension, task) {
  return fs.existsSync(`./extensions/${extension}/tasks/${task}/task.json`);
}

function getExtensionTaskBuildDirectory(extension, task) {
  const { version } = JSON.parse(
    fs.readFileSync(`./extensions/${extension}/tasks/${task}/task.json`).toString(),
  );
  const taskVersionString = `${version.Major}.${version.Minor}.${version.Patch}`;
  return `build/tasks/${extension}/tasks/${task}/v${taskVersionString}`;
}

gulp.task("tasks:prepare", () => {
  function tasksPrepare({ extension, task, msBuildScanners, cliScanner, noCode }) {
    if (!extensionTaskExists(extension, task)) {
      return [];
    }

    const taskDir = getExtensionTaskBuildDirectory(extension, task);

    const streams = [
      gulp.src(`extensions/${extension}/tasks/${task}/task.json`).pipe(gulp.dest(taskDir)),
      gulp
        .src(
          `extensions/${extension}/tasks_icons/${isProd ? "task_icon.png" : "task_icon.test.png"}`,
        )
        .pipe(rename("icon.png"))
        .pipe(gulp.dest(taskDir)),
    ];

    if (!noCode) {
      // Add node_modules
      streams.push(
        gulp.src(`src/node_modules/**/*`).pipe(gulp.dest(path.join(taskDir, "node_modules"))),
      );

      // If this task needs the MSBuild scanners
      if (msBuildScanners) {
        streams.push(gulp.src("build/scanners/**/*").pipe(gulp.dest(taskDir)));
      }

      // If this task needs the CLI scanner
      if (cliScanner) {
        streams.push(
          gulp
            .src(
              `build/scanners/classic-sonar-scanner-msbuild/sonar-scanner-${scanner.cliVersion}/**/*`,
            )
            .pipe(gulp.dest(path.join(taskDir, "sonar-scanner"))),
        );
      }
    }

    return streams;
  }

  return merge(...tasks.map(tasksPrepare));
});

gulp.task("tasks:build", () => {
  function tasksBuild({ extension, task, noCode }) {
    if (!extensionTaskExists(extension, task)) {
      return [];
    }

    if (noCode) {
      return [];
    }

    const taskDir = getExtensionTaskBuildDirectory(extension, task);

    return gulp
      .src([
        `extensions/${extension}/tasks/${task}/${task}.ts`,
        `src/**/*.ts`,
        "!" + path.join("**", "node_modules", "**"),
        "!" + path.join("**", "__tests__", "**"),
      ])
      .pipe(ts.createProject("./tsconfig.json", { typescript })())
      .once("error", () => {
        this.once("finish", () => process.exit(1));
      })
      .pipe(gulpReplace("../../../../src", "./"))
      .pipe(gulp.dest(taskDir));
  }

  return merge(...tasks.map(tasksBuild));
});

gulp.task("tasks", gulp.series("tasks:prepare", "tasks:build"));

gulp.task("extension:prepare", (done) => {
  const outDir = "build/extensions";

  run(`cp -r extensions ${outDir}`);

  for (const extension of extensions) {
    if (!extensionExists(extension)) {
      continue;
    }

    run(`rm -rf ${outDir}/${extension}/tasks`); // Drop default 'tasks' folder
  }
  done();
});

gulp.task("extension:patch-test", () => {
  if (isProd) {
    return Promise.resolve();
  }

  const replaceTestFiles = gulp
    .src(["build/extensions/**/*.test.png"])
    .pipe(
      rename((path) => {
        path.basename = path.basename.replace(".test", "");
      }),
    )
    .pipe(gulp.dest("build/extensions"));

  const hotixVssExtension = gulp
    .src("build/extensions/*/vss-extension.json")
    .pipe(
      jeditor((json) => ({
        ...json,
        name: "[Test] " + json.name,
        public: false,
        branding: {
          color: "#ff0000",
          theme: "dark",
        },
      })),
    )
    .pipe(gulp.dest(EXTENSION_BUILD_DIR));

  return merge(replaceTestFiles, hotixVssExtension);
});

gulp.task("extension:build", (done) => {
  const vsixDir = __dirname + "/dist";
  const publisher = isProd ? null : yargs.argv.publisher || "foo";

  for (const extension of extensions) {
    if (!extensionExists(extension)) {
      continue;
    }
    const vssExtension = readJsonSync(
      path.join(EXTENSION_BUILD_DIR, extension, "vss-extension.json"),
    );
    const version = fullVersion(vssExtension.version);
    const vsixFileName = `sonar-scanner-vsts-${version}-${extension}.vsix`;

    run(`cp -r build/tasks/${extension}/tasks ${EXTENSION_BUILD_DIR}/${extension}/tasks`);
    run(
      `tfx extension create --output-path "${vsixDir}/${vsixFileName}" ${
        publisher ? `--publisher ${publisher}` : ""
      }`,
      {
        cwd: path.join(EXTENSION_BUILD_DIR, extension),
      },
    );
  }
  done();
});

gulp.task("extension", gulp.series("extension:prepare", "extension:patch-test", "extension:build"));

gulp.task("build", gulp.series("clean", "scanners", "tasks", "extension"));

gulp.task("cyclonedx", () => {
  const packageJSON = readJsonSync("package.json");
  return merge([
    cycloneDxPipe("sonarcloud", packageJSON, path.join("dist", "sonarcloud"), path.join("src")),
    cycloneDxPipe("sonarqube", packageJSON, path.join("dist", "sonarqube"), path.join("src")),
  ]);
});

gulp.task("deploy:vsix:sonarqube", () => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gutil.log("Not on master nor PR, skip deploy:vsix");
    return gutil.noop;
  }
  if (process.env.CIRRUS_PR && process.env.DEPLOY_PULL_REQUEST === "false") {
    gutil.log("On PR, but artifacts should not be deployed, skip deploy:vsix");
    return gutil.noop;
  }
  const { name } = packageJSON;

  return merge(
    globby
      .sync(path.join(DIST_DIR, "*{-sonarqube.vsix,-sonarqube-cyclonedx.json,-sonarqube*.asc}"))
      .map((filePath) => {
        const [sha1, md5] = fileHashsum(filePath);
        const extensionPath = path.join(EXTENSION_BUILD_DIR, "sonarqube");
        const vssExtension = readJsonSync(path.join(extensionPath, "vss-extension.json"));
        const packageVersion = fullVersion(vssExtension.version);
        return gulp
          .src(filePath)
          .pipe(
            artifactoryUpload({
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
          .on("error", gutil.log);
      }),
  );
});

gulp.task("deploy:vsix:sonarcloud", () => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gutil.log("Not on master nor PR, skip deploy:vsix");
    return gutil.noop;
  }
  if (process.env.CIRRUS_PR && process.env.DEPLOY_PULL_REQUEST === "false") {
    gutil.log("On PR, but artifacts should not be deployed, skip deploy:vsix");
    return gutil.noop;
  }
  const { name } = packageJSON;

  return merge(
    globby
      .sync(path.join(DIST_DIR, "*{-sonarcloud.vsix,-sonarcloud-cyclonedx.json,-sonarcloud*.asc}"))
      .map((filePath) => {
        const extensionPath = path.join(EXTENSION_BUILD_DIR, "sonarcloud");
        const vssExtension = readJsonSync(path.join(extensionPath, "vss-extension.json"));
        const packageVersion = fullVersion(vssExtension.version);
        const [sha1, md5] = fileHashsum(filePath);
        return gulp
          .src(filePath)
          .pipe(
            artifactoryUpload({
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
          .on("error", gutil.log);
      }),
  );
});

gulp.task("deploy:buildinfo", () => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gutil.log("Not on master nor PR, skip deploy:buildinfo");
    return gutil.noop;
  }
  if (process.env.CIRRUS_PR && process.env.DEPLOY_PULL_REQUEST === "false") {
    gutil.log("On PR, but artifacts should not be deployed, skip deploy:buildinfo");
    return gutil.noop;
  }

  const sqExtensionPath = path.join(EXTENSION_BUILD_DIR, "sonarqube");
  const sqVssExtension = readJsonSync(path.join(sqExtensionPath, "vss-extension.json"));
  const scExtensionPath = path.join(EXTENSION_BUILD_DIR, "sonarcloud");
  const scVssExtension = readJsonSync(path.join(scExtensionPath, "vss-extension.json"));
  const buildInfo = getBuildInfo(packageJSON, sqVssExtension, scVssExtension);
  console.log("deploy build info", buildInfo);
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

gulp.task("sign", () => {
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

gulp.task(
  "deploy",
  gulp.series("sign", "deploy:buildinfo", "deploy:vsix:sonarqube", "deploy:vsix:sonarcloud"),
);

gulp.task("sonarqube-analysis:sonarqube", (done) => {
  const extensionPath = path.join(paths.extensions.root, "sonarqube");
  const vssExtension = readJsonSync(path.join(extensionPath, "vss-extension.json"));
  const projectVersion = vssExtension.version;
  if (process.env.CIRRUS_BRANCH === "master" && !process.env.CIRRUS_PR) {
    runSonnarQubeScanner(done, {
      "sonar.analysis.sha1": process.env.CIRRUS_CHANGE_IN_REPO,
      "sonar.projectVersion": projectVersion,
    });
  } else if (process.env.CIRRUS_PR) {
    runSonnarQubeScanner(done, {
      "sonar.analysis.prNumber": process.env.CIRRUS_PR,
      "sonar.pullrequest.key": process.env.CIRRUS_PR,
      "sonar.pullrequest.branch": process.env.CIRRUS_BRANCH,
      "sonar.pullrequest.base": process.env.CIRRUS_BASE,
      "sonar.analysis.sha1": process.env.CIRRUS_BASE_SHA,
      "sonar.projectVersion": projectVersion,
    });
  } else {
    done();
  }
});

gulp.task("sonarqube-analysis:sonarcloud", (done) => {
  const extensionPath = path.join(paths.extensions.root, "sonarcloud");
  const vssExtension = readJsonSync(path.join(extensionPath, "vss-extension.json"));
  const projectVersion = vssExtension.version;
  if (process.env.CIRRUS_BRANCH === "master" && !process.env.CIRRUS_PR) {
    runSonnarQubeScannerForSonarCloud(done, {
      "sonar.analysis.sha1": process.env.CIRRUS_CHANGE_IN_REPO,
      "sonar.projectVersion": projectVersion,
    });
  } else if (process.env.CIRRUS_PR) {
    runSonnarQubeScannerForSonarCloud(done, {
      "sonar.analysis.prNumber": process.env.CIRRUS_PR,
      "sonar.pullrequest.key": process.env.CIRRUS_PR,
      "sonar.pullrequest.branch": process.env.CIRRUS_BRANCH,
      "sonar.pullrequest.base": process.env.CIRRUS_BASE,
      "sonar.analysis.sha1": process.env.CIRRUS_BASE_SHA,
      "sonar.projectVersion": projectVersion,
    });
  } else {
    done();
  }
});

gulp.task("promote", (cb) => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gutil.log("Not on master nor PR, skip promote");
    return gutil.noop;
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
        cb(new Error(resp.statusMessage + "\n" + JSON.stringify(resp.body, null, 2)));
      }
    })
    .catch((err) => {
      cb(new Error(err));
    });
});

gulp.task("burgr:sonarcloud", () => {
  if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
    gutil.log("Not on master nor PR, skip burgr");
    return gutil.noop;
  }

  const manifestFile = readJsonSync(
    path.join(paths.extensions.root, "sonarcloud", "vss-extension.json"),
  );
  const extensionVersion = manifestFile.version;
  const packageVersion = fullVersion(extensionVersion);

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
    gutil.log("Not on master nor PR, skip burgr");
    return gutil.noop;
  }

  const manifestFile = readJsonSync(
    path.join(paths.extensions.root, "sonarqube", "vss-extension.json"),
  );
  const extensionVersion = manifestFile.version;
  const packageVersion = fullVersion(extensionVersion);

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

gulp.task("default", gulp.series("build"));
