/* eslint-disable no-console */
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const dateformat = require('dateformat');
const sonarqubeScanner = require('sonarqube-scanner');
const { paths, resolveApp } = require('./paths');

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

function npmInstall(packagePath) {
  run(`cd ${path.dirname(packagePath)} && npm install && cd ${paths.root}`);
}
exports.npmInstall = npmInstall;

exports.npmInstallTask = function(packagePath) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath).toString());
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

exports.tfxCommand = function(extensionPath, params = '') {
  run(
    `${resolveApp(
      path.join('node_modules', '.bin', 'tfx')
    )} extension create --output-path "../" ${params}`,
    {
      cwd: resolveApp(extensionPath)
    }
  );
};

function fullVersion(version) {
  const buildNumber = process.env.TRAVIS_BUILD_NUMBER;
  if (version.endsWith('-SNAPSHOT') && buildNumber) {
    return version.replace('-SNAPSHOT', '.' + buildNumber);
  }
  return version;
}
exports.fullVersion = fullVersion;

exports.fileHashsum = function(file) {
  if (file.isNull()) {
    return [];
  }
  if (file.isStream()) {
    console.warn('Streams not supported');
    return [];
  }
  return ['sha1', 'md5'].map(algo => {
    const hash = crypto
      .createHash(algo)
      .update(file.contents, 'binary')
      .digest('hex');
    console.log(`Computed "${path.basename(file.path)}" ${algo}: ${hash}`);
    return hash;
  });
};

exports.getBuildInfo = function(packageJson, [sha1, md5]) {
  const version = fullVersion(packageJson.version);
  return {
    version: '1.0.1',
    name: packageJson.name,
    number: process.env.TRAVIS_BUILD_NUMBER,
    started: dateformat(new Date(), "yyyy-mm-dd'T'HH:MM:ss.lo"),
    url: process.env.CI_BUILD_URL,
    vcsRevision: process.env.TRAVIS_COMMIT,
    vcsUrl: `https://github.com/${process.env.TRAVIS_REPO_SLUG}.git`,
    modules: [
      {
        id: `org.sonarsource.scanner.vsts:${packageJson.name}:${version}`,
        properties: {
          artifactsToPublish: `org.sonarsource.scanner.vsts:${packageJson.name}:vsix`
        },
        artifacts: [
          {
            type: 'vsix',
            sha1,
            md5,
            name: `${packageJson.name}-${version}.vsix`
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
};

exports.runSonnarQubeScanner = function(callback, options = {}) {
  const commonOptions = {
    'sonar.projectKey': 'org.sonarsource.scanner.vsts:sonar-scanner-vsts',
    'sonar.projectName': 'SonarQube Scanner for TFS/VSTS',
    'sonar.exclusions': 'build/**, node_modules/**, **/node_modules/**',
    'sonar.coverage.exclusions': 'gulpfile.js, config/**',
    'sonar.analysis.buildNumber': process.env.TRAVIS_BUILD_NUMBER,
    'sonar.analysis.pipeline': process.env.TRAVIS_BUILD_NUMBER,
    'sonar.analysis.repository': process.env.TRAVIS_REPO_SLUG
  };
  sonarqubeScanner(
    {
      serverUrl: process.env.SONAR_HOST_URL,
      token: process.env.SONAR_TOKEN,
      options: {
        ...commonOptions,
        ...options
      }
    },
    callback
  );
};
