/* eslint-disable no-console */
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const dateformat = require('dateformat');
const globby = require('globby');
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

exports.tfxCommand = function(extensionPath, packageJSON, params = '') {
  const vssExtension = fs.readJsonSync(path.join(extensionPath, 'vss-extension.json'));
  run(
    `"${resolveApp(
      path.join('node_modules', '.bin', 'tfx')
    )}" extension create --output-path "../../${packageJSON.name}-${fullVersion(
      packageJSON.version
    )}-${vssExtension.id}.vsix" ${params}`,
    {
      cwd: resolveApp(extensionPath)
    }
  );
};

exports.cycloneDXCommand = function() {  
  run(
    `"${resolveApp(
      path.join('node_modules', '.bin', 'cyclonedx-node')
    )}" -o "bom.json"`
  );
};


function fullVersion(version) {
  const buildNumber = process.env.BUILD_NUMBER;
  if (version.endsWith('-SNAPSHOT') && buildNumber) {
    return version.replace('-SNAPSHOT', '.' + buildNumber);
  }
  return version;
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

exports.getBuildInfo = function(packageJson, filePath) {
  const packageVersion = fullVersion(packageJson.version);
  const vsixPaths = globby.sync(path.join(paths.build.root, '*.vsix'));
  const qualifierMatch = new RegExp(`${packageVersion}-(.+)\.vsix$`);
  const sbom = path.join(paths.build.root, 'sbom.json');
  const [sbomSha1, sbomMd5] = fileHashsum(sbom)
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
        id: `org.sonarsource.scanner.vsts:${packageJson.name}:${packageVersion}`,
        properties: {
          artifactsToDownload: vsixPaths
            .map(
              filePath =>
                `org.sonarsource.scanner.vsts:${packageJson.name}:vsix:${
                  filePath.match(qualifierMatch)[1]
                }`
            )
            .join(',')
        },
        artifacts: vsixPaths.map(filePath => {
          const [sha1, md5] = fileHashsum(filePath);
          return {
            type: 'vsix',
            sha1,
            md5,
            name: path.basename(filePath)
          };
        })
      },
      {
        id: `org.sonarsource.scanner.vsts:sbom:${packageVersion}`,        
        artifacts: {          
          type: 'json',
          sbomSha1,
          sbomMd5,
          name: path.basename(sbom)
        }
      }

    ],
    properties: {
      'java.specification.version': '1.8', // Workaround for https://jira.sonarsource.com/browse/RA-115
      'buildInfo.env.PROJECT_VERSION': packageVersion,
      'buildInfo.env.ARTIFACTORY_DEPLOY_REPO': process.env.ARTIFACTORY_DEPLOY_REPO,
      'buildInfo.env.TRAVIS_COMMIT': process.env.CIRRUS_CHANGE_IN_REPO
    }
  };
};

exports.runSonnarQubeScanner = function(callback, options = {}) {
  const commonOptions = {
    'sonar.projectKey': 'org.sonarsource.scanner.vsts:sonar-scanner-vsts',
    'sonar.projectName': 'Azure DevOps extension for SonarQube/SonarCloud',
    'sonar.exclusions':
      'build/**, coverage/**, node_modules/**, **/node_modules/**, **/__tests__/**, **/temp-find-method.ts, **/package-lock.json',
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
        ...commonOptions,
        ...options
      }
    },
    callback
  );
};
