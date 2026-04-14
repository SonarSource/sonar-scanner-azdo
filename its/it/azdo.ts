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
  BuildResult,
  BuildStatus,
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
