/* eslint-disable import/newline-after-import */
import * as tl from 'vsts-task-lib/task';
import * as request from 'request';
import { PROP_NAMES } from './utils';

export enum EndpointType {
  SonarCloud = 'SonarCloud',
  SonarQube = 'SonarQube'
}

export interface EndpointData {
  url: string;
  token?: string;
  username?: string;
  password?: string;
  organization?: string;
}

export interface RequestData {
  [x: string]: any;
}

export default class Endpoint {
  constructor(public type: EndpointType, public data: EndpointData) {}

  public toJson() {
    return JSON.stringify({ type: this.type, data: this.data });
  }

  public toSonarProps() {
    return {
      [PROP_NAMES.HOST_URL]: this.data.url,
      [PROP_NAMES.LOGIN]: this.data.token || this.data.username,
      [PROP_NAMES.PASSSWORD]: this.data.password,
      [PROP_NAMES.ORG]: this.data.organization
    };
  }

  public apiGetJSON(path: string, query?: RequestData): Promise<any> {
    tl.debug(`[SQ] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    return new Promise((resolve, reject) => {
      const options: request.CoreOptions = {};
      if (this.data.token) {
        options.auth = { user: this.data.token };
      } else {
        options.auth = { user: this.data.username, pass: this.data.password };
      }
      if (query) {
        options.qs = query;
        options.useQuerystring = true;
      }
      request.get(
        {
          method: 'GET',
          baseUrl: this.data.url,
          uri: path,
          json: true,
          ...options
        },
        (error, response, body) => {
          if (error) {
            return reject(`[SQ] API GET '${path}' failed, error was: ${error}`);
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            return reject(
              new Error(`[SQ] API GET '${path}' failed, status code was: ${response.statusCode}`)
            );
          }

          return resolve(body || {});
        }
      );
    });
  }

  public static getEndpoint(id: string, type: EndpointType): Endpoint {
    const url = tl.getEndpointUrl(id, false);
    const token = tl.getEndpointAuthorizationParameter(
      id,
      'apitoken',
      type === EndpointType.SonarQube
    );
    const username = tl.getEndpointAuthorizationParameter(id, 'username', true);
    const password = tl.getEndpointAuthorizationParameter(id, 'password', true);
    const organization = tl.getInput('organization', true);
    return new Endpoint(type, { url, token, username, password, organization });
  }
}
