import * as tl from 'azure-pipelines-task-lib/task';
import * as request from 'request';
import { getAuthToken } from './azdo-server-utils';

const VARIABLE_GROUP_NAME = 'SonarCloud';

class VariableObject {
  isSecret?: boolean;
  value: string = '';
}

class ValueBase {
  variables: { [variableName: string]: VariableObject } = {};
  type: string = 'Vsts';
  name: string = VARIABLE_GROUP_NAME;
  description: 'SonarCloud internal variable group, dedicated to provide variables in releases tasks.';
}

class ValueFromCall extends ValueBase {
  createdBy?: EdBy;
  createdOn?: Date;
  modifiedBy?: EdBy;
  modifiedOn?: Date;
  isShared?: boolean;
  id: number;
}

interface EdBy {
  displayName: string;
  id: string;
  uniqueName: string;
}

export interface VariableGroup {
  count: number;
  value: ValueFromCall[];
}

export interface ProjectDetail {
  id: string;
  name: string;
  url: string;
  state: string;
  revision: number;
  visibility: string;
  lastUpdateTime: Date;
}

export function getVariableGroup(): Promise<VariableGroup> {
  return new Promise((resolve, reject) => {
    var collectionUri = tl.getVariable('System.TeamFoundationCollectionUri') + '/';
    var teamProjectId = tl.getVariable('System.TeamProjectId') + '/';

    var options = {
      url:
        collectionUri +
        teamProjectId +
        '_apis/distributedtask/variablegroups?groupName=SonarCloud&api-version=5.0-preview.1',
      auth: {
        bearer: getAuthToken()
      }
    };

    request.get(options, (error, response, body) => {
      if (error) {
        tl.error('Failed to get variable group, error was : ' + JSON.stringify(error));
        return reject();
      }
      tl.debug(`Response: ${response.statusCode} Body: "${JSON.stringify(body)}"`);

      let bodyAsObject: VariableGroup = JSON.parse(body);

      tl.debug('Count  :' + bodyAsObject.count);

      if (bodyAsObject.count > 0) {
        return resolve(bodyAsObject);
      } else {
        tl.debug('will return null ');
        return resolve(null);
      }
    });
  });
}

export function createVariableGroup(buildNumber: string, ceTaskId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    var collectionUri = tl.getVariable('System.TeamFoundationCollectionUri') + '/';
    var teamProjectId = tl.getVariable('System.TeamProjectId') + '/';

    var variableObject = new ValueBase();
    variableObject.variables[buildNumber] = new VariableObject();
    variableObject.variables[buildNumber].value = ceTaskId;

    var options = {
      url:
        collectionUri +
        teamProjectId +
        '_apis/distributedtask/variablegroups?api-version=5.0-preview.1',
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        bearer: getAuthToken()
      },
      body: JSON.stringify(variableObject)
    };

    request.post(options, (error, response, body) => {
      if (error) {
        tl.error('Failed to create variable group, error was : ' + JSON.stringify(error));
        return reject();
      }
      tl.debug(`Response: ${response.statusCode} Body: "${JSON.stringify(body)}"`);

      return resolve();
    });
  });
}

export function updateVariableGroup(
  variableGroup: VariableGroup,
  buildNumber: string,
  ceTaskId: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    var collectionUri = tl.getVariable('System.TeamFoundationCollectionUri') + '/';
    var teamProjectId = tl.getVariable('System.TeamProjectId') + '/';

    variableGroup.value[0].variables[buildNumber] = new VariableObject();
    variableGroup.value[0].variables[buildNumber].value = ceTaskId;

    var bodyToPost = new ValueBase();
    bodyToPost.variables = variableGroup.value[0].variables;

    var options = {
      url:
        collectionUri +
        teamProjectId +
        '_apis/distributedtask/variablegroups/' +
        variableGroup.value[0].id +
        '?api-version=5.0-preview.1',
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        bearer: getAuthToken()
      },
      body: JSON.stringify(bodyToPost)
    };

    request.put(options, (error, response, body) => {
      if (error) {
        tl.error('Failed to update variable group, error was : ' + JSON.stringify(error));
        return reject();
      }
      tl.debug(`Response: ${response.statusCode} Body: "${JSON.stringify(body)}"`);
      return resolve();
    });
  });
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

      let bodyAsObject: ProjectDetail = JSON.parse(body);

      return resolve(bodyAsObject);
    });
  });
}