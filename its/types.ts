export type YamlContent = { [key: string]: unknown };

export type TaskDefinition = Partial<{
  task: string;
  script: string;
  workingDirectory: string;
  inputs: YamlContent;
}>;

export type PipelineCombination = {
  // OS to run on
  os: "unix" | "windows";

  // Version of the tasks to use (incl. extension)
  version:
    | {
        extension: "sonarcloud";
        version: 3;
      }
    | {
        extension: "sonarqube" | "sonarqube:lts";
        version: 7;
      };

  // Scanner to use
  scanner:
    | {
        type: "cli" | "dotnet";
        version?: string;
      }
    | {
        type: "other";
        subtype: "gradle" | "maven";
      };
};
