/*
 * Azure DevOps extension for SonarQube
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { getBuildInfo } = require("./utils");

const SHA = "91abd60397ed63dd2cba2e025568dd454f1ee8f4";

function withEmptyDist(fn) {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), "azdo-build-info-"));
  try {
    return fn(distDir);
  } finally {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
}

function withEnv(extra, fn) {
  const keys = [
    "GITHUB_SHA",
    "GITHUB_REPOSITORY",
    "GITHUB_REF_NAME",
    "GITHUB_HEAD_REF",
    "ENV_PR",
    "BUILD_NUMBER",
    "ARTIFACTORY_DEPLOY_REPO",
    "CI_BUILD_URL",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    delete process.env[key];
  }
  Object.assign(process.env, extra);
  try {
    return fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("records the GitHub SHA on the build info the release lookup reads", () => {
  const buildInfo = withEnv(
    {
      GITHUB_SHA: SHA,
      GITHUB_REPOSITORY: "SonarSource/sonar-scanner-azdo",
      GITHUB_REF_NAME: "master",
      BUILD_NUMBER: "2853",
      ARTIFACTORY_DEPLOY_REPO: "sonarsource-public-qa",
      CI_BUILD_URL: "https://github.com/SonarSource/sonar-scanner-azdo/actions/runs/1",
    },
    () => withEmptyDist((distDir) => getBuildInfo("sonarcloud", { version: "4.3.1" }, distDir)),
  );

  assert.equal(buildInfo.name, "sonar-scanner-azdo-sc");
  assert.equal(buildInfo.number, "2853");
  assert.equal(buildInfo.vcsRevision, SHA);
  assert.deepEqual(buildInfo.vcs, [
    {
      revision: SHA,
      url: "https://github.com/SonarSource/sonar-scanner-azdo.git",
      branch: "master",
    },
  ]);
  assert.equal(buildInfo.properties["buildInfo.env.GITHUB_SHA"], SHA);
  assert.equal(buildInfo.properties["buildInfo.env.GITHUB_REF_NAME"], "master");
  assert.equal(buildInfo.properties["buildInfo.env.SC_PROJECT_VERSION"], "4.3.1.2853");
  assert.equal(Object.hasOwn(buildInfo.properties, "buildInfo.env.TRAVIS_COMMIT"), false);
});

test("uses the pull request head ref as the recorded branch", () => {
  const buildInfo = withEnv(
    {
      GITHUB_SHA: SHA,
      GITHUB_REPOSITORY: "SonarSource/sonar-scanner-azdo",
      GITHUB_REF_NAME: "12/merge",
      GITHUB_HEAD_REF: "feature",
      ENV_PR: "12",
      BUILD_NUMBER: "2853",
    },
    () => withEmptyDist((distDir) => getBuildInfo("sonarqube", { version: "8.3.1" }, distDir)),
  );

  assert.equal(buildInfo.vcs[0].branch, "feature");
  assert.equal(buildInfo.properties["buildInfo.env.GITHUB_REF_NAME"], "feature");
  assert.equal(buildInfo.properties["buildInfo.env.SQ_PROJECT_VERSION"], "8.3.1.2853");
});

test("fails when a vsix name does not include the build number", () => {
  assert.throws(() =>
    withEnv(
      {
        GITHUB_SHA: SHA,
        GITHUB_REPOSITORY: "SonarSource/sonar-scanner-azdo",
        GITHUB_REF_NAME: "master",
        BUILD_NUMBER: "2853",
      },
      () =>
        withEmptyDist((distDir) => {
          fs.writeFileSync(path.join(distDir, "sonar-scanner-azdo-4.3.1-sonarcloud.vsix"), "vsix");
          return getBuildInfo("sonarcloud", { version: "4.3.1" }, distDir);
        }),
    ),
  );
});
