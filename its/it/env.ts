export function loadEnvironmentVariables() {
  const { SONARCLOUD_TOKEN, AZURE_TOKEN } = process.env;

  if (!SONARCLOUD_TOKEN) {
    throw new Error("SONARCLOUD_TOKEN is required");
  }
  if (!AZURE_TOKEN) {
    throw new Error("AZURE_TOKEN is required");
  }

  return {
    SONARCLOUD_TOKEN,
    AZURE_TOKEN,
  };
}

export function getBranch() {
  return process.env.AZURE_BRANCH;
}
