import * as tl from 'azure-pipelines-task-lib/task';
import * as request from 'request';
import { getAuthToken } from './azdo-server-utils';

export interface ProjectDetail {
  id: string;
  name: string;
  url: string;
  state: string;
  revision: number;
  visibility: string;
  lastUpdateTime: Date;
}

export function getProjectDetails(): Promise<ProjectDetail> {
  return new Promise((resolve, reject) => {
    var collectionUri = tl.getVariable('System.TeamFoundationCollectionUri') + '/';
    var teamProjectId = tl.getVariable('System.TeamProject');

    tl.debug('Retrieving project details..');

    var options = {
      url: collectionUri + '_apis/projects/' + teamProjectId + '?api-version=5.0',
      auth: {
        bearer: getAuthToken()
      },
    };

    request.get(options, (error, response, body) => {
      if (error) {
        tl.error('Failed to update variable group, error was : ' + JSON.stringify(error));
        return reject();
      }
      tl.debug(`Response: ${response.statusCode} Body: "${JSON.stringify(body)}"`);

      let projectDetail: ProjectDetail = JSON.parse(body);

      return resolve(projectDetail);
    });
  });
}
