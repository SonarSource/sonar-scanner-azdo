import fs from "fs";
import path from "path";
import { generateCombinations, serializeCombination } from "./combination";
import { generatePipelineFile } from "./pipeline";

const FIXTURES_PATH = path.join(__dirname, "fixtures");
const FILENAME_PREFIX = "pipeline";

export function generate() {
  // Remove all .yml files from fixtures
  const files = fs.readdirSync(FIXTURES_PATH);
  for (const file of files) {
    if (file.startsWith(FILENAME_PREFIX) && file.endsWith(".yml")) {
      fs.unlinkSync(path.join(FIXTURES_PATH, file));
    }
  }

  // Create new .yml files
  for (const combination of generateCombinations()) {
    const filename = `${FILENAME_PREFIX}-${serializeCombination(combination)}`;
    const pipeline = generatePipelineFile(combination);

    const pipelinePath = path.join(FIXTURES_PATH, `${filename}.yml`);
    console.log(`Writing ${pipelinePath}`);
    fs.writeFileSync(pipelinePath, pipeline);
  }
}

generate();
