const gulp = require('gulp');
const gulpif = require('gulp-if');
const gulpSequence = require('gulp-sequence');
const gutil = require('gulp-util');
const decompress = require('gulp-decompress');
const del = require('del');
const download = require('gulp-download');
const jeditor = require('gulp-json-editor');
const rename = require('gulp-rename');
const argv = require('yargs').argv;
const es = require('event-stream');
const execSync = require('child_process').execSync;
const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');
const ts = require('gulp-typescript').createProject('tsconfig.json');
const extensionTest = require('./vss-extension.test.json');
const { pathAllFiles, npmInstallTask, tfxCommand } = require('./package-utils');

const paths = {
  build: {
    root: 'build',
    extension: path.join('build', 'sonarqube'),
    tasks: path.join('build', 'sonarqube', 'tasks'),
    tmp: path.join('build', 'tmp'),
    scanner: path.join('build', 'tmp', 'scanner-msbuild')
  },
  common: 'common',
  tasks: 'tasks'
};

const sqScannerMSBuildVersion = '3.0.2.656';
const sqScannerCliVersion = '3.0.3.778'; // Has to be the same version as the one embedded in the Scanner for MSBuild
const sqScannerUrl = `https://github.com/SonarSource/sonar-scanner-msbuild/releases/download/${sqScannerMSBuildVersion}/sonar-scanner-msbuild-${sqScannerMSBuildVersion}.zip`;

gulp.task('clean', () => del([path.join(paths.build.root, '**'), '*.vsix']));

gulp.task('scanner:download', () =>
  download(sqScannerUrl)
    .pipe(decompress())
    .pipe(gulp.dest(paths.build.scanner))
);

gulp.task('scanner:copy', ['scanner:download'], () =>
  es.merge(
    gulp
      .src(pathAllFiles(paths.build.scanner))
      .pipe(
        gulp.dest(
          path.join(paths.build.tasks, 'scanner-msbuild-begin', 'v3', 'SonarQubeScannerMsBuild')
        )
      ),
    gulp
      .src(pathAllFiles(paths.build.scanner, `sonar-scanner-${sqScannerCliVersion}`))
      .pipe(gulp.dest(path.join(paths.build.tasks, 'scanner-cli', 'v3', 'sonar-scanner')))
  )
);

gulp.task('tasks:common', () => {
  let taskPipe = gulp.src(pathAllFiles(paths.common));
  const dirs = fs.readdirSync(paths.tasks);
  dirs.forEach(dir => {
    taskPipe = taskPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir)));
  });
  return taskPipe;
});

gulp.task('tasks:logo', () => {
  let taskPipe = gulp.src(path.join('logos', 'icon.png'));
  const dirs = fs.readdirSync(paths.tasks);
  dirs.forEach(dir => {
    taskPipe = taskPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir, 'v3')));
  });
  return taskPipe;
});

gulp.task('tasks:v3:copy', () =>
  gulp
    .src(pathAllFiles(paths.tasks))
    .pipe(
      gulpif(
        file => file.path.endsWith('task.json'),
        jeditor(task => ({
          ...task,
          helpMarkDown:
            `Version: ${task.version.Major}.${task.version.Minor}.${task.version.Patch}. ` +
            task.helpMarkDown
        }))
      )
    )
    .pipe(gulp.dest(paths.build.tasks))
);

gulp.task('tasks:v4:npminstall', () => {
  gulp
    .src([path.join(paths.tasks, '**', 'package.json'), '!**/node_modules/**'])
    .pipe(es.mapSync(file => npmInstallTask(file.path)));
});

gulp.task('tasks:v4:copy', ['tasks:v4:npminstall'], () =>
  gulp
    .src([path.join(paths.tasks, '**', '*.ts'), '!**/node_modules/**'])
    .pipe(ts())
    .pipe(gulp.dest(paths.build.tasks))
);

gulp.task('tasks:version', () => {
  if (!argv.releaseVersion) {
    return Promise.resolve();
  }

  const version = {
    Major: semver.major(argv.releaseVersion),
    Minor: semver.minor(argv.releaseVersion),
    Patch: semver.patch(argv.releaseVersion)
  };

  return gulp
    .src(path.join(paths.build.tasks, '**', 'v4', 'task.json'))
    .pipe(
      jeditor({
        version,
        helpMarkDown: `Version: ${version}. [More Information](http://redirect.sonarsource.com/doc/install-configure-scanner-tfs-ts.html)`
      })
    )
    .pipe(gulp.dest(paths.build.tasks));
});

gulp.task('tasks:test', () => {
  const dirs = fs.readdirSync(paths.tasks);
  let taskPipe = gulp.src(path.join('logos', 'icon.test.png')).pipe(rename('icon.png'));
  dirs.forEach(dir => {
    taskPipe = taskPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir, 'v3')));
  });
  return taskPipe;
});

gulp.task('extension:copy', () =>
  es.merge(
    gulp
      .src(['vss-extension.json', 'extension-icon.png', 'overview.md', 'license-terms.md'])
      .pipe(gulp.dest(paths.build.extension)),
    gulp.src(pathAllFiles('img')).pipe(gulp.dest(path.join(paths.build.extension, 'img'))),
    gulp.src(pathAllFiles('icons')).pipe(gulp.dest(path.join(paths.build.extension, 'icons')))
  )
);

gulp.task(
  'extension:version',
  () =>
    argv.releaseVersion
      ? gulp
          .src(path.join(paths.build.extension, 'vss-extension.json'))
          .pipe(jeditor({ version: argv.releaseVersion }))
          .pipe(gulp.dest(paths.build.extension))
      : Promise.resolve()
);

gulp.task('extension:test', () =>
  es.merge(
    gulp
      .src('extension-icon.test.png')
      .pipe(rename('extension-icon.png'))
      .pipe(gulp.dest(paths.build.extension)),
    gulp
      .src(path.join(paths.build.extension, 'vss-extension.json'))
      .pipe(jeditor(extensionTest))
      .pipe(gulp.dest(paths.build.extension))
  )
);

gulp.task('tfx', () => tfxCommand(paths.build.extension));

gulp.task('tfx:test', () =>
  tfxCommand(paths.build.extension, `--publisher ` + (argv.publisher || 'foo'))
);

gulp.task('copy', [
  'extension:copy',
  'tasks:v3:copy',
  'tasks:v4:copy',
  'tasks:common',
  'tasks:logo',
  'scanner:copy'
]);

gulp.task('version', ['tasks:version', 'extension:version']);

gulp.task('test', ['extension:test', 'tasks:test']);

gulp.task('build', gulpSequence('clean', 'copy', 'version', 'tfx'));

gulp.task('build:test', gulpSequence('clean', 'copy', 'test', 'tfx:test'));

gulp.task('default', ['build']);
