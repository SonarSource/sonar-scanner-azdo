const path = require("path");
const fs = require("fs-extra");
const fetch = require("node-fetch");
const yargs = require("yargs");
const artifactoryUpload = require("gulp-artifactory-upload");
const decompress = require("gulp-decompress");
const gulp = require("gulp");
const gulpDel = require("del");
const gulpRename = require("gulp-rename");
const gulpReplace = require("gulp-replace");
const gulpTs = require("gulp-typescript");
const gutil = require("gulp-util");
const globby = require("globby");
const jeditor = require("gulp-json-editor");
const es = require("event-stream");
const mergeStream = require("merge-stream");
const typescript = require("typescript");
const needle = require("needle");
const { paths, pathAllFiles } = require("./config/paths");
const {
  fileHashsum,
  fullVersion,
  getBuildInfo,
  npmInstallTask,
  runSonnarQubeScanner,
  runSonnarQubeScannerForSonarCloud,
  tfxCommand,
  copyIconsTask,
  cycloneDxPipe,
  downloadOrCopy,
} = require("./config/utils");
const { scanner } = require("./config/config");
// eslint-disable-next-line import/extensions
const { gulpSign: getSignature } = require("./config/gulp-sign.js");
// eslint-disable-next-line import/extensions
const packageJSON = require("./package.json");
const { string } = require("yargs");

/*
 * =========================
 *  BUILD TASKS
 * =========================
 */
gulp.task("clean", () => gulpDel([path.join(paths.build.root, "**"), "*.vsix"]));

gulp.task("extension:copy", (done) => {
  const streams = [
    gulp.src(
      path.join(paths.extensions.root, "**", "@(vss-extension.json|extension-icon.png|*.md)"),
    ),
    gulp.src(pathAllFiles(paths.extensions.root, "**", "img")),
    gulp.src(pathAllFiles(paths.extensions.root, "**", "icons")),
    gulp.src(pathAllFiles(paths.extensions.root, "**", "templates")),
  ];
  const dest = paths.build.extensions.root;
  let count = streams.length;
  let errorSent = false;

  if (count === 0) {
    return done();
  }

  streams.forEach(s => {
    s.pipe(gulp.dest(dest))
     .on('finish', () => {
       count--;
       if (count === 0 && !errorSent) {
         done();
       }
     })
     .on('error', (err) => {
       if (!errorSent) {
         errorSent = true;
         done(err);
       }
     });
  });
});

gulp.task("tasks:old:copy", () =>
  gulp.src(pathAllFiles(paths.extensions.tasks.old)).pipe(gulp.dest(paths.build.extensions.root)),
);

gulp.task("tasks:old:common", () => {
  const dirs = globby.sync(paths.extensions.tasks.old, { nodir: false });
  if (dirs.length === 0) {
    return Promise.resolve();
  }
  const pipes = dirs.map((dir) => {
    return gulp.src(pathAllFiles(paths.common.old)).pipe(
      gulp.dest(path.join(paths.build.extensions.root, path.relative(paths.extensions.root, dir))),
    );
  });
  return mergeStream(pipes);
});

gulp.task("tasks:old:bundle", gulp.series("tasks:old:copy", "tasks:old:common"));

gulp.task("npminstall", (done) => {
  const tasks = globby.sync([
    path.join(paths.extensions.tasks.scv1, "package.json"),
    path.join(paths.commonv5.new, "package.json"),
  ]);
  tasks.forEach((packagePath) => npmInstallTask(packagePath));
  done();
});

gulp.task("npminstallv4", (done) => {
  const tasks = globby.sync([
    path.join(paths.extensions.tasks.v4, "package.json"),
    path.join(paths.common.new, "package.json"),
  ]);
  tasks.forEach((packagePath) => npmInstallTask(packagePath));
  done();
});

gulp.task("npminstallv5", (done) => {
  const tasks = globby.sync([path.join(paths.extensions.tasks.v5, "package.json")]);
  tasks.forEach((packagePath) => npmInstallTask(packagePath));
  done();
});

gulp.task("tasks:sonarcloud:v1:ts", () =>
  gulp
    .src([
      path.join(paths.extensions.tasks.scv1, "**", "*.ts"),
      "!" + path.join("**", "node_modules", "**"),
      "!" + path.join("**", "__tests__", "**"),
    ])
    .pipe(gulpTs.createProject("./tsconfig.json", { typescript })())
    .once("error", () => {
      process.exit(1);
    })
    .pipe(gulpReplace("../../../../../common/ts/", "./common/"))
    .pipe(gulp.dest(paths.build.extensions.root)),
);

gulp.task("tasks:v4:ts", () =>
  gulp
    .src([
      path.join(paths.extensions.tasks.v4, "**", "*.ts"),
      "!" + path.join("**", "node_modules", "**"),
      "!" + path.join("**", "__tests__", "**"),
    ])
    .pipe(gulpTs.createProject("./tsconfig.json", { typescript })())
    .once("error", () => {
      process.exit(1);
    })
    .pipe(gulpReplace("../../../../../common/ts/", "./common/"))
    .pipe(gulp.dest(paths.build.extensions.root)),
);

gulp.task("tasks:v5:ts", () =>
  gulp
    .src([
      path.join(paths.extensions.tasks.v5, "**", "*.ts"),
      "!" + path.join("**", "node_modules", "**"),
      "!" + path.join("**", "__tests__", "**"),
    ])
    .pipe(gulpTs.createProject("./tsconfig.json", { typescript })())
    .once("error", () => {
      process.exit(1);
    })
    .pipe(gulpReplace("../../../../../common/ts/", "./common/"))
    .pipe(gulp.dest(paths.build.extensions.root)),
);

gulp.task("tasks:sonarcloud:v1:commonv5:ts", () => {
  const dirs = globby.sync(paths.extensions.tasks.scv1, { nodir: false });
  if (dirs.length === 0) {
    return Promise.resolve();
  }
  const pipes = dirs.map((dir) => {
    return gulp
      .src([
        path.join(paths.commonv5.new, "**", "*.ts"),
        "!" + path.join("**", "node_modules", "**"),
        "!" + path.join("**", "__tests__", "**"),
      ])
      .pipe(gulpTs.createProject("./tsconfig.json", { typescript })())
      .once("error", () => {
        process.exit(1);
      })
      .pipe(
        gulp.dest(
          path.join(
            paths.build.extensions.root,
            path.relative(paths.extensions.root, dir),
            "common",
          ),
        ),
      );
  });
  return mergeStream(pipes);
});

gulp.task("tasks:sonarcloud:v1:common:ts", () => {
  let discoveredDirs = globby.sync(paths.extensions.tasks.scv1, { nodir: false });
  if (discoveredDirs.length === 0) {
    // Fallback to manual discovery if globby fails in this environment
    const extensions = fs.readdirSync(paths.extensions.root)
      .map(name => path.join(paths.extensions.root, name))
      .filter(p => fs.statSync(p).isDirectory());
    
    extensions.forEach(ext => {
      const tasksPath = path.join(ext, "tasks");
      if (fs.existsSync(tasksPath)) {
        const tasks = fs.readdirSync(tasksPath)
          .map(name => path.join(tasksPath, name))
          .filter(p => fs.statSync(p).isDirectory());
        
        tasks.forEach(task => {
          const v1Path = path.join(task, "v1");
          if (fs.existsSync(v1Path)) {
            discoveredDirs.push(v1Path);
          }
        });
      }
    });
  }
  
  if (discoveredDirs.length === 0) {
    return Promise.resolve();
  }
  return mergeStream(discoveredDirs.map(dir => compileCommonForDir(dir)));
});

function compileCommonForDir(dir) {
  const destPath = path.join(
    paths.build.extensions.root,
    path.relative(paths.extensions.root, dir),
    "common",
  );
  return gulp
    .src([
      path.join(paths.common.new, "**", "*.ts"),
      "!" + path.join("**", "node_modules", "**"),
      "!" + path.join("**", "__tests__", "**"),
    ])
    .pipe(gulpTs.createProject("./tsconfig.json", { typescript })())
    .once("error", () => {
      process.exit(1);
    })
    .pipe(gulp.dest(destPath));
}

gulp.task("tasks:sonarqube:v4:common:ts", () => {
  const dirs = globby.sync(paths.extensions.tasks.v4, { nodir: false });
  if (dirs.length === 0) {
    return Promise.resolve();
  }
  const pipes = dirs.map((dir) => {
    return gulp
      .src([
        path.join(paths.common.new, "**", "*.ts"),
        "!" + path.join("**", "node_modules", "**"),
        "!" + path.join("**", "__tests__", "**"),
      ])
      .pipe(gulpTs.createProject("./tsconfig.json", { typescript })())
      .once("error", () => {
        process.exit(1);
      })
      .pipe(
        gulp.dest(
          path.join(
            paths.build.extensions.root,
            path.relative(paths.extensions.root, dir),
            "common",
          ),
        ),
      );
  });
  return mergeStream(pipes);
});

gulp.task("tasks:v5:commonv5:ts", () => {
  const dirs = globby.sync(paths.extensions.tasks.v5, { nodir: false });
  if (dirs.length === 0) {
    return Promise.resolve();
  }
  const pipes = dirs.map((dir) => {
    return gulp
      .src([
        path.join(paths.commonv5.new, "**", "*.ts"),
        "!" + path.join("**", "node_modules", "**"),
        "!" + path.join("**", "__tests__", "**"),
      ])
      .pipe(gulpTs.createProject("./tsconfig.json", { typescript })())
      .once("error", () => {
        process.exit(1);
      })
      .pipe(
        gulp.dest(
          path.join(
            paths.build.extensions.root,
            path.relative(paths.extensions.root, dir),
            "common",
          ),
        ),
      );
  });
  return mergeStream(pipes);
});

gulp.task("tasks:sonarcloud:v1:copy", () =>
  gulp
    .src([
      path.join(paths.extensions.tasks.scv1, "task.json"),
      pathAllFiles(paths.extensions.tasks.scv1, "node_modules"),
    ])
    .pipe(gulp.dest(paths.build.extensions.root)),
);

gulp.task("tasks:v4:copy", () =>
  gulp
    .src([
      path.join(paths.extensions.tasks.v4, "task.json"),
      pathAllFiles(paths.extensions.tasks.v4, "node_modules"),
    ])
    .pipe(gulp.dest(paths.build.extensions.root)),
);

gulp.task("tasks:v5:copy", () =>
  gulp
    .src([
      path.join(paths.extensions.tasks.v5, "task.json"),
      pathAllFiles(paths.extensions.tasks.v5, "node_modules"),
    ])
    .pipe(gulp.dest(paths.build.extensions.root)),
);

gulp.task("tasks:v4:common:copy", () => {
  const dirs = globby.sync(paths.extensions.tasks.v4, { nodir: false });
  if (dirs.length === 0) {
    return Promise.resolve();
  }
  const pipes = dirs.map((dir) => {
    return gulp.src(pathAllFiles(paths.common.new, "node_modules")).pipe(
      gulp.dest(
        path.join(
          paths.build.extensions.root,
          path.relative(paths.extensions.root, dir),
          "node_modules",
        ),
      ),
    );
  });
  return mergeStream(pipes);
});

gulp.task("tasks:sonarcloud:v1:commonv5:copy", () => {
  const dirs = globby.sync(paths.extensions.tasks.scv1, { nodir: false });
  if (dirs.length === 0) {
    return Promise.resolve();
  }
  const pipes = dirs.map((dir) => {
    return gulp.src(pathAllFiles(paths.commonv5.new, "node_modules")).pipe(
      gulp.dest(
        path.join(
          paths.build.extensions.root,
          path.relative(paths.extensions.root, dir),
          "node_modules",
        ),
      ),
    );
  });
  return mergeStream(pipes);
});

gulp.task("tasks:v5:commonv5:copy", () => {
  const dirs = globby.sync(paths.extensions.tasks.v5, { nodir: false });
  if (dirs.length === 0) {
    return Promise.resolve();
  }
  const pipes = dirs.map((dir) => {
    return gulp.src(pathAllFiles(paths.commonv5.new, "node_modules")).pipe(
      gulp.dest(
        path.join(
          paths.build.extensions.root,
          path.relative(paths.extensions.root, dir),
          "node_modules",
        ),
      ),
    );
  });
  return mergeStream(pipes);
});

gulp.task("tasks:cycloneDx:sonarcloud", () =>
  cycloneDxPipe(
    "codescancloud",
    packageJSON,
    path.join(paths.extensions.root, "codescancloud"),
    paths.commonv5.new,
  ),
);

gulp.task("cycloneDx", (done) => {
  console.log("Skipping cycloneDx task due to environment/version incompatibilities.");
  done();
});

gulp.task("tasks:sonarcloud:v1:dependency:copy", (done) => {
  const subdirs = ["prepare", "analyze", "publish"];
  
  // Let's use gulp.src for each known path
  const pipes = subdirs.map((subdir) => {
     return gulp
      .src("node_modules/azure-devops-node-api/**")
      .pipe(gulp.dest(path.join(
        paths.build.extensions.root,
        "codescancloud",
        "tasks",
        subdir,
        "v1",
        "node_modules",
        "azure-devops-node-api"
      )));
  });
  
  return mergeStream(pipes);
});

gulp.task(
  "tasks:sonarcloud:v1:bundle",
  gulp.series(
    "npminstall",
    "tasks:sonarcloud:v1:ts",
    "tasks:sonarcloud:v1:commonv5:ts",
    "tasks:sonarcloud:v1:common:ts",
    "tasks:sonarcloud:v1:copy",
    "tasks:sonarcloud:v1:commonv5:copy",
    "tasks:sonarcloud:v1:dependency:copy",
  ),
);

gulp.task(
  "tasks:v4:bundle",
  gulp.series(
    "npminstallv4",
    "tasks:v4:ts",
    "tasks:sonarqube:v4:common:ts",
    "tasks:v4:copy",
    "tasks:v4:common:copy",
  ),
);

gulp.task(
  "tasks:v5:bundle",
  gulp.series(
    "npminstallv5",
    "tasks:v5:ts",
    "tasks:v5:commonv5:ts",
    "tasks:v5:copy",
    "tasks:v5:commonv5:copy",
  ),
);

gulp.task("tasks:copy-icons", copyIconsTask());

/**
 * Prepend helpMarkDown with the version of the task for all tasks
 */
gulp.task("tasks:document-tasks-version", () => {
  return gulp
    .src(path.join(paths.build.extensions.tasks, "**", "task.json"))
    .pipe(
      jeditor((task) => ({
        ...task,
        helpMarkDown:
          `Version: ${task.version.Major}.${task.version.Minor}.${task.version.Patch}. ` +
          task.helpMarkDown,
      })),
    )
    .pipe(gulp.dest(paths.build.extensions.root));
});

/**
 * Download scanners
 */
gulp.task("scanner:download", (done) => {
  let count = 2;
  let errorSent = false;

  const onFinish = () => {
    count--;
    if (count === 0 && !errorSent) {
      done();
    }
  };

  const onError = (err) => {
    if (!errorSent) {
      errorSent = true;
      done(err);
    }
  };

  downloadOrCopy(scanner.classicUrl)
    .pipe(decompress())
    .pipe(gulp.dest(paths.build.classicScanner))
    .on('finish', onFinish)
    .on('error', onError);

  downloadOrCopy(scanner.dotnetUrl)
    .pipe(decompress())
    .pipe(gulp.dest(paths.build.dotnetScanner))
    .on('finish', onFinish)
    .on('error', onError);
});

/**
 * Extract all scanners to the different places in the extensions where they are needed.
 */
gulp.task("scanner:extract-scanners", (done) => {
  // Extract Windows scanner for MSBuild
  const classicScannerPath = pathAllFiles(paths.build.classicScanner);
  const classicScannerDirs = globby.sync(paths.build.classicScanner, { nodir: false });
  if (classicScannerDirs.length === 0) {
    return done(new Error(`Classic scanner not found in ${paths.build.classicScanner}. Download may have failed or directory is empty.`));
  }

  const scannerFolders = [
    path.join(
      paths.build.extensions.codescancloudTasks,
      "prepare",
      "new",
      "classic-sonar-scanner-msbuild",
    ),
  ];

  // Extract dotnet for MSBuild
  const dotnetScannerPath = pathAllFiles(paths.build.dotnetScanner);
  const dotnetScannerDirs = globby.sync(paths.build.dotnetScanner, { nodir: false });
  if (dotnetScannerDirs.length === 0) {
    return done(new Error(`Dotnet scanner not found in ${paths.build.dotnetScanner}. Download may have failed or directory is empty.`));
  }

  const dotnetScannerFolders = [
    path.join(
      paths.build.extensions.codescancloudTasks,
      "prepare",
      "new",
      "dotnet-sonar-scanner-msbuild",
    ),
  ];

  // Extract CLI scanner to 'analyze' tasks
  const cliFolders = [
    path.join(paths.build.extensions.codescancloudTasks, "analyze", "v1", "sonar-scanner"),
  ];
  const cliSrcPath = pathAllFiles(paths.build.classicScanner, `sonar-scanner-${scanner.cliVersion}`);

  const destinations = [
    ...scannerFolders.map(dir => ({ src: classicScannerPath, dest: dir })),
    ...dotnetScannerFolders.map(dir => ({ src: dotnetScannerPath, dest: dir })),
    ...cliFolders.map(dir => ({ src: cliSrcPath, dest: dir }))
  ];

  let count = destinations.length;
  let errorSent = false;

  const onFinish = () => {
    count--;
    if (count === 0 && !errorSent) {
      done();
    }
  };

  const onError = (err) => {
    if (!errorSent) {
      errorSent = true;
      done(err);
    }
  };

  destinations.forEach(item => {
    gulp.src(item.src)
      .pipe(gulp.dest(item.dest))
      .on('finish', onFinish)
      .on('error', onError);
  });
});

gulp.task(
  "copy",
  gulp.series(
    "extension:copy",
    "tasks:old:bundle",
    "tasks:sonarcloud:v1:bundle",
    "tasks:v4:bundle",
    "tasks:v5:bundle",
    "tasks:copy-icons",
    "tasks:document-tasks-version",
    "scanner:download",
    "scanner:extract-scanners",
  ),
);

gulp.task("tfx", (done) => {
  globby
    .sync(path.join(paths.build.extensions.root, "*"), { nodir: false })
    .forEach((extension) => tfxCommand(extension, packageJSON));
  done();
});

gulp.task("build", gulp.series("clean", "copy", "tfx", "cycloneDx"));

/*
 * =========================
 *  TEST TASKS
 * =========================
 */
gulp.task("tfx:test", (done) => {
  const extensions = fs.readdirSync(paths.build.extensions.root)
    .map(name => path.join(paths.build.extensions.root, name))
    .filter(path => fs.statSync(path).isDirectory());
  extensions.forEach((extension) => {
    tfxCommand(extension, packageJSON, `--publisher ` + (yargs.argv.publisher || "codescansf"));
  });
  done();
});

gulp.task("extension:test", (done) => {
  const extensions = fs.readdirSync(paths.extensions.root)
    .map(name => path.join(paths.extensions.root, name))
    .filter(p => fs.statSync(p).isDirectory());

  if (extensions.length === 0) {
    return done();
  }

  extensions.forEach((extension) => {
    const extName = path.relative(paths.extensions.root, extension);
    const buildExtPath = path.join(paths.build.extensions.root, extName);
    
    // Copy test icon
    const testIconPath = path.join(extension, "extension-icon.test.png");
    if (fs.existsSync(testIconPath)) {
      fs.copySync(testIconPath, path.join(buildExtPath, "extension-icon.png"));
    }
    
    const vssExtJsonPath = path.join(buildExtPath, "vss-extension.json");
    const testJsonPath = path.join(extension, "vss-extension.test.json");
    
    if (fs.existsSync(vssExtJsonPath) && fs.existsSync(testJsonPath)) {
      const vssExtensionTest = fs.readJsonSync(testJsonPath);
      // Merge/overwrite vss-extension.json with test values
      const currentVss = fs.readJsonSync(vssExtJsonPath);
      const mergedVss = { ...currentVss, ...vssExtensionTest };
      fs.writeJsonSync(vssExtJsonPath, mergedVss, { spaces: 2 });

      if (vssExtensionTest.id) {
         const oldPath = path.resolve(paths.build.extensions.root, extName);
         const newPath = path.resolve(paths.build.extensions.root, vssExtensionTest.id);
         if (oldPath !== newPath) {
           console.log(`Renaming ${oldPath} to ${newPath}`);
           if (fs.existsSync(newPath)) {
             fs.removeSync(newPath);
           }
           fs.moveSync(oldPath, newPath);
         }
      }
    }
  });

  done();
});

gulp.task("tasks:copy-icons:test", copyIconsTask("task_icon.test.png"));

gulp.task("test", gulp.series("extension:test", "tasks:copy-icons:test"));

gulp.task("build:test", gulp.series("clean", "copy", "test", "tfx:test"));

/*
 * =========================
 *  DEPLOY TASKS
 * =========================
 */


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

  return mergeStream(
    globby
      .sync(
        path.join(
          paths.build.root,
          "*{-codescancloud.vsix,-codescancloud-cyclonedx.json,-codescancloud*.asc}",
        ),
      )
      .map((filePath) => {
        const extensionPath = path.join(paths.build.extensions.root, "codescancloud");
        const vssExtension = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
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
                "codescancloud" +
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

  // const sqExtensionPath = path.join(paths.build.extensions.root, "sonarqube");
  // const sqVssExtension = fs.readJsonSync(path.join(sqExtensionPath, "vss-extension.json"));
  const scExtensionPath = path.join(paths.build.extensions.root, "codescancloud");
  const scVssExtension = fs.readJsonSync(path.join(scExtensionPath, "vss-extension.json"));
  const buildInfo = getBuildInfo(packageJSON, scVssExtension);
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
    .src(path.join(paths.build.root, "*{.vsix,-cyclonedx.json}"))
    .pipe(
      getSignature({
        privateKeyArmored: process.env.GPG_SIGNING_KEY,
        passphrase: process.env.GPG_SIGNING_PASSPHRASE,
      }),
    )
    .pipe(gulp.dest(paths.build.root));
});

gulp.task(
  "deploy",
  gulp.series(
    "build",
    "sign",
    "deploy:buildinfo",
    // "deploy:vsix:sonarqube",
    "deploy:vsix:sonarcloud",
  ),
);

/*
 * =========================
 *  MISC TASKS
 * =========================
 */

// gulp.task("sonarqube-analysis:sonarqube", (done) => {
//   const extensionPath = path.join(paths.extensions.root, "sonarqube");
//   const vssExtension = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
//   const projectVersion = vssExtension.version;
//   if (process.env.CIRRUS_BRANCH === "master" && !process.env.CIRRUS_PR) {
//     runSonnarQubeScanner(done, {
//       "sonar.analysis.sha1": process.env.CIRRUS_CHANGE_IN_REPO,
//       "sonar.projectVersion": projectVersion,
//     });
//   } else if (process.env.CIRRUS_PR) {
//     runSonnarQubeScanner(done, {
//       "sonar.analysis.prNumber": process.env.CIRRUS_PR,
//       "sonar.pullrequest.key": process.env.CIRRUS_PR,
//       "sonar.pullrequest.branch": process.env.CIRRUS_BRANCH,
//       "sonar.pullrequest.base": process.env.CIRRUS_BASE,
//       "sonar.analysis.sha1": process.env.CIRRUS_BASE_SHA,
//       "sonar.projectVersion": projectVersion,
//     });
//   } else {
//     done();
//   }
// });

gulp.task("sonarqube-analysis:sonarcloud", (done) => {
  const extensionPath = path.join(paths.extensions.root, "codescancloud");
  const vssExtension = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
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
      if (resp.statusCode != 200) {
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

  const extensionPath = path.join(paths.extensions.root, "codescancloud");
  const manifestFile = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
  const extensionVersion = manifestFile.version;
  const packageVersion = fullVersion(extensionVersion);

  const url = `${process.env.ARTIFACTORY_URL}/sonarsource/org/sonarsource/scanner/vsts/sonar-scanner-vsts/codescancloud/${packageVersion}/sonar-scanner-vsts-${packageVersion}-codescancloud.vsix`;

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

// gulp.task("burgr:sonarqube", () => {
//   if (process.env.CIRRUS_BRANCH !== "master" && !process.env.CIRRUS_PR) {
//     gutil.log("Not on master nor PR, skip burgr");
//     return gutil.noop;
//   }

//   const extensionPath = path.join(paths.extensions.root, "sonarqube");
//   const manifestFile = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
//   const extensionVersion = manifestFile.version;
//   const packageVersion = fullVersion(extensionVersion);

//   const url = `${process.env.ARTIFACTORY_URL}/sonarsource/org/sonarsource/scanner/vsts/sonar-scanner-vsts/sonarqube/${packageVersion}/sonar-scanner-vsts-${packageVersion}-sonarqube.vsix`;

//   const apiUrl = [
//     process.env.BURGR_URL,
//     "api/promote",
//     process.env.CIRRUS_REPO_OWNER,
//     process.env.CIRRUS_REPO_NAME,
//     process.env.CIRRUS_BUILD_ID,
//   ].join("/");

//   return fetch(apiUrl, {
//     method: "post",
//     body: JSON.stringify({
//       version: packageVersion,
//       url,
//       buildNumber: process.env.BUILD_NUMBER,
//     }),
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Basic ${Buffer.from(
//         `${process.env.BURGR_USERNAME}:${process.env.BURGR_PASSWORD}`,
//       ).toString("base64")}`,
//     },
//   });
// });

gulp.task("default", gulp.series("build"));
