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
