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

import { DefinitionQueryOrder } from "azure-devops-node-api/interfaces/BuildInterfaces";
import fs from "fs";
import path from "path";
import { AZDO_PIPELINE_NAME_PREFIX, AZDO_PROJECT, FIXTURES_PATH } from "./constant";
import { createPipeline, getAzdoApi, getTemplatePipeline } from "./it/azdo";

const CLEANUP_PAGINATION_LIMIT = 500;

async function main() {
  const azdoApi = getAzdoApi();
  const buildApi = await azdoApi.getBuildApi();

  // List all files in the fixtures directory
  const pipelineNames = fs
    .readdirSync(FIXTURES_PATH)
    .filter((file) => {
      return file.endsWith(".yml") && file.startsWith(AZDO_PIPELINE_NAME_PREFIX);
    })
    .map((filePath) => filePath.replace(".yml", ""));

  // We use an existing pipeline as a template to the new ones
  const template = await getTemplatePipeline(buildApi);
  console.log(`Using pipeline ${template.name} as a template`);

  // Create existing pipelines
  for (const pipelineName of pipelineNames) {
    await createPipeline(buildApi, template, pipelineName);
  }

  // Find all pipelines that match the name with pagination
  const pipelines = (
    await buildApi.getDefinitions(
      AZDO_PROJECT,
      undefined,
      undefined,
      undefined,
      DefinitionQueryOrder.LastModifiedAscending,
      CLEANUP_PAGINATION_LIMIT,
    )
  ).filter((pipeline) => pipeline.name?.startsWith(AZDO_PIPELINE_NAME_PREFIX));

  // Filter pipelines that do not have a matching file in the fixtures directory
  const obsoletePipelines = pipelines.filter((pipeline) => {
    return !fs.existsSync(path.join(FIXTURES_PATH, pipeline.name + ".yml"));
  });

  // Delete the pipelines
  for (const pipeline of obsoletePipelines) {
    console.log(`Deleting obsolete pipeline ${pipeline.name}`);
    await buildApi.deleteDefinition(AZDO_PROJECT, pipeline.id as number);
  }
}

main();
