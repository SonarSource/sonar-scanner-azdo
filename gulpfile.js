const path = require('path');
const fs = require('fs-extra');
const request = require('request');
const yargs = require('yargs');
const artifactoryUpload = require('gulp-artifactory-upload');
const decompress = require('gulp-decompress');
const download = require('gulp-download');
const gulp = require('gulp');
const gulpDel = require('del');
const gulpif = require('gulp-if');
const gulpRename = require('gulp-rename');
const gulpReplace = require('gulp-replace');
const gulpSequence = require('gulp-sequence');
const gulpTs = require('gulp-typescript');
const gutil = require('gulp-util');
const jeditor = require('gulp-json-editor');
const es = require('event-stream');
const through = require('through2');
const typescript = require('typescript');
const { paths, getAllTasksOfType, pathAllFiles } = require('./config/paths');
const {
  fileHashsum,
  fullVersion,
  getBuildInfo,
  npmInstallTask,
  runSonnarQubeScanner,
  tfxCommand
} = require('./config/utils');
const { scanner } = require('./config/config');
const extensionTest = require('./vss-extension.test.json');
const packageJSON = require('./package.json');

gulp.task('clean', () => gulpDel([path.join(paths.build.root, '**'), '*.vsix']));

gulp.task('scanner:download', () =>
  download(scanner.url)
    .pipe(decompress())
    .pipe(gulp.dest(paths.build.scanner))
);

gulp.task('scanner:copy', ['scanner:download'], () =>
  es.merge(
    gulp
      .src(pathAllFiles(paths.build.scanner))
      .pipe(gulp.dest(path.join(paths.build.tasks, 'prepare', 'old', 'SonarQubeScannerMsBuild')))
      .pipe(gulp.dest(path.join(paths.build.tasks, 'prepare', 'new', 'sonar-scanner-msbuild'))),
    gulp
      .src(pathAllFiles(paths.build.scanner, `sonar-scanner-${scanner.cliVersion}`))
      .pipe(gulp.dest(path.join(paths.build.tasks, 'scanner-cli', 'old', 'sonar-scanner')))
      .pipe(gulp.dest(path.join(paths.build.tasks, 'analyze', 'new', 'sonar-scanner')))
  )
);

gulp.task('tasks:old:copy', () =>
  gulp.src(pathAllFiles(paths.tasks.old)).pipe(gulp.dest(paths.build.tasks))
);

gulp.task('tasks:old:common', () => {
  let commonPipe = gulp.src(pathAllFiles(paths.common.old));
  let logoPipe = gulp
    .src(path.join(paths.common.icons, 'old_task_icon.png'))
    .pipe(gulpRename('icon.png'));
  getAllTasksOfType(paths.tasks.root, 'old').forEach(dir => {
    commonPipe = commonPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir, 'old')));
    logoPipe = logoPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir, 'old')));
  });
  return es.merge(commonPipe, logoPipe);
});

gulp.task('tasks:old:test', () => {
  let taskPipe = gulp
    .src(path.join(paths.common.icons, 'old_task_icon.test.png'))
    .pipe(gulpRename('icon.png'));
  getAllTasksOfType(paths.tasks.root, 'old').forEach(dir => {
    taskPipe = taskPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir, 'old')));
  });
  return taskPipe;
});

gulp.task('tasks:new:logo', () => {
  let logoPipe = gulp
    .src(path.join(paths.common.icons, 'new_task_icon.png'))
    .pipe(gulpRename('icon.png'));
  getAllTasksOfType(paths.tasks.root, 'new').forEach(dir => {
    logoPipe = logoPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir, 'new')));
  });
  return logoPipe;
});

gulp.task('tasks:new:npminstall', () =>
  gulp
    .src([path.join(paths.tasks.new, 'package.json'), path.join(paths.common.new, 'package.json')])
    .pipe(es.mapSync(file => npmInstallTask(file.path)))
);

gulp.task('tasks:new:ts', ['tasks:new:npminstall'], () =>
  gulp
    .src([
      path.join(paths.tasks.new, '**', '*.ts'),
      '!' + path.join('**', 'node_modules', '**'),
      '!' + path.join('**', '__tests__', '**')
    ])
    .pipe(gulpTs.createProject('./tsconfig.json', { typescript })())
    .once('error', () => {
      this.once('finish', () => process.exit(1));
    })
    .pipe(gulpReplace('../../../common/ts/', './common/'))
    .pipe(gulp.dest(paths.build.tasks))
);

gulp.task('tasks:new:common:ts', ['tasks:new:npminstall'], () => {
  let commonPipe = gulp
    .src([
      path.join(paths.common.new, '**', '*.ts'),
      '!' + path.join('**', 'node_modules', '**'),
      '!' + path.join('**', '__tests__', '**')
    ])
    .pipe(gulpTs.createProject('./tsconfig.json', { typescript })())
    .once('error', () => {
      this.once('finish', () => process.exit(1));
    });

  getAllTasksOfType(paths.tasks.root, 'new').forEach(dir => {
    commonPipe = commonPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir, 'new', 'common')));
  });
  return commonPipe;
});

gulp.task('tasks:new:copy', ['tasks:new:npminstall'], () =>
  gulp
    .src([path.join(paths.tasks.new, 'task.json'), pathAllFiles(paths.tasks.new, 'node_modules')])
    .pipe(gulp.dest(paths.build.tasks))
);

gulp.task('tasks:new:common:copy', ['tasks:new:npminstall'], () => {
  let commonPipe = gulp.src(pathAllFiles(paths.common.new, 'node_modules'));
  getAllTasksOfType(paths.tasks.root, 'new').forEach(dir => {
    commonPipe = commonPipe.pipe(
      gulp.dest(path.join(paths.build.tasks, dir, 'new', 'node_modules'))
    );
  });
  return commonPipe;
});

gulp.task('tasks:new:bundle', [
  'tasks:new:ts',
  'tasks:new:common:ts',
  'tasks:new:copy',
  'tasks:new:common:copy'
]);

gulp.task('tasks:new:test', () => {
  let taskPipe = gulp
    .src(path.join(paths.common.icons, 'new_task_icon.test.png'))
    .pipe(gulpRename('icon.png'));
  getAllTasksOfType(paths.tasks.root, 'new').forEach(dir => {
    taskPipe = taskPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir, 'new')));
  });
  return taskPipe;
});

gulp.task('tasks:version', () => {
  return gulp
    .src(path.join(paths.build.tasks, '**', 'task.json'))
    .pipe(
      jeditor(task => ({
        ...task,
        helpMarkDown:
          `Version: ${task.version.Major}.${task.version.Minor}.${task.version.Patch}. ` +
          task.helpMarkDown
      }))
    )
    .pipe(gulp.dest(paths.build.tasks));
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

gulp.task('extension:version', () => {
  let vsixVersion = fullVersion(packageJSON.version);
  // Extension version can only be made of numbers (up to 4)
  if (vsixVersion.endsWith('-SNAPSHOT')) {
    vsixVersion = vsixVersion.replace('-SNAPSHOT', '');
  }
  gulp
    .src(path.join(paths.build.extension, 'vss-extension.json'))
    .pipe(jeditor({ version: `${vsixVersion}` }))
    .pipe(gulp.dest(paths.build.extension));
});

gulp.task('extension:test', () =>
  es.merge(
    gulp
      .src('extension-icon.test.png')
      .pipe(gulpRename('extension-icon.png'))
      .pipe(gulp.dest(paths.build.extension)),
    gulp
      .src(path.join(paths.build.extension, 'vss-extension.json'))
      .pipe(jeditor(extensionTest))
      .pipe(gulp.dest(paths.build.extension))
  )
);

gulp.task('tfx', () => tfxCommand(paths.build.extension));

gulp.task('tfx:test', () =>
  tfxCommand(paths.build.extension, `--publisher ` + (yargs.argv.publisher || 'foo'))
);

gulp.task('deploy:vsix', ['build'], () => {
  if (process.env.TRAVIS_BRANCH !== 'master' && process.env.TRAVIS_PULL_REQUEST === 'false') {
    gutil.log('Not on master nor PR, skip deploy:buildinfo');
    return gutil.noop;
  }
  const { name } = packageJSON;
  const version = fullVersion(packageJSON.version);
  return gulp.src(path.join(paths.build.root, '*.vsix')).pipe(
    through.obj((file, enc, cb) => {
      const [sha1, md5] = fileHashsum(file);
      gulp
        .src(file.path)
        .pipe(
          artifactoryUpload({
            url:
              process.env.ARTIFACTORY_URL +
              '/' +
              process.env.ARTIFACTORY_DEPLOY_REPO +
              '/org/sonarsource/scanner/vsts/' +
              name +
              '/' +
              version,
            username: process.env.ARTIFACTORY_DEPLOY_USERNAME,
            password: process.env.ARTIFACTORY_DEPLOY_PASSWORD,
            properties: {
              'vcs.revision': process.env.TRAVIS_COMMIT,
              'vcs.branch': process.env.TRAVIS_BRANCH,
              'build.name': name,
              'build.number': process.env.TRAVIS_BUILD_NUMBER
            },
            request: {
              headers: {
                'X-Checksum-MD5': md5,
                'X-Checksum-Sha1': sha1
              }
            }
          })
        )
        .on('error', gutil.log)
        .on('end', cb);
    })
  );
});

gulp.task('deploy:buildinfo', ['build'], () => {
  if (process.env.TRAVIS_BRANCH !== 'master' && process.env.TRAVIS_PULL_REQUEST === 'false') {
    gutil.log('Not on master nor PR, skip deploy:buildinfo');
    return gutil.noop;
  }
  return gulp.src(path.join(paths.build.root, '*.vsix')).pipe(
    through.obj((file, enc, cb) =>
      request
        .put(
          {
            url: process.env.ARTIFACTORY_URL + '/api/build',
            json: getBuildInfo(packageJSON, fileHashsum(file))
          },
          (error, response, body) => {
            if (error) {
              gutil.log('error:', error);
            }
            cb();
          }
        )
        .auth(
          process.env.ARTIFACTORY_DEPLOY_USERNAME,
          process.env.ARTIFACTORY_DEPLOY_PASSWORD,
          true
        )
    )
  );
});

gulp.task('sonarqube', callback => {
  if (process.env.TRAVIS_BRANCH === 'master' && process.env.TRAVIS_PULL_REQUEST === 'false') {
    runSonnarQubeScanner(callback, { 'sonar.analysis.sha1': process.env.TRAVIS_COMMIT });
  } else if (process.env.TRAVIS_PULL_REQUEST !== 'false') {
    runSonnarQubeScanner(callback, {
      'sonar.analysis.prNumber': process.env.TRAVIS_PULL_REQUEST,
      'sonar.branch.name': process.env.TRAVIS_PULL_REQUEST_BRANCH,
      'sonar.branch.target': process.env.TRAVIS_BRANCH,
      'sonar.analysis.sha1': process.env.TRAVIS_PULL_REQUEST_SHA
    });
  }
});

gulp.task('copy', [
  'extension:copy',
  'tasks:old:copy',
  'tasks:old:common',
  'tasks:new:logo',
  'tasks:new:bundle',
  'scanner:copy'
]);

gulp.task('deploy', ['deploy:buildinfo', 'deploy:vsix']);

gulp.task('version', ['tasks:version', 'extension:version']);

gulp.task('test', ['extension:test', 'tasks:new:test', 'tasks:old:test']);

gulp.task('build', gulpSequence('clean', 'copy', 'version', 'tfx'));

gulp.task('build:test', gulpSequence('clean', 'copy', 'version', 'test', 'tfx:test'));

gulp.task('default', ['build']);
