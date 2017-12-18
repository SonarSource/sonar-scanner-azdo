/* eslint-disable import/newline-after-import */
import * as tl from 'vsts-task-lib/task';
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

export default class Endpoint {
  constructor(public type: EndpointType, private data: EndpointData) {}

  public get auth() {
    if (this.data.token) {
      return { user: this.data.token };
    }
    return { user: this.data.username, pass: this.data.password };
  }

  public get organization() {
    return this.data.organization;
  }

  public get url() {
    return this.data.url;
  }

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
