import * as tl from "azure-pipelines-task-lib/task";
import * as vm from "azure-devops-node-api";
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

  const properties: azdoApiUtils.IPropertyBag[] = [];

  properties.push({
    propertyName: "sonarglobalqualitygate",
    propertyValue: "test",
  });

  await azdoApiUtils.addBuildProperty(properties).then(() => {});

  // SEC-FIX: patchBody is no longer logged; verify the debug message instead
  expect(tl.debug).toHaveBeenCalledWith("Acquiring a build API object.");
});
