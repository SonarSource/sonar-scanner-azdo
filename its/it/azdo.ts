/*
 * Azure DevOps extension for SonarQube
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import * as vm from "azure-devops-node-api";
import { IBuildApi } from "azure-devops-node-api/BuildApi";
import {
  Build,
  BuildDefinition,
  BuildDefinitionReference,
  BuildResult,
  BuildStatus,
  DefinitionQueryOrder,
} from "azure-devops-node-api/interfaces/BuildInterfaces";
import path from "path";
import {
  AZDO_BASE_URL,
  AZDO_MAIN_PIPELINE_NAME,
  AZDO_ORGANIZATION,
  AZDO_PIPELINE_NAME_PREFIX,
  AZDO_PROJECT,
  FIXTURES_PATH,
} from "../constant";
import { getBranch, loadEnvironmentVariables } from "./env";

const DEFINITIONS_PAGINATION_LIMIT = 500;

export function getAzdoApi(): vm.WebApi {
  const env = loadEnvironmentVariables();
  const credentialHandler = vm.getPersonalAccessTokenHandler(env.AZURE_TOKEN);
  return new vm.WebApi(AZDO_BASE_URL + AZDO_ORGANIZATION, credentialHandler);
}

export async function getTemplatePipeline(buildApi: IBuildApi): Promise<BuildDefinition> {
  // Find an existing pipeline to use as a template
  const definitions = await buildApi.getDefinitions(AZDO_PROJECT, AZDO_MAIN_PIPELINE_NAME);
  const definition = definitions[0];
  if (!definition) {
    throw new Error(`The main pipeline ${AZDO_MAIN_PIPELINE_NAME} was not found. It's needed to be used as a template to create the other pipelines.`);
  }
  // Get full object
  return buildApi.getDefinition(
    AZDO_PROJECT,
    definition.id as number,
  );
}

export async function createPipeline(
  buildApi: IBuildApi,
  template: BuildDefinition,
  pipelineName: string,
): Promise<void> {
  const existingPipelines = await buildApi.getDefinitions(AZDO_PROJECT, pipelineName);
  if (existingPipelines.length > 0) {
    console.log(`Pipeline ${pipelineName} already exists. Skipping creation.`);
    return;
  }

  console.log(`Creating pipeline ${pipelineName}`);
  await buildApi.createDefinition(
    {
      ...template,
      process: {
        ...template.process,
        yamlFilename: path.join(FIXTURES_PATH, pipelineName + ".yml"),
      } as unknown as any,
      name: pipelineName,
    },
    AZDO_PROJECT,
  );
}

const TRANSIENT_ERROR_CODES = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENETUNREACH"]);

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const isTransient = e instanceof Error && TRANSIENT_ERROR_CODES.has((e as NodeJS.ErrnoException).code ?? "");
      if (!isTransient || attempt === maxAttempts) {
        throw e;
      }
      const delayMs = attempt * 5000;
      console.warn(`Network error (${(e as NodeJS.ErrnoException).code}), retrying in ${delayMs / 1000}s (attempt ${attempt}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Unreachable");
}

export async function runPipeline(
  azdoApi: vm.WebApi,
  pipelineName: string,
  log: (...args: unknown[]) => void = console.log,
): Promise<Build> {
  const azdoBuildApi = await azdoApi.getBuildApi();
  const definitions = await withRetry(() => azdoBuildApi.getDefinitions(AZDO_PROJECT, pipelineName));
  if (definitions.length === 0) {
    throw new Error(`No pipeline found with name ${pipelineName}`);
  }

  const branch = getBranch();
  const definition = definitions[0];
  log(`Running pipeline on branch "${branch}"`);
  const build = await withRetry(() =>
    azdoBuildApi.queueBuild(
      {
        definition: { id: definition.id },
        project: definition.project,
        sourceBranch: branch,
      },
      AZDO_PROJECT,
    ),
  );
  const buildId = build.id as number;
  const projectId = build.project?.id as string;

  log(`Build ${buildId} queued`);
  let buildResult = await withRetry(() => azdoBuildApi.getBuild(projectId, buildId));
  while (buildResult.status !== BuildStatus.Completed) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    buildResult = await withRetry(() => azdoBuildApi.getBuild(projectId, buildId));
  }

  if (buildResult.result !== BuildResult.Succeeded) {
    throw new Error(`Pipeline failed`);
  }

  return buildResult;
}

export async function getItPipelineDefinitions(
  buildApi: IBuildApi,
): Promise<BuildDefinitionReference[]> {
  const definitions = await withRetry(() =>
    buildApi.getDefinitions(
      AZDO_PROJECT,
      undefined,
      undefined,
      undefined,
      DefinitionQueryOrder.LastModifiedAscending,
      DEFINITIONS_PAGINATION_LIMIT,
    ),
  );
  return definitions.filter((definition) => definition.name?.startsWith(AZDO_PIPELINE_NAME_PREFIX));
}

/**
 * Cancels every IT build that is queued or running. Only one QA run can be active at a time
 * (exclusive lock on the run_qa stage), so all active IT builds belong to the current run.
 */
export async function cancelActiveItBuilds(
  azdoApi: vm.WebApi,
  log: (...args: unknown[]) => void = console.log,
): Promise<void> {
  const buildApi = await azdoApi.getBuildApi();
  const definitionIds = (await getItPipelineDefinitions(buildApi)).map(
    (definition) => definition.id as number,
  );
  if (definitionIds.length === 0) {
    log("No IT pipeline found");
    return;
  }

  const activeBuilds = await withRetry(() =>
    buildApi.getBuilds(
      AZDO_PROJECT,
      definitionIds,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      BuildStatus.InProgress | BuildStatus.NotStarted,
    ),
  );
  log(`Found ${activeBuilds.length} active IT build(s)`);

  await Promise.all(
    activeBuilds.map((build) => {
      const buildId = build.id as number;
      log(`Cancelling build ${buildId} of ${build.definition?.name}`);
      return withRetry(() =>
        buildApi.updateBuild({ status: BuildStatus.Cancelling }, AZDO_PROJECT, buildId),
      );
    }),
  );
}
