const { shellJsPlugin } = require("esbuild-plugin-shelljs");

module.exports = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node16",
  minify: true,
  plugins: [shellJsPlugin],
};
