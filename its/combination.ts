import { PipelineCombination } from "./types";

export function generateCombinations(): PipelineCombination[] {
  const osCombinations: PipelineCombination["os"][] = ["unix", "windows"];
  const versionCombinations: PipelineCombination["version"][] = [
    { extension: "sonarcloud", version: 1 },
    { extension: "sonarcloud", version: 2 },
    { extension: "sonarcloud", version: 3 },
    { extension: "sonarqube", version: 7 },
  ];
  const scannerCombinations: PipelineCombination["scanner"][] = [
    { type: "cli" },
    { type: "cli", version: "6.2.1.4610" },
    { type: "dotnet" },
    { type: "dotnet", version: "8.0.3.99785" },
    { type: "other", subtype: "gradle" },
    { type: "other", subtype: "maven" },
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
    config.scanner.type,
    config.scanner.type === "other"
      ? config.scanner.subtype
      : (config.scanner.version ?? "embedded"),
    config.os,
  ].join("-");
}
