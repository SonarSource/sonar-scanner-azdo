import * as tl from 'azure-pipelines-task-lib/task';
import * as request from 'request';
import { getAuthToken } from './azdo-server-utils';

export interface IPropertyBag {
  propertyName: string;
  propertyValue: string;
}

interface IJsonPatchBody {
  op: string;
  path: string;
  value: string;
}

export function addBuildProperty(properties: IPropertyBag[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const collectionUri = tl.getVariable('System.TeamFoundationCollectionUri') + '/';
    const teamProjectId = tl.getVariable('System.TeamProjectId') + '/';
    const buildId = tl.getVariable('Build.BuildId');

    const patchBody: IJsonPatchBody[] = [];

    properties.forEach((property: IPropertyBag) => {
      patchBody.push({
        op: 'add',
        path: `/${property.propertyName}`,
        value: `${property.propertyValue}`
      });
    });

    tl.debug(JSON.stringify(patchBody));

    const options = {
      url:
        collectionUri +
        teamProjectId +
        `_apis/build/builds/${buildId}/properties?api-version=5.0-preview.1`,
      headers: {
        'Content-Type': 'application/json-patch+json'
      },
      auth: {
        bearer: getAuthToken()
      },
      body: JSON.stringify(patchBody)
    };

    request.patch(options, (error, response, body) => {
      if (error) {
        tl.error('Failed to update build properties, error was : ' + JSON.stringify(error));
        return reject();
      }
      tl.debug(`Response: ${response.statusCode} Body: "${JSON.stringify(body)}"`);
      return resolve();
    });
  });
}
