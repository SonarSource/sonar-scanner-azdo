const path = require('path');
const decompress = require('gulp-decompress');
const del = require('del');
const download = require('gulp-download');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const gulpSequence = require('gulp-sequence');
const artifactoryUpload = require('gulp-artifactory-upload');
const gutil = require('gulp-util');
const jeditor = require('gulp-json-editor');
const rename = require('gulp-rename');
const { argv } = require('yargs');
const es = require('event-stream');
const fs = require('fs-extra');
const semver = require('semver');
const crypto = require('crypto');
const through = require('through2');
const request = require('request');
const dateformat = require('dateformat');
const sonarqubeScanner = require('sonarqube-scanner');
const extensionTest = require('./vss-extension.test.json');
const { bundleTsTask, pathAllFiles, npmInstallTask, tfxCommand } = require('./package-utils');

const paths = {
  build: {
    root: 'build',
    extension: path.join('build', 'sonarqube'),
    tasks: path.join('build', 'sonarqube', 'tasks'),
    oldTasks: path.join('build', 'sonarqube', 'oldTasks'),
    tmp: path.join('build', 'tmp'),
    scanner: path.join('build', 'tmp', 'scanner-msbuild')
  },
  common: 'common',
  tasks: 'tasks',
  oldTasks: 'oldTasks'
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
          path.join(paths.build.oldTasks, 'scanner-msbuild-begin', 'SonarQubeScannerMsBuild')
        )
      )
      .pipe(gulp.dest(path.join(paths.build.tasks, 'prepare', 'sonar-scanner-msbuild'))),
    gulp
      .src(pathAllFiles(paths.build.scanner, `sonar-scanner-${sqScannerCliVersion}`))
      .pipe(gulp.dest(path.join(paths.build.oldTasks, 'scanner-cli', 'sonar-scanner')))
      .pipe(gulp.dest(path.join(paths.build.tasks, 'analyze', 'sonar-scanner')))
  )
);

gulp.task('tasks:old:copy', () =>
  gulp
    .src(pathAllFiles(paths.oldTasks, '**'))
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
    .pipe(gulp.dest(paths.build.oldTasks))
);

gulp.task('tasks:old:common', () => {
  let commonPipe = gulp.src(pathAllFiles(paths.common, 'powershell'));
  let logoPipe = gulp.src(path.join('logos', 'icon.png'));
  fs.readdirSync(paths.oldTasks).forEach(dir => {
    commonPipe = commonPipe.pipe(gulp.dest(path.join(paths.build.oldTasks, dir)));
    logoPipe = logoPipe.pipe(gulp.dest(path.join(paths.build.oldTasks, dir)));
  });
  return es.merge(commonPipe, logoPipe);
});

gulp.task('tasks:new:npminstall', () => {
  gulp
    .src([path.join(paths.tasks, '**', 'package.json'), '!**/node_modules/**'])
    .pipe(es.mapSync(file => npmInstallTask(file.path)));
});

gulp.task('tasks:new:copy', () =>
  gulp
    .src([path.join(paths.tasks, '**', 'task.json'), path.join(paths.tasks, '**', '*.png')])
    .pipe(gulp.dest(paths.build.tasks))
);

gulp.task('tasks:new:bundle', ['tasks:new:npminstall'], () =>
  gulp.src([path.join(paths.tasks, '**', '*.ts'), '!**/node_modules/**']).pipe(
    es.mapSync(file => {
      const filePath = path.parse(file.path);
      return bundleTsTask(
        file.path,
        path.join(paths.build.extension, filePath.dir.replace(__dirname, ''), filePath.name + '.js')
      );
    })
  )
);

function getPackageJSON() {
  return JSON.parse(fs.readFileSync('package.json'));
}

function fullVersion() {
  const buildNumber = process.env.TRAVIS_BUILD_NUMBER;
  const packageJSON = getPackageJSON();
  let version = packageJSON.version;
  if (version.endsWith('-SNAPSHOT') && buildNumber) {
    return version.replace('-SNAPSHOT', '.' + buildNumber);
  }
  return version;
}

function semVer() {
  const packageJSON = getPackageJSON();
  return packageJSON.version.replace('-SNAPSHOT', '');
}

gulp.task('tasks:version', () => {
  // Task version can only be made of numbers (up to 3)
  const semVersion = semVer();
  const taskVersion = {
    Major: semver.major(semVersion),
    Minor: semver.minor(semVersion),
    Patch: semver.patch(semVersion)
  };

  return gulp
    .src(path.join(paths.build.tasks, '**', 'task.json'))
    .pipe(
      jeditor({
        version: taskVersion,
        helpMarkDown: `Version: ${fullVersion()}. [More Information](http://redirect.sonarsource.com/doc/install-configure-scanner-tfs-ts.html)`
      })
    )
    .pipe(gulp.dest(paths.build.tasks));
});

gulp.task('tasks:old:test', () => {
  const dirs = fs.readdirSync(paths.oldTasks);
  let taskPipe = gulp.src(path.join('logos', 'icon.test.png')).pipe(rename('icon.png'));
  dirs.forEach(dir => {
    taskPipe = taskPipe.pipe(gulp.dest(path.join(paths.build.oldTasks, dir)));
  });
  return taskPipe;
});

gulp.task('tasks:test', () => {
  const dirs = fs.readdirSync(paths.tasks);
  let taskPipe = gulp.src(path.join('logos', 'icon.test.png')).pipe(rename('icon.png'));
  dirs.forEach(dir => {
    taskPipe = taskPipe.pipe(gulp.dest(path.join(paths.build.tasks, dir)));
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

gulp.task('extension:version', () => {
  let vsixVersion = fullVersion();
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

let hashes = {
  sha1: '',
  md5: ''
};

gulp.task('compute-hashes', ['build'], function() {
  return gulp.src(path.join(paths.build.root, '*.vsix')).pipe(hashsum());
});

gulp.task('deploy-vsix', ['build', 'compute-hashes'], function() {
  if (process.env.TRAVIS_BRANCH !== 'master' && process.env.TRAVIS_PULL_REQUEST === 'false') {
    gutil.log('Not on master nor PR, skip deploy-buildinfo');
    return gutil.noop;
  }
  const packageJSON = getPackageJSON();
  const version = fullVersion();
  const name = packageJSON.name;
  return gulp
    .src('*.vsix')
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
            'X-Checksum-MD5': hashes.md5,
            'X-Checksum-Sha1': hashes.sha1
          }
        }
      })
    )
    .on('error', gutil.log);
});

gulp.task('deploy-buildinfo', ['compute-hashes'], function() {
  if (process.env.TRAVIS_BRANCH !== 'master' && process.env.TRAVIS_PULL_REQUEST === 'false') {
    gutil.log('Not on master nor PR, skip deploy-buildinfo');
    return gutil.noop;
  }
  const packageJSON = getPackageJSON();
  const version = fullVersion();
  const name = packageJSON.name;
  const buildNumber = process.env.TRAVIS_BUILD_NUMBER;
  return request
    .put(
      {
        url: process.env.ARTIFACTORY_URL + '/api/build',
        json: buildInfo(name, version, buildNumber, hashes)
      },
      function(error, response, body) {
        if (error) {
          gutil.log('error:', error);
        }
      }
    )
    .auth(process.env.ARTIFACTORY_DEPLOY_USERNAME, process.env.ARTIFACTORY_DEPLOY_PASSWORD, true);
});

gulp.task('deploy', ['deploy-buildinfo', 'deploy-vsix'], function() {});

function buildInfo(name, version, buildNumber, hashes) {
  return {
    version: '1.0.1',
    name,
    number: buildNumber,
    started: dateformat(new Date(), "yyyy-mm-dd'T'HH:MM:ss.lo"),
    url: process.env.CI_BUILD_URL,
    vcsRevision: process.env.TRAVIS_COMMIT,
    vcsUrl: `https://github.com/${process.env.TRAVIS_REPO_SLUG}.git`,
    modules: [
      {
        id: `org.sonarsource.scanner.vsts:${name}:${version}`,
        properties: {
          artifactsToPublish: `org.sonarsource.scanner.vsts:${name}:vsix`
        },
        artifacts: [
          {
            type: 'vsix',
            sha1: hashes.sha1,
            md5: hashes.md5,
            name: `${name}-${version}.vsix`
          }
        ]
      }
    ],
    properties: {
      'buildInfo.env.PROJECT_VERSION': version,
      'buildInfo.env.ARTIFACTORY_DEPLOY_REPO': 'sonarsource-public-qa',
      'buildInfo.env.TRAVIS_COMMIT': process.env.TRAVIS_COMMIT
    }
  };
}

function hashsum() {
  function processFile(file, encoding, callback) {
    if (file.isNull()) {
      return;
    }
    if (file.isStream()) {
      gutil.log('Streams not supported');
      return;
    }
    for (let algo in hashes) {
      if (hashes.hasOwnProperty(algo)) {
        hashes[algo] = crypto
          .createHash(algo)
          .update(file.contents, 'binary')
          .digest('hex');
        gutil.log(`Computed ${algo}: ${hashes[algo]}`);
      }
    }

    this.push(file);
    callback();
  }

  return through.obj(processFile);
}

gulp.task('sonarqube', function(callback) {
  let commonOptions = {
    'sonar.projectKey': 'org.sonarsource.scanner.vsts:sonar-scanner-vsts',
    'sonar.projectName': 'SonarQube Scanner for TFS/VSTS',
    'sonar.exclusions': 'build/**',
    'sonar.coverage.exclusions': 'gulpfile.js',
    'sonar.analysis.buildNumber': process.env.TRAVIS_BUILD_NUMBER,
    'sonar.analysis.pipeline': process.env.TRAVIS_BUILD_NUMBER,
    'sonar.analysis.sha1': process.env.TRAVIS_COMMIT,
    'sonar.analysis.repository': process.env.TRAVIS_REPO_SLUG
  };
  if (process.env.TRAVIS_BRANCH === 'master' && process.env.TRAVIS_PULL_REQUEST === 'false') {
    sonarqubeScanner(
      {
        serverUrl: process.env.SONAR_HOST_URL,
        token: process.env.SONAR_TOKEN,
        options: {
          ...commonOptions
        }
      },
      callback
    );
  } else if (process.env.TRAVIS_PULL_REQUEST !== 'false') {
    sonarqubeScanner(
      {
        serverUrl: process.env.SONAR_HOST_URL,
        token: process.env.SONAR_TOKEN,
        options: {
          ...commonOptions,
          'sonar.analysis.prNumber': process.env.TRAVIS_PULL_REQUEST,
          'sonar.branch.name': process.env.TRAVIS_PULL_REQUEST_BRANCH,
          'sonar.branch.target': process.env.TRAVIS_BRANCH
        }
      },
      callback
    );
  }
});

gulp.task('copy', [
  'extension:copy',
  'tasks:old:copy',
  'tasks:old:common',
  'tasks:new:copy',
  'tasks:new:bundle',
  'scanner:copy'
]);

gulp.task('version', ['tasks:version', 'extension:version']);

gulp.task('test', ['extension:test', 'tasks:test', 'tasks:old:test']);

gulp.task('build', gulpSequence('clean', 'copy', 'version', 'tfx'));

gulp.task('build:test', gulpSequence('clean', 'copy', 'version', 'test', 'tfx:test'));

gulp.task('default', ['build']);
