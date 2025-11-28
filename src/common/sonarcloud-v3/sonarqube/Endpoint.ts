import { AxiosRequestConfig } from "axios";
import * as tl from "azure-pipelines-task-lib/task";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";
import * as semver from "semver";
import { PROP_NAMES } from "../helpers/constants";
import { log, LogLevel } from "../helpers/logging";
import { getProxyFromURI } from "../helpers/proxyFromEnv";

export enum EndpointType {
  Cloud = "SonarQube Cloud",
  Server = "SonarQube Server",
}

export interface EndpointData {
  url: string;
  token?: string;
  username?: string;
  password?: string;
  organization?: string;
}

export default class Endpoint {
  static readonly ENDPOINT_INPUT_NAME = "SonarQube";

  static readonly REQUEST_TIMEOUT: number = 60e3;

  public type: EndpointType;

  private readonly data: EndpointData;

  constructor(type: EndpointType, data: EndpointData) {
    this.type = type;
    this.data = data;
    // Remove trailing slash at the end of the base url, if any
    if (this.data) {
      this.data.url = this.data.url.replace(/\/$/, "");
    }
  }

  public get url() {
    return this.data.url;
  }

  public get auth(): { username: string; password: string } {
    if (
      !this.data.token &&
      this.data.username &&
      this.data.password &&
      this.data.password.length > 0
    ) {
      return { username: this.data.username, password: this.data.password };
    }
    return { username: this.data.token ?? this.data.username ?? "", password: "" };
  }

  toAxiosOptions(): AxiosRequestConfig {
    const options: AxiosRequestConfig = {
      timeout: Endpoint.REQUEST_TIMEOUT,
    };

    const isSonarCloud = Boolean(this.data.token);
    if (isSonarCloud) {
      options.headers = {
        Authorization: `Bearer ${this.data.token}`,
      };
    } else {
      options.auth = {
        username: this.auth.username,
        password: this.auth.password,
      };
    }

    // Fetch proxy from environment
    // We ignore proxy set by agent proxy configuration, we need to discuss whether we want to itroduce it
    // Currently users may pass environment variables (HTTP_PROXY,HTTPS_proxy etc.) to the task or agent to use proxy
    // as a workaround
    const proxyUrl = getProxyFromURI(new URL(this.url))
      ? getProxyFromURI(new URL(this.url))
      : undefined;

    // When proxy is used we use HttpsProxyAgent or HttpProxyAgent to handle it.
    if (proxyUrl) {
      log(LogLevel.DEBUG, "Using proxy agent from environment: " + proxyUrl);
      // We need to set proxy to false to avoid conflicts with agent proxy configuration
      options.proxy = false;
      const isHttps = this.url.startsWith("https://");
      if (isHttps) {
        options.httpsAgent = new HttpsProxyAgent({ proxy: proxyUrl });
      } else {
        options.httpAgent = new HttpProxyAgent({ proxy: proxyUrl });
      }
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
      [PROP_NAMES.PASSWORD]:
        this.data.password && this.data.password.length > 0 ? this.data.password : null,
      [PROP_NAMES.ORG]: this.data.organization,
    };
  }

  public static getEndpoint(id: string, type: EndpointType): Endpoint {
    const url = tl.getEndpointUrl(id, false) as string;
    const token = tl.getEndpointAuthorizationParameter(id, "apitoken", type !== EndpointType.Cloud);
    const username = tl.getEndpointAuthorizationParameter(id, "username", true);
    const password = tl.getEndpointAuthorizationParameter(id, "password", true);
    const organization = tl.getInput("organization", type === EndpointType.Cloud);
    return new Endpoint(type, { url, token, username, password, organization });
  }
}
