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
