const { run } = require("../config/utils");
const { branches } = require("../config/config");

const output = run("git status -s", { stdio: "pipe" });
if (output.length > 0) {
  throw new Error("Working directory is not clean. Commit all your changes to build.");
}

if (!process.env.CIRRUS_BRANCH) {
  throw new Error("This script is intended to be run in Cirrus CI only.");
}

// Prepare the build environment
run(`npx gulp clean`);
run(`npx gulp scanners`);
run(`npx gulp tasks`);

// For each branch to build
for (const branchRef of branches) {
  // Checkout the branch and build it
  run(`git checkout ${branchRef}`);
  run(`npx gulp scanners`);
  run(`npx gulp tasks`);
}

// Complete the extension build on main branch
run(`git checkout ${process.env.CIRRUS_BRANCH}`);
run(`npx gulp extension`);

console.warn(
  "Build complete. Note that your branch has been changed. Please checkout your branch again.",
);
