import * as tl from "azure-pipelines-task-lib/task";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";
import { RequestInit } from "node-fetch";
import { URL } from "url";
import { getProxyFromURI } from "../helpers/proxyFromEnv";
import { PROP_NAMES } from "../helpers/utils";

export const REQUEST_TIMEOUT = 60000;

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
  constructor(
    public type: EndpointType,
    private readonly data: EndpointData,
  ) {}

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

  toFetchOptions(endpointUrl: string): Partial<RequestInit> {
    const options: Partial<RequestInit> = {
      method: "get",
      timeout: REQUEST_TIMEOUT,
    };

    // Add HTTP auth from this.auth
    options.headers = {
      Authorization:
        "Basic " + Buffer.from(`${this.auth.user}:${this.auth.pass ?? ""}`).toString("base64"),
    };

    // Fetch proxy from environment
    // We ignore proxy set by agent proxy configuration, we need to discuss whether we want to itroduce it
    // Currently users may pass environment variables (HTTP_PROXY,HTTPS_proxy etc.) to the task or agent to use proxy
    // as a workaround
    const proxyUrl = getProxyFromURI(new URL(endpointUrl))
      ? getProxyFromURI(new URL(endpointUrl))
      : undefined;
    if (proxyUrl) {
      tl.debug("Using proxy agent from environment: " + proxyUrl);
    } else {
      tl.debug("Not using a proxy agent");
    }

    // When proxy is used we use HttpsProxyAgent or HttpProxyAgent to handle it.
    if (proxyUrl) {
      const AgentClass = endpointUrl.startsWith("https://") ? HttpsProxyAgent : HttpProxyAgent;
      options.agent = new AgentClass({ proxy: proxyUrl });
    }

    return options;
  }

  public toJson() {
    return JSON.stringify({ type: this.type, data: this.data });
  }

  public toSonarProps() {
    return {
      [PROP_NAMES.HOST_URL]: this.data.url,
      [PROP_NAMES.LOGIN]: this.data.token || this.data.username,
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
