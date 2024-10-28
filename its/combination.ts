import { PipelineCombination } from "./types";

export function generateCombinations(): PipelineCombination[] {
  const osCombinations: PipelineCombination["os"][] = ["unix", "windows"];
  const versionCombinations: PipelineCombination["version"][] = [
    { extension: "sonarcloud", version: 1 },
    { extension: "sonarcloud", version: 2 },
    { extension: "sonarcloud", version: 3 },
    { extension: "sonarqube", version: 5 },
    { extension: "sonarqube", version: 6 },
    { extension: "sonarqube", version: 7 },
    { extension: "sonarqube:lts", version: 5 },
    { extension: "sonarqube:lts", version: 6 },
    { extension: "sonarqube:lts", version: 7 },
  ];
  const scannerCombinations: PipelineCombination["scanner"][] = [
    { type: "cli" },
    { type: "cli", version: "1.2.3" },
    { type: "dotnet" },
    { type: "dotnet", version: "4.5.6" },
    "other",
  ];

  const combinations: PipelineCombination[] = [];
  for (const os of osCombinations) {
    for (const version of versionCombinations) {
      for (const scanner of scannerCombinations) {
        combinations.push({ os, version, scanner });
      }
    }
  }

  return combinations;
}

export function serializeCombination(config: PipelineCombination) {
  return [
    config.version.extension,
    `v${config.version.version}`,
    config.scanner === "other"
      ? config.scanner
      : `${config.scanner.type}:${config.scanner.version ?? "embedded"}`,
    config.os,
  ].join("-");
}
