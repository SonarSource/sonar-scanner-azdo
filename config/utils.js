/* eslint-disable no-console */
const gulp = require('gulp');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const exec = require('gulp-exec');
const dateformat = require('dateformat');
const mergeStream = require('merge-stream');
const gulpRename = require('gulp-rename');
const gulpDownload = require('gulp-download');
const map = require('map-stream');
const gulpDel = require('del');
const globby = require('globby');
const sonarqubeScanner = require('sonarqube-scanner');
const collect = require("gulp-collect");
const Vinyl = require('vinyl');
const { paths, resolveRelativePath } = require('./paths');

function fail(message) {
  console.error('ERROR: ' + message);
  process.exit(1);
}
exports.fail = fail;

function run(cl, options = {}) {
  console.log();
  console.log('> ' + cl);

  const opts = { stdio: 'inherit', ...options };
  let output;
  try {
    output = execSync(cl, opts);
  } catch (err) {
    if (opts.stdio === 'inherit') {
      console.error(err.output ? err.output.toString() : err.message);
    }
    process.exit(1);
  }

  return (output || '').toString().trim();
}
exports.run = run;

// Return a stream that downloads the file if urlOrPath is a link, or copies it otherwise (if it is a relaitve path)
function downloadOrCopy(urlOrPath) {
  if (urlOrPath.startsWith('http')) {
    return gulpDownload(urlOrPath);
  } else {
    return gulp.src(urlOrPath);
  }
}
exports.downloadOrCopy = downloadOrCopy;

function npmInstall(packagePath) {
  run(`cd ${path.dirname(packagePath)} && npm config list && npm install && cd ${paths.root}`);
}
exports.npmInstall = npmInstall;

exports.npmInstallTask = function (packagePath) {
  const packageJson = fs.readJsonSync(packagePath);
  if (packageJson) {
    if (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0) {
      fail(
        'Task package.json should not contain dev dependencies. Offending package.json: ' +
        packagePath
      );
    }
    npmInstall(packagePath);
  }
};

exports.tfxCommand = function (extensionPath, packageJSON, params = '') {
  const vssExtension = fs.readJsonSync(path.join(extensionPath, 'vss-extension.json'));
  run(
    `"${resolveRelativePath(
      path.join('node_modules', '.bin', 'tfx')
    )}" extension create --output-path "../../${packageJSON.name}-${fullVersion(
      vssExtension.version
    )}-${vssExtension.id}.vsix" ${params}`,
    {
      cwd: resolveRelativePath(extensionPath)
    }
  );
};

function fullVersion(version) {
  console.log("incoming version : " + version)
  const buildNumber = process.env.BUILD_NUMBER; //cirrus
  const buildNumberAzdo = process.env.BUILD_BUILDID; //azure pipelines
  if (buildNumber) {
    return `${version}.${buildNumber}`;
  } else if (buildNumberAzdo && version.indexOf(`.${buildNumberAzdo}`) == -1) {
    return `${version}.${buildNumberAzdo}`;
  } else {
    return version;
  }
}
exports.fullVersion = fullVersion;

function fileHashsum(filePath) {
  const fileContent = fs.readFileSync(filePath);
  return ['sha1', 'md5'].map(algo => {
    const hash = crypto
      .createHash(algo)
      .update(fileContent, 'binary')
      .digest('hex');
    console.log(`Computed "${path.basename(filePath)}" ${algo}: ${hash}`);
    return hash;
  });
}
exports.fileHashsum = fileHashsum;

exports.getBuildInfo = function (packageJson, sqExtensionManifest, scExtensionManifest) {
  const sqPackageVersion = fullVersion(sqExtensionManifest.version);
  const sqVsixPaths = globby.sync(path.join(paths.build.root, `*-sonarqube.vsix`));
  const sqAdditionalPaths = globby.sync(path.join(paths.build.root, `*{-sonarqube-cyclonedx.json,-sonarqube*.asc}`));
  const sqQualifierMatch = new RegExp(`${sqPackageVersion}-(.+)\.vsix$`);

  const scPackageVersion = fullVersion(scExtensionManifest.version);
  const scVsixPaths = globby.sync(path.join(paths.build.root, `*-sonarcloud.vsix`));
  const scAdditionalPaths = globby.sync(path.join(paths.build.root, `*{-sonarcloud-cyclonedx.json,-sonarcloud*.asc}`));
  const scQualifierMatch = new RegExp(`${scPackageVersion}-(.+)\.vsix$`);
  return {
    version: '1.0.1',
    name: packageJson.name,
    number: process.env.BUILD_NUMBER,
    started: dateformat(new Date(), "yyyy-mm-dd'T'HH:MM:ss.lo"),
    url: process.env.CI_BUILD_URL,
    vcsRevision: process.env.CIRRUS_CHANGE_IN_REPO,
    vcsUrl: `https://github.com/${process.env.CIRRUS_REPO_FULL_NAME}.git`,
    modules: [
      {
        id: `org.sonarsource.scanner.vsts:${packageJson.name}-sonarqube:${sqPackageVersion}`,
        properties: {
          artifactsToDownload: sqVsixPaths
            .map(
              filePath =>
                `org.sonarsource.scanner.vsts:${packageJson.name}-sonarqube:vsix:${filePath.match(sqQualifierMatch)[1]
                }`
            )
            .join(',')
        },
        artifacts: [...sqVsixPaths, ...sqAdditionalPaths].map(filePath => {
          const [sha1, md5] = fileHashsum(filePath);
          return {
            type: path.extname(filePath).slice(1),
            sha1,
            md5,
            name: path.basename(filePath)
          };
        })
      },
      {
        id: `org.sonarsource.scanner.vsts:${packageJson.name}-sonarcloud:${scPackageVersion}`,
        properties: {
          artifactsToDownload: scVsixPaths
            .map(
              filePath =>
                `org.sonarsource.scanner.vsts:${packageJson.name}-sonarcloud:vsix:${filePath.match(scQualifierMatch)[1]
                }`
            )
            .join(',')
        },
        artifacts: [...scVsixPaths, ...scAdditionalPaths].map(filePath => {
          const [sha1, md5] = fileHashsum(filePath);
          return {
            type: path.extname(filePath).slice(1),
            sha1,
            md5,
            name: path.basename(filePath)
          };
        })
      }
    ],
    properties: {
      'java.specification.version': '1.8', // Workaround for https://jira.sonarsource.com/browse/RA-115
      'buildInfo.env.SC_PROJECT_VERSION': scPackageVersion,
      'buildInfo.env.SQ_PROJECT_VERSION': sqPackageVersion,
      'buildInfo.env.ARTIFACTORY_DEPLOY_REPO': process.env.ARTIFACTORY_DEPLOY_REPO,
      'buildInfo.env.TRAVIS_COMMIT': process.env.CIRRUS_CHANGE_IN_REPO
    }
  };
};

exports.runSonnarQubeScanner = function (callback, options = {}) {
  const customOptions = {
    'sonar.projectKey': 'org.sonarsource.scanner.vsts:sonar-scanner-vsts',
    'sonar.projectName': 'Azure DevOps extension for SonarQube',
    'sonar.exclusions':
      'build/**, extensions/sonarcloud/**, coverage/**, node_modules/**, **/node_modules/**, **/__tests__/**,' +
      '**/temp-find-method.ts, **/package-lock.json, gulpfile.js'
  };
  runSonarQubeScannerImpl(callback, customOptions, options);
};

exports.runSonnarQubeScannerForSonarCloud = function (callback, options = {}) {
  const customOptions = {
    'sonar.projectKey': 'org.sonarsource.scanner.vsts:sonar-scanner-vsts-sonarcloud',
    'sonar.projectName': 'Azure DevOps extension for SonarCloud',
    'sonar.exclusions':
      'build/**, extensions/sonarqube/**, coverage/**, node_modules/**, **/node_modules/**, **/__tests__/**, ' +
      '**/temp-find-method.ts, **/package-lock.json, gulpfile.js'
  };
  runSonarQubeScannerImpl(callback, customOptions, options);
};

function runSonarQubeScannerImpl(callback, customOptions, options = {}) {
  const commonOptions = {
    'sonar.coverage.exclusions':
      'gulpfile.js, build/**, config/**, coverage/**, extensions/**, scripts/**, **/__tests__/**, **/temp-find-method.ts',
    'sonar.tests': '.',
    'sonar.test.inclusions': '**/__tests__/**',
    'sonar.analysis.buildNumber': process.env.CIRRUS_BUILD_ID,
    'sonar.analysis.pipeline': process.env.CIRRUS_BUILD_ID,
    'sonar.analysis.repository': process.env.CIRRUS_REPO_FULL_NAME,
    'sonar.eslint.reportPaths': 'eslint-report.json',
    'sonar.typescript.lcov.reportPaths': 'coverage/lcov.info'
  };
  sonarqubeScanner(
    {
      serverUrl: process.env.SONAR_HOST_URL || process.env.SONAR_HOST_URL_EXTERNAL_PR,
      token: process.env.SONAR_TOKEN || process.env.SONAR_TOKEN_EXTERNAL_PR,
      options: {
        ...customOptions,
        ...commonOptions,
        ...options
      }
    },
    callback
  );
}

function cycloneDxPipe(flavour, packageJSON, ...ps) {
  const extensionPath = path.join(paths.extensions.root, flavour);
  const vssExtension = fs.readJsonSync(path.join(extensionPath, 'vss-extension.json'));
  const packageVersion = fullVersion(vssExtension.version);
  return mergeStream(ps.map(p =>
    gulp.src(path.join(p, '**', 'package.json'), {
      read: false,
      ignore: path.join(p, '**', 'node_modules', '**')
    })
  ))
    .pipe(exec(file => `npm run cyclonedx-run -- --output ${file.dirname}/cyclonedx.json ${file.dirname}`))
    .pipe(exec.reporter())
    .pipe(map((file, done) => {
      file.contents = fs.readFileSync(`${file.dirname}/cyclonedx.json`)
      file.basename = "cyclonedx.json"
      done(null, file)
    }))
    .pipe(collect.list(files => {
      const mergeFile = new Vinyl({
        cwd: files[files.length - 1].cwd,
        base: files[files.length - 1].base,
        path: path.join(paths.build.root, `${packageJSON.name}-${packageVersion}-${flavour}-cyclonedx.json`),
        contents: null
      });
      mergeFile.inputFiles = files.map(f => f.path)
      return [mergeFile]
    }))
    .pipe(exec(file => `npm run cyclonedx-run -- merge \
    --hierarchical \
    --name ${packageJSON.name}-${flavour} \
    --version ${packageVersion} \
    --input-files ${file.inputFiles.join(' ')} \
    --output-file ${file.path}`))
    .pipe(exec.reporter())
    .pipe(map((file, done) => { gulpDel(file.inputFiles); done(null, null) }))
}
exports.cycloneDxPipe = cycloneDxPipe;

function copyIconsTask(icon = 'task_icon.png') {
  return () =>
    mergeStream(
      globby.sync(path.join(paths.extensions.root, '*'), { nodir: false }).map(extension => {
        let iconPipe = gulp
          .src(path.join(extension, 'tasks_icons', icon))
          .pipe(gulpRename('icon.png'));
        globby.sync(path.join(extension, 'tasks', '*', '*'), { nodir: false }).forEach(dir => {
          iconPipe = iconPipe.pipe(
            gulp.dest(
              path.join(paths.build.extensions.root, path.relative(paths.extensions.root, dir))
            )
          );
        });
        return iconPipe;
      })
    );
}
exports.copyIconsTask = copyIconsTask;
