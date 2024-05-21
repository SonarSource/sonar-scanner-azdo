import http from "http";
import https from "https";
import url, { UrlWithStringQuery } from "url";
import { Status } from "./constants";

interface HttpProxyAgentOptions extends http.AgentOptions {
  proxy: string | UrlWithStringQuery;
  proxyRequestOptions?: ProxyAgentRequestOptions;
}

interface HttpsProxyAgentOptions extends https.AgentOptions {
  proxy: string | UrlWithStringQuery;
  proxyRequestOptions?: ProxyAgentRequestOptions;
}

interface ProxyAgentRequestOptions {
  ca?: string[];
  headers?: http.OutgoingHttpHeaders;
  rejectUnauthorized?: boolean;
}

// Ideally, we would use hpagent but we can not because it is not compatible with Node 6.
// We are keeping a local copy of the classes we need (HttpProxyAgent and HttpsProxyAgent), which we adapted to make them Node 6-compatible.
export class HttpProxyAgent extends http.Agent {
  proxy: UrlWithStringQuery;
  keepAlive?: boolean;
  proxyRequestOptions?: ProxyAgentRequestOptions;

  constructor(options: HttpProxyAgentOptions) {
    super(getAgentOptions(options));
    this.proxy = typeof options.proxy === "string" ? url.parse(options.proxy) : options.proxy;
    this.proxyRequestOptions = options.proxyRequestOptions || {};
  }

  createConnection(options: http.RequestOptions, callback) {
    const requestOptions: https.RequestOptions = Object.assign({}, this.proxyRequestOptions, {
      method: "CONNECT",
      host: this.proxy.hostname,
      port: this.proxy.port,
      path: `${options.host}:${options.port}`,
      setHost: false,
      agent: false,
      timeout: options.timeout || 0,
      headers: Object.assign({}, this.proxyRequestOptions.headers, {
        connection: this.keepAlive ? "keep-alive" : "close",
        host: `${options.host}:${options.port}`,
      }),
    });

    if (this.proxy.auth) {
      const base64 = Buffer.from(
        `${decodeURIComponent(this.proxy.auth.split(":")[0] || "")}:${decodeURIComponent(
          this.proxy.auth.split(":")[1] || "",
        )}`,
      ).toString("base64");
      requestOptions.headers["proxy-authorization"] = `Basic ${base64}`;
    }

    if (this.proxy.protocol === "https:") {
      requestOptions.servername = this.proxy.hostname;
    }

    const request = (this.proxy.protocol === "http:" ? http : https).request(requestOptions);
    request.once("connect", (response, socket) => {
      request.removeAllListeners();
      socket.removeAllListeners();
      if (response.statusCode === Status.OK) {
        callback(null, socket);
      } else {
        socket.destroy();
        callback(new Error(`Bad response: ${response.statusCode}`), null);
      }
    });

    request.once("timeout", () => {
      request.destroy(new Error("Proxy timeout"));
    });

    request.once("error", (err) => {
      request.removeAllListeners();
      callback(err, null);
    });

    request.end();
  }
}

export class HttpsProxyAgent extends https.Agent {
  proxy: UrlWithStringQuery;
  keepAlive?: boolean;
  proxyRequestOptions?: ProxyAgentRequestOptions;

  constructor(options: HttpsProxyAgentOptions) {
    super(getAgentOptions<HttpsProxyAgentOptions>(options));
    this.proxy = typeof options.proxy === "string" ? url.parse(options.proxy) : options.proxy;
    this.proxyRequestOptions = options.proxyRequestOptions || {};
  }

  createConnection(options: https.RequestOptions, callback) {
    const requestOptions: https.RequestOptions = Object.assign({}, this.proxyRequestOptions, {
      method: "CONNECT",
      host: this.proxy.hostname,
      port: this.proxy.port,
      path: `${options.host}:${options.port}`,
      setHost: false,
      agent: false,
      timeout: options.timeout || 0,
      headers: Object.assign({}, this.proxyRequestOptions.headers, {
        connection: this.keepAlive ? "keep-alive" : "close",
        host: `${options.host}:${options.port}`,
      }),
    });

    if (this.proxy.auth) {
      const base64 = Buffer.from(
        `${decodeURIComponent(this.proxy.auth.split(":")[0] || "")}:${decodeURIComponent(
          this.proxy.auth.split(":")[1] || "",
        )}`,
      ).toString("base64");
      requestOptions.headers["proxy-authorization"] = `Basic ${base64}`;
    }

    // Necessary for the TLS check with the proxy to succeed.
    if (this.proxy.protocol === "https:") {
      requestOptions.servername = this.proxy.hostname;
    }

    const request = (this.proxy.protocol === "http:" ? http : https).request(requestOptions);

    request.once("connect", (response, socket) => {
      request.removeAllListeners();
      socket.removeAllListeners();
      if (response.statusCode === Status.OK) {
        //@ts-ignore
        const secureSocket = super.createConnection(Object.assign({ socket }, options));
        callback(null, secureSocket);
      } else {
        socket.destroy();
        callback(new Error(`Bad response: ${response.statusCode}`), null);
      }
    });

    request.once("timeout", () => {
      request.destroy(new Error("Proxy timeout"));
    });

    request.once("error", (err) => {
      request.removeAllListeners();
      callback(err, null);
    });

    request.end();
  }
}

type AgentOptions<T> = T extends HttpProxyAgentOptions ? http.AgentOptions : https.AgentOptions;
function getAgentOptions<T extends HttpProxyAgentOptions>(options: T): AgentOptions<T> {
  return Object.keys(options).reduce((acc, key) => {
    if (key !== "proxy" && key !== "proxyRequestOptions") {
      acc[key] = options[key];
    }
    return acc;
  }, {});
}
