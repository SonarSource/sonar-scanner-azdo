export const PROP_NAMES = {
  HOST_URL: "sonar.host.url",
  TOKEN: "sonar.token",
  LOGIN: "sonar.login",
  PASSSWORD: "sonar.password",
  ORG: "sonar.organization",
  PROJECTKEY: "sonar.projectKey",
  PROJECTNAME: "sonar.projectName",
  PROJECTVERSION: "sonar.projectVersion",
  PROJECTSOURCES: "sonar.sources",
  PROJECTSETTINGS: "project.settings",
};

export enum AzureProvider {
  TfsGit = "TfsGit",
  Svn = "Svn",
  Git = "Git",
  GitHub = "GitHub",
  GitHubEnterprise = "GitHubEnterprise",
  Bitbucket = "Bitbucket",
}

export const DEFAULT_BRANCH_NAME = "refs/heads/master";
