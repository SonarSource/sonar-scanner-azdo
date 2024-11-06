import * as vm from "azure-devops-node-api";
import { ICoreApi } from "azure-devops-node-api/CoreApi";
import { Build, BuildResult, BuildStatus } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { ConnectedServiceKind, WebApiConnectedServiceDetails } from "azure-devops-node-api/interfaces/CoreInterfaces";
import { AZDO_BASE_URL, AZDO_ORGANIZATION, AZDO_PROJECT } from "../constant";
import { getBranch, loadEnvironmentVariables } from "./env";

export function getAzdoApi(): vm.WebApi {
  const env = loadEnvironmentVariables();
  const credentialHandler = vm.getPersonalAccessTokenHandler(env.AZURE_TOKEN);
  return new vm.WebApi(AZDO_BASE_URL + AZDO_ORGANIZATION, credentialHandler);
}

export async function getServiceConnections(azdoApi: vm.WebApi): Promise<void> {
  const coreApiObject: ICoreApi = await azdoApi.getCoreApi();
  const serviceConnections = await coreApiObject.getConnectedServices(AZDO_PROJECT);
  const serviceConnectionDetails = await coreApiObject.getConnectedServiceDetails(
    AZDO_PROJECT,
    "SonarCloud",
  );
  console.log("Service Connections:", { serviceConnections, serviceConnectionDetails });
}

export async function createServiceConnection(
  azdoApi: vm.WebApi,
  hostUrl: string,
  token: string,
): Promise<void> {
  const coreApiObject: ICoreApi = await azdoApi.getCoreApi();

  const connectedService: WebApiConnectedServiceDetails = {
    connectedServiceMetaData: {
      description: "Used for E2E tests",
      friendlyName: "SonarQube",
      id: "EDC775DD-1A82-4ADD-A073-7B5813E87202", // Leave empty for new service connection
      kind: "Custom", //ConnectedServiceKind.Custom
      project: {
        name: AZDO_PROJECT,
      },
    },
    credentialsXml: `
      <ServiceEndpoint>
        <Parameter name="username" value="${token}" />
      </ServiceEndpoint>
      `,
    endPoint: hostUrl,
  };

  try {
    const createdServiceConnection = await coreApiObject.createConnectedService(connectedService, AZDO_PROJECT);
    console.log('Service Connection created:', createdServiceConnection);

  } catch (err) {
    console.error('Error creating service connection:', err);
  }
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
