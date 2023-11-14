import * as tl from "azure-pipelines-task-lib/task";
import { RequestInit } from "node-fetch";
import proxyAgent from "proxy-agent";
import { getProxyForUrl } from "proxy-from-env";
import * as semver from "semver";
import { PROP_NAMES } from "../helpers/constants";

const REQUEST_TIMEOUT = 60000;

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
  public type: EndpointType;

  private readonly data: EndpointData;

  constructor(type: EndpointType, data: EndpointData) {
    this.type = type;
    this.data = data;
    // Remove trailing slash at the end of the base url, if any
    if (this.data) {
      this.data.url = this.data?.url.replace(/\/$/, "");
    }
  }

  public get url() {
    return this.data.url;
  }

  public get auth(): { username: string; password: string } {
    // If using user/password
    if (!this.data.token && this.data.password && this.data.password.length > 0) {
      return { username: this.data.username, password: this.data.password };
    }
    // Using token
    return { username: this.data.token || this.data.username, password: "" };
  }

  toFetchOptions(url: string): Partial<RequestInit> {
    const options: Partial<RequestInit> = {
      method: "get",
      timeout: REQUEST_TIMEOUT,
    };

    // Add HTTP auth from this.auth
    options.headers = {
      Authorization: `Basic ${Buffer.from(`${this.auth.username}:${this.auth.password}`).toString(
        "base64",
      )}`,
    };

    // Add proxy configuration, when relevant
    const envProxyUrl = getProxyForUrl(url);
    const azureProxyUrl = tl.getHttpProxyConfiguration()?.proxyFormattedUrl;
    if (envProxyUrl) {
      options.agent = proxyAgent(envProxyUrl);
      tl.debug("Using proxy agent from environment: " + JSON.stringify(options.agent));
    } else if (azureProxyUrl) {
      options.agent = proxyAgent(azureProxyUrl);
      tl.debug("Using proxy agent from Azure: " + JSON.stringify(options.agent));
    } else {
      tl.debug("Not using a proxy agent");
    }

    return options;
  }

  public toJson() {
    return JSON.stringify({ type: this.type, data: this.data });
  }

  public toSonarProps(serverVersion: semver.SemVer | string) {
    const isSonarCloud = Boolean(this.data.token);
    const authKey =
      !isSonarCloud && semver.satisfies(serverVersion, "<10.0.0")
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
      type !== EndpointType.SonarCloud,
    );
    const username = tl.getEndpointAuthorizationParameter(id, "username", true);
    const password = tl.getEndpointAuthorizationParameter(id, "password", true);
    const organization = tl.getInput("organization", type === EndpointType.SonarCloud);
    return new Endpoint(type, { url, token, username, password, organization });
  }
}
