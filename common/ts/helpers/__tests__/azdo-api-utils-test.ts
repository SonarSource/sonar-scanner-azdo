import * as tl from 'azure-pipelines-task-lib/task';
import * as request from 'request';
import * as azdoApiUtils from '../azdo-api-utils';
import * as servUtils from '../azdo-server-utils';

it('should build jsonpath body properly', () => {
  jest.spyOn(request, 'patch').mockImplementation(() => null);
  jest.spyOn(tl, 'debug').mockImplementation(() => null);
  jest.spyOn(servUtils, 'getAuthToken').mockImplementation(() => null);

  const jsonAsString = `[{\"op\":\"add\",\"path\":\"/sonarglobalqualitygate\",\"value\":\"test\"}]`;

  const properties: azdoApiUtils.IPropertyBag[] = [];

  properties.push({
    propertyName: 'sonarglobalqualitygate',
    propertyValue: 'test'
  });

  azdoApiUtils.addBuildProperty(properties).then(() => {});

  expect(tl.debug).toHaveBeenCalledWith(jsonAsString);
});
