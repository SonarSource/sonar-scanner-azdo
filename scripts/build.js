const { run } = require("../config/utils");
const { branches } = require("../config/config");

const output = run("git status -s", { stdio: "pipe" });
if (output.length > 0) {
  throw new Error("Working directory is not clean. Commit all your changes to build.");
}

// Get current reference
const currentRef = run("git rev-parse HEAD", { stdio: "pipe" }).replace("/refs/heads/", "");

// For each branch to build
for (const branchRef of branches) {
  // Checkout the branch and build it
  run(`git checkout ${branchRef}`);
  run("npx gulp tasks");
}
run(`git checkout ${currentRef}`);
