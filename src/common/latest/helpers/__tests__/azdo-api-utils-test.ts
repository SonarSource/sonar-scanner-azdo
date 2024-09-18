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
  jest.spyOn(azdoApiUtils, "getAuthToken").mockImplementation(() => null);

  const webApi = new vm.WebApi("http://vsts.net", null);

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
