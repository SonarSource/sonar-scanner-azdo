const path = require("path");
const fs = require("fs");
const gulp = require("gulp");
const del = require("del");
const yargs = require("yargs");
const { rollup } = require("rollup");
const jeditor = require("gulp-json-editor");
const ts = require("gulp-typescript");
const gulpReplace = require("gulp-replace");
const { run, downloadOrCopy } = require("./config/utils");
const rename = require("gulp-rename");
const merge = require("merge-stream");
const decompress = require("gulp-decompress");
const typescript = require("typescript");
const { tasks, branches, scanner } = require("./config/config");

// TODO: Windows support?
// TODO: Sign VSIX
// TODO: Cyclone DX

gulp.task("clean", () => {
  return del(["dist/**/*", "build/**/*"]);
});

gulp.task("scanners:clean", () => {
  return del(["build/scanners/**/*"]);
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

function getExtensionTaskBuildDirectory(extension, task) {
  const { version } = JSON.parse(
    fs.readFileSync(`./extensions/${extension}/tasks/${task}/task.json`).toString(),
  );
  const taskVersionString = `${version.Major}.${version.Minor}.${version.Patch}`;
  return `build/tasks/${extension}/tasks/${task}/v${taskVersionString}`;
}

gulp.task("tasks:prepare", () => {
  function tasksPrepare({ extension, task, msBuildScanners, cliScanner }) {
    const taskDir = getExtensionTaskBuildDirectory(extension, task);

    const streams = [
      gulp.src(`extensions/${extension}/tasks/${task}/task.json`).pipe(gulp.dest(taskDir)),
      gulp.src(`src/node_modules/**/*`).pipe(gulp.dest(path.join(taskDir, "node_modules"))),
    ];

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

    return streams;
  }

  return merge(...tasks.map(tasksPrepare));
});

gulp.task("tasks:build", () => {
  function tasksBuild(extension, task) {
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

  return merge(...tasks.map((task) => tasksBuild(task.extension, task.task)));
});

gulp.task("tasks", gulp.series("tasks:prepare", "tasks:build"));

gulp.task("extension:prepare", (done) => {
  const outDir = "build/extensions";

  run(`cp -r extensions build/extensions`);
  run(`rm -rf ${outDir}/sonarqube/tasks`); // Drop default 'tasks' folder
  run(`cp -r build/tasks/sonarqube/tasks ${outDir}/sonarqube/tasks`);
  run(`cp -r build/tasks/sonarcloud/tasks ${outDir}/sonarcloud/tasks`);
  done();
});

gulp.task("extension:patch-test", () => {
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
    .pipe(gulp.dest("build/extensions"));

  return merge(replaceTestFiles, hotixVssExtension);
});

gulp.task("extension:build", (done) => {
  const outDir = "build/extensions";
  const vsixDir = __dirname + "/dist";
  const publisher = yargs.argv.publisher || "foo";

  run(
    `cd ${outDir}/sonarqube && tfx extension create --output-path "${vsixDir}" --publisher ${publisher}`,
  );
  run(
    `cd ${outDir}/sonarcloud && tfx extension create --output-path "${vsixDir}" --publisher ${publisher}`,
  );
  done();
});

gulp.task("extension", gulp.series("extension:prepare", "extension:patch-test", "extension:build"));

gulp.task("build", gulp.series("clean", "scanners", "tasks", "extension"));

gulp.task("build:test", gulp.series("clean", "scanners", "tasks", "extension"));

gulp.task("default", gulp.series("build"));

gulp.task("full-build", async () => {
  const output = run("git status -s", { stdio: "pipe" });
  if (output.length > 0) {
    throw new Error("Working directory is not clean. Commit all your changes to build.");
  }

  // Get current reference
  const currentRef = run("git rev-parse HEAD", { stdio: "pipe" }).replace("/refs/heads/", "");

  // For each branch to build
  for (const branchRef of branches) {
    // Checkout the branch and build it
    run(`git checkout ${branchRef}`);
    await gulp.task("tasks")();
  }
  run(`git checkout ${currentRef}`);
});
