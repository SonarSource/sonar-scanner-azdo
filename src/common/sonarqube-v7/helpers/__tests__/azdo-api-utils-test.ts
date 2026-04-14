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
import { Operation } from "azure-devops-node-api/interfaces/common/VSSInterfaces";
import { AzureTaskLibMock } from "../../mocks/AzureTaskLibMock";
import * as azdoApiUtils from "../azdo-api-utils";
import { log, LogLevel } from "../logging";

jest.mock("../logging");

const azureTaskLibMock = new AzureTaskLibMock();

beforeEach(() => {
  jest.restoreAllMocks();
  azureTaskLibMock.reset();
});

it("should build jsonpath body properly", async () => {
  azureTaskLibMock.setVariables({
    "System.TeamFoundationCollectionUri": "https://collection-uri.com",
    "System.TeamProjectId": "1234",
    "Build.BuildId": "4567",
  });
  jest.spyOn(azdoApiUtils, "getAuthToken").mockReturnValue("the-token");

  const webApi = new vm.WebApi("http://vsts.net", vm.getBearerHandler("the-token"));

  jest.spyOn(azdoApiUtils, "getWebApi").mockImplementation(() => webApi);

  const jsonAsString = `[{"op":${Operation.Add},"path":"/sonarglobalqualitygate","value":"test"}]`;

  const properties: azdoApiUtils.IPropertyBag[] = [];

  properties.push({
    propertyName: "sonarglobalqualitygate",
    propertyValue: "test",
  });

  await azdoApiUtils.addBuildProperty(properties).then(() => {});

  expect(log).toHaveBeenCalledWith(LogLevel.DEBUG, `Adding build property: ${jsonAsString}`);
});

it("should parse extra properties correctly", () => {
  azureTaskLibMock.setInputs({
    extraProperties: `# Additional properties that will be passed to the scanner, 
# Put one key=value per line, example:
# sonar.exclusions=**/*.bin
sonar.scanner.metadataFilePath=/tmp/report-task-debug.txt
sonar.scanner.metadataFilePath=C:\\tmp\\report/task/debug-override.txt`,
  });
  const props = azdoApiUtils.parseScannerExtraProperties();

  // SONARAZDO-417 We don't treat "\" as an escape character to support pipeline predefined variables
  // eg sonar.cs.vstest.reportsPaths="$(Build.SourcesDirectory)\file.txt"
  expect(props["sonar.scanner.metadataFilePath"]).toBe("C:\\tmp\\report/task/debug-override.txt");
});
