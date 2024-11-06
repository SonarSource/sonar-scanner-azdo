import * as vm from "azure-devops-node-api";
import { Build, BuildResult, BuildStatus } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { AZDO_BASE_URL, AZDO_ORGANIZATION, AZDO_PROJECT } from "../constant";
import { getBranch, loadEnvironmentVariables } from "./env";

export function getAzdoApi(): vm.WebApi {
  const env = loadEnvironmentVariables();
  const credentialHandler = vm.getPersonalAccessTokenHandler(env.AZURE_TOKEN);
  return new vm.WebApi(AZDO_BASE_URL + AZDO_ORGANIZATION, credentialHandler);
}

export async function runPipeline(
  azdoApi: vm.WebApi,
  pipelineName: string,
  log: (...args: unknown[]) => void = console.log,
): Promise<Build> {
  const azdoBuildApi = await azdoApi.getBuildApi();
  const definitions = await azdoBuildApi.getDefinitions(AZDO_PROJECT, pipelineName);
  if (definitions.length === 0) {
    throw new Error(`No pipeline found with name ${pipelineName}`);
  }

  const branch = getBranch();
  const definition = definitions[0];
  log(`Running pipeline on branch "${branch}"`);
  const build = await azdoBuildApi.queueBuild(
    {
      definition: { id: definition.id },
      project: definition.project,
      sourceBranch: branch,
    },
    AZDO_PROJECT,
  );
  const buildId = build.id as number;
  const projectId = build.project?.id as string;

  log(`Build ${buildId} queued`);
  let buildResult = await azdoBuildApi.getBuild(projectId, buildId);
  while (buildResult.status !== BuildStatus.Completed) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    buildResult = await azdoBuildApi.getBuild(projectId, buildId);
  }

  if (buildResult.result !== BuildResult.Succeeded) {
    throw new Error(`Pipeline failed`);
  }

  return buildResult;
}
