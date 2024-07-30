const path = require("path");

/**
 * Tasks that need the msbuild scanner embedded
 */
exports.taskNeedsMsBuildScanner = function (taskName) {
  return ["SonarQubePrepare", "SonarCloudPrepare"].includes(taskName);
};

/**
 * Tasks that need the CLI scanner embedded
 */
exports.taskNeedsCliScanner = function (taskName) {
  return ["SonarQubeAnalyze", "SonarCloudAnalyze"].includes(taskName);
};

/**
 * Get the extension of the task
 */
exports.getTaskExtension = function (taskName) {
  if (taskName.startsWith("SonarQube")) {
    return "sonarqube";
  } else {
    return "sonarcloud";
  }
};

/**
 * Get the common folder for the task
 */
exports.getTaskCommonFolder = function (taskName, version) {
  const extension = exports.getTaskExtension(taskName);
  if (extension === "sonarcloud" && version === "v3") {
    return "latest";
  }
  if (extension === "sonarqube" && version === "v7") {
    return "latest";
  }
  return `${extension}-${version}`;
};
