import * as tl from "azure-pipelines-task-lib/task";
import { Operation } from "azure-devops-node-api/interfaces/common/VSSInterfaces";
import * as vm from "azure-devops-node-api";
import * as azdoApiUtils from "../azdo-api-utils";

it("should build jsonpath body properly", () => {
  jest.spyOn(tl, "getEndpointAuthorization").mockImplementation(() => null);
  jest.spyOn(azdoApiUtils, "getAuthToken").mockImplementation(() => null);

  const webApi = new vm.WebApi("http://vsts.net", null);

  jest.spyOn(tl, "debug").mockImplementation(() => null);
  jest.spyOn(azdoApiUtils, "getWebApi").mockImplementation(() => webApi);

  const jsonAsString = `[{\"op\":${Operation.Add},\"path\":\"/sonarglobalqualitygate\",\"value\":\"test\"}]`;

  const properties: azdoApiUtils.IPropertyBag[] = [];

  properties.push({
    propertyName: "sonarglobalqualitygate",
    propertyValue: "test",
  });

<<<<<<< HEAD
  azdoApiUtils.addBuildProperty(properties).then(() => {
    return;
  });
=======
  azdoApiUtils.addBuildProperty(properties).then(() => {});
>>>>>>> parent of 904da3a (Changed double quotes to single.)

  expect(tl.debug).toHaveBeenCalledWith(jsonAsString);
});
