import * as tl from "azure-pipelines-task-lib/task";
import { RequestInit } from "node-fetch";
import url from "url";
import { maskUrlCredentials } from "../helpers/log-masker";
import { HttpProxyAgent, HttpsProxyAgent } from "../helpers/proxy-agent";
import { getProxyFromURI } from "../helpers/proxyFromEnv";
import { PROP_NAMES } from "../helpers/utils";

export const REQUEST_TIMEOUT = 60000;

export enum EndpointType {
  CodeScanCloud = "CodeScanCloud",
  SonarQube = "SonarQube",
  SonarCloud = "SonarCloud",
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
  ) {
    // Remove trailing slash at the end of the base url, if any
    if (this.data) {
      this.data.url = this.data?.url.replace(/\/$/, "");
    }
    // SEC-007: Enforce HTTPS for server communication
    if (this.data?.url && !this.data.url.startsWith("https://")) {
      const allowInsecure = tl.getBoolInput("allowInsecureConnection", false) || false;
      if (!allowInsecure) {
        throw new Error(
          `[SQ] HTTPS is required for server URL. Got: ${maskUrlCredentials(this.data.url)}. ` +
          `Set 'allowInsecureConnection' to true to allow HTTP for local development.`
        );
      }
    }
  }

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
    const proxyUrl = getProxyFromURI(url.parse(endpointUrl))
      ? getProxyFromURI(url.parse(endpointUrl))
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

  // SEC-009: Redacted version for debug logging
  public toRedactedJson() {
    const redacted = { ...this.data };
    if (redacted.token) redacted.token = "[REDACTED]";
    if (redacted.username) redacted.username = "[REDACTED]";
    if (redacted.password) redacted.password = "[REDACTED]";
    return JSON.stringify({ type: this.type, data: redacted });
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
      type !== EndpointType.CodeScanCloud,
    );

    // SEC-009: Request only minimum authorization parameters per endpoint type
    // CodeScanCloud only needs apitoken; SonarQube/SonarCloud may also use username/password
    let username: string | undefined;
    let password: string | undefined;
    if (type !== EndpointType.CodeScanCloud) {
      username = tl.getEndpointAuthorizationParameter(id, "username", true);
      password = tl.getEndpointAuthorizationParameter(id, "password", true);
    }

    const organization = tl.getInput("organization", type === EndpointType.CodeScanCloud);
    return new Endpoint(type, { url, token, username, password, organization });
  }
}
