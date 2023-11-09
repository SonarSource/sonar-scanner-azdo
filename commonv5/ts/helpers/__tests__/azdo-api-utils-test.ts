import * as vm from "azure-devops-node-api";
import { Operation } from "azure-devops-node-api/interfaces/common/VSSInterfaces";
import * as tl from "azure-pipelines-task-lib/task";
import * as azdoApiUtils from "../azdo-api-utils";

it("should build jsonpath body properly", async () => {
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("https://collection-uri.com"); //System.TeamFoundationCollectionUri
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("1234"); //System.TeamProjectId
  jest.spyOn(tl, "getVariable").mockReturnValueOnce("4567"); //Build.BuildId
  jest.spyOn(tl, "getEndpointAuthorization").mockReturnValue({ scheme: "oauth", parameters: {} });
  jest.spyOn(azdoApiUtils, "getAuthToken").mockImplementation(() => null);

  const webApi = new vm.WebApi("http://vsts.net", null);

  jest.spyOn(azdoApiUtils, "getWebApi").mockImplementation(() => webApi);
  jest.spyOn(tl, "debug").mockImplementation(() => null);

  const jsonAsString = `[{\"op\":${Operation.Add},\"path\":\"/sonarglobalqualitygate\",\"value\":\"test\"}]`;

  const properties: azdoApiUtils.IPropertyBag[] = [];

  properties.push({
    propertyName: "sonarglobalqualitygate",
    propertyValue: "test",
  });

  await azdoApiUtils.addBuildProperty(properties).then(() => {});

  expect(tl.debug).toHaveBeenCalledWith(jsonAsString);
});

it("should parse extra properties correctly", () => {
  jest.spyOn(tl, "getDelimitedInput").mockReturnValueOnce(
    `# Additional properties that will be passed to the scanner, 
# Put one key=value per line, example:
# sonar.exclusions=**/*.bin
sonar.scanner.metadataFilePath=/tmp/report-task-debug.txt
sonar.scanner.metadataFilePath=/tmp/report-task-debug-override.txt`.split("\n"),
  ); //extraProperties
  const props = azdoApiUtils.parseScannerExtraProperties();

  expect(props["sonar.scanner.metadataFilePath"]).toBe("/tmp/report-task-debug-override.txt");
});
