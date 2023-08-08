import * as tl from "azure-pipelines-task-lib/task";
import * as semver from "semver";
import { PROP_NAMES } from "../helpers/utils";

export enum EndpointType {
  SonarCloud = "SonarCloud",
  SonarQube = "SonarQube",
}

export interface EndpointData {
  url: string;
  token?: string;
  username?: string;
  password?: string;
  organization?: string;
}

export default class Endpoint {
  constructor(public type: EndpointType, private readonly data: EndpointData) {}

  public get auth() {
    if (!this.data.token && this.data.password && this.data.password.length > 0) {
      return { user: this.data.username, pass: this.data.password };
    }
    return { user: this.data.token || this.data.username };
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

  public toSonarProps(serverVersion: semver.SemVer | string) {
    const authKey = semver.satisfies(serverVersion, "<10.0.0")
      ? PROP_NAMES.LOGIN
      : PROP_NAMES.TOKEN;

    return {
      [PROP_NAMES.HOST_URL]: this.data.url,
      [authKey]: this.data.token || this.data.username,
      [PROP_NAMES.PASSSWORD]:
        this.data.password && this.data.password.length > 0 ? this.data.password : null,
      [PROP_NAMES.ORG]: this.data.organization,
    };
  }

  public static getEndpoint(id: string, type: EndpointType): Endpoint {
    const url = tl.getEndpointUrl(id, false);
    const token = tl.getEndpointAuthorizationParameter(
      id,
      "apitoken",
      type !== EndpointType.SonarCloud
    );
    const username = tl.getEndpointAuthorizationParameter(id, "username", true);
    const password = tl.getEndpointAuthorizationParameter(id, "password", true);
    const organization = tl.getInput("organization", type === EndpointType.SonarCloud);
    return new Endpoint(type, { url, token, username, password, organization });
  }
}
