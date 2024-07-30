module.exports = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node16",
  minify: true,
  /**
   * @see https://github.com/microsoft/azure-pipelines-task-lib/issues/942#issuecomment-1904939900
   */
  external: ["shelljs"],
};
