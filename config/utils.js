/* eslint-disable no-console */
const gulp = require("gulp");
const crypto = require("crypto");
const path = require("path");
const { execSync } = require("child_process");
const fs = require("fs-extra");
const exec = require("gulp-exec");
const dateformat = require("dateformat");
const mergeStream = require("merge-stream");
const gulpRename = require("gulp-rename");
const gulpDownload = require("gulp-download");
const map = require("map-stream");
const { globSync: glob } = require("glob");
const sonarqubeScanner = require("sonarqube-scanner").default;
const Vinyl = require("vinyl");
const { resolveRelativePath, SOURCE_DIR, DIST_DIR, BUILD_DIR } = require("./paths");

function fail(message) {
  console.error("ERROR: " + message);
  process.exit(1);
}
exports.fail = fail;

function run(cl, options = {}) {
  console.log();
  console.log("> " + cl);

  const opts = { stdio: "inherit", ...options };
  let output;
  try {
    output = execSync(cl, opts);
  } catch (err) {
    if (opts.stdio === "inherit") {
      console.error(err.output ? err.output.toString() : err.message);
    }
    process.exit(1);
  }

  return (output || "").toString().trim();
}
exports.run = run;

// Return a stream that downloads the file if urlOrPath is a link, or copies it otherwise (if it is a relaitve path)
function downloadOrCopy(urlOrPath) {
  if (urlOrPath.startsWith("http")) {
    return gulpDownload(urlOrPath);
  } else {
    return gulp.src(urlOrPath);
  }
}
exports.downloadOrCopy = downloadOrCopy;

function npmInstall(packagePath) {
  const cwd = process.cwd();
  run(`cd ${path.dirname(packagePath)} && npm install && cd ${cwd}`);
}
exports.npmInstall = npmInstall;

exports.npmInstallTask = function (packagePath) {
  const packageJson = fs.readJsonSync(packagePath);
  if (packageJson) {
    npmInstall(packagePath);
  }
};

exports.tfxCommand = function (extensionPath, packageJSON, params = "") {
  const vssExtension = fs.readJsonSync(path.join(extensionPath, "vss-extension.json"));
  run(
    `"${resolveRelativePath(
      path.join("node_modules", ".bin", "tfx"),
    )}" extension create --output-path "../../${packageJSON.name}-${getVersionWithCirrusBuildNumber(
      vssExtension.version,
    )}-${vssExtension.id}.vsix" ${params}`,
    {
      cwd: resolveRelativePath(extensionPath),
    },
  );
};

function getVersionWithCirrusBuildNumber(version) {
  const buildNumber = process.env.BUILD_NUMBER; // Cirrus CI build number
  console.log(`Incoming version: ${version} with build number ${buildNumber}`);
  if (buildNumber) {
    return `${version}.${buildNumber}`;
  } else {
    return version;
  }
}
exports.getVersionWithCirrusBuildNumber = getVersionWithCirrusBuildNumber;

function fileHashsum(filePath) {
  const fileContent = fs.readFileSync(filePath);
  return ["sha1", "md5"].map((algo) => {
    const hash = crypto.createHash(algo).update(fileContent, "binary").digest("hex");
    console.log(`Computed "${path.basename(filePath)}" ${algo}: ${hash}`);
    return hash;
  });
}
exports.fileHashsum = fileHashsum;

exports.getBuildInfo = function (type, vssData) {
  const productAccronym = type === "sonarqube" ? "sq" : "sc";
  const name = `sonar-scanner-azdo-${productAccronym}`;

  const packageVersion = getVersionWithCirrusBuildNumber(vssData.version);
  const vsixPaths = glob(globPath(DIST_DIR, `*-${type}.vsix`));
  const additionalPaths = glob(
    globPath(DIST_DIR, `*{cyclonedx-${type}-*.json,cyclonedx-latest.json,-${type}*.asc}`),
  );
  const qualifierMatch = new RegExp(`${packageVersion}-(.+).vsix$`);

  return {
    version: "1.0.1",
    name,
    number: process.env.BUILD_NUMBER,
    started: dateformat(new Date(), "yyyy-mm-dd'T'HH:MM:ss.lo"),
    url: process.env.CI_BUILD_URL,
    vcsRevision: process.env.CIRRUS_CHANGE_IN_REPO,
    vcsUrl: `https://github.com/${process.env.CIRRUS_REPO_FULL_NAME}.git`,
    modules: [
      {
        id: `org.sonarsource.scanner.azdo:${name}:${packageVersion}`,
        properties: {
          artifactsToDownload: vsixPaths
            .map(
              (filePath) =>
                `org.sonarsource.scanner.azdo:${name}:vsix:${filePath.match(qualifierMatch)[1]}`,
            )
            .join(","),
        },
        artifacts: [...vsixPaths, ...additionalPaths].map((filePath) => {
          const [sha1, md5] = fileHashsum(filePath);
          return {
            type: path.extname(filePath).slice(1),
            sha1,
            md5,
            name: path.basename(filePath),
          };
        }),
      },
    ],
    properties: {
      "java.specification.version": "1.8", // Workaround for https://jira.sonarsource.com/browse/RA-115
      [`buildInfo.env.${productAccronym.toUpperCase()}_PROJECT_VERSION`]: packageVersion,
      "buildInfo.env.ARTIFACTORY_DEPLOY_REPO": process.env.ARTIFACTORY_DEPLOY_REPO,
      "buildInfo.env.TRAVIS_COMMIT": process.env.CIRRUS_CHANGE_IN_REPO,
    },
  };
};

exports.runSonarQubeScanner = function (extension, customOptions, callback) {
  const baseExclusions = [
    "build/**",
    "coverage/**",
    "**/node_modules/**",
    "**/__tests__/**",
    "**/temp-find-method.ts",
    "**/package-lock.json",
    "gulpfile.js",
    "**/jest.config.js",
    "**/babel.config.js",
    "**/esbuild.config.js",
  ];

  const baseOptions = {
    sonarqube: {
      "sonar.projectKey": "sonar-scanner-azdo-sq",
      "sonar.projectName": "Azure DevOps extension for SonarQube Server",
      "sonar.exclusions": baseExclusions.concat(["src/extensions/sonarcloud/**"]).join(","),
    },
    sonarcloud: {
      "sonar.projectKey": "sonar-scanner-azdo-sc",
      "sonar.projectName": "Azure DevOps extension for SonarQube Cloud",
      "sonar.exclusions": baseExclusions.concat(["src/extensions/sonarqube/**"]).join(","),
    },
  }[extension];

  if (!baseOptions) {
    throw new Error(`Unknown extension: ${extension}`);
  }

  const vssExtension = fs.readJsonSync(
    path.join(SOURCE_DIR, "extensions", extension, "vss-extension.json"),
  );

  const options = {
    ...baseOptions,
    "sonar.sources": "src",
    "sonar.projectVersion": vssExtension.version,
    "sonar.coverage.exclusions":
      "gulpfile.js, build/**, config/**, coverage/**, extensions/**, scripts/**, **/__tests__/**, **/mocks/**, **/temp-find-method.ts, src/common/sonarqube-v*/**, src/common/sonarcloud-v*/**",
    "sonar.cpd.exclusions": "src/common/sonarqube-v*/**, src/common/sonarcloud-v*/**",
    "sonar.tests": ".",
    "sonar.test.inclusions": "**/__tests__/**",
    "sonar.analysis.buildNumber": process.env.CIRRUS_BUILD_ID,
    "sonar.analysis.pipeline": process.env.CIRRUS_BUILD_ID,
    "sonar.analysis.repository": process.env.CIRRUS_REPO_FULL_NAME,
    "sonar.eslint.reportPaths": "eslint-report.json",
    "sonar.javascript.lcov.reportPaths": glob([
      globPath("src", "common", "*", "coverage", "lcov.info"),
    ]).join(","),
    ...customOptions,
  };

  sonarqubeScanner(
    {
      serverUrl: process.env.SONAR_HOST_URL || process.env.SONAR_HOST_URL_EXTERNAL_PR,
      token: process.env.SONAR_TOKEN || process.env.SONAR_TOKEN_EXTERNAL_PR,
      options,
    },
    callback,
  );
};

function cycloneDxPipe(...commonPaths) {
  return mergeStream(
    commonPaths.map((commonPath) =>
      gulp.src(path.join(commonPath, "package.json"), {
        read: false,
      }),
    ),
  )
    .pipe(
      exec((file) => {
        const flavour = file.dirname.split(path.sep).pop();
        return `npm run cyclonedx-run -- --output-file ${DIST_DIR}/cyclonedx-${flavour}.json ${file.dirname}/package.json`;
      }),
    )
    .pipe(exec.reporter());
}
exports.cycloneDxPipe = cycloneDxPipe;

function globPath(...segments) {
    return path.join(...segments).replace(/\\/g, "/");
}
exports.globPath = globPath;

