import http, { ClientRequest, IncomingMessage } from "http";
import https from "https";
import url from "url";
import { HttpProxyAgent, HttpsProxyAgent } from "../proxy-agent";

const socket = {
  removeAllListeners: jest.fn(),
  destroy: jest.fn(),
};

const partialRequest = {
  removeAllListeners: jest.fn(),
  destroy: jest.fn(),
  end: jest.fn(),
};

const successRequest = jest.fn(() => {
  return {
    once: jest.fn((_: string, cb: (response: IncomingMessage, socket: any) => void) => {
      cb({ statusCode: 200 } as IncomingMessage, socket);
    }),
    ...partialRequest,
  } as unknown as ClientRequest;
});

const failureRequest = () => {
  return {
    once: jest.fn((_: string, cb: (response: IncomingMessage, socket: any) => void) => {
      cb({ statusCode: 400 } as IncomingMessage, socket);
    }),
    ...partialRequest,
  } as unknown as ClientRequest;
};

const getProxy = (protocol: "http" | "https" = "http", auth?: string) =>
  `${protocol}://${auth ? auth + "@" : ""}localhost:3434`;
const connectionOptions = {
  host: "111.111.111.111",
  port: 8080,
};

describe("http request", () => {
  it("uses http proxy", () => {
    jest.spyOn(http, "request").mockImplementation(successRequest);
    const cb = jest.fn();
    const agent = new HttpProxyAgent({
      proxy: getProxy(),
    });
    agent.createConnection(connectionOptions, cb);

    // Success cb
    expect(cb).toHaveBeenNthCalledWith(1, null, socket);
    expect(successRequest).toHaveBeenCalledWith({
      headers: {
        connection: "close",
        host: `${connectionOptions.host}:${connectionOptions.port}`,
      },
      host: "localhost",
      method: "CONNECT",
      path: "111.111.111.111:8080",
      port: "3434",
      setHost: false,
      agent: false,
      timeout: 0,
    });
  });

  it("uses https proxy", () => {
    jest.spyOn(https, "request").mockImplementation(successRequest);
    const cb = jest.fn();

    const agent = new HttpProxyAgent({
      proxy: url.parse(getProxy("https", "user:pass")),
    });
    agent.keepAlive = true;
    agent.createConnection(connectionOptions, cb);

    // Success cb
    expect(cb).toHaveBeenNthCalledWith(1, null, socket);
    expect(successRequest).toHaveBeenCalledWith({
      headers: {
        connection: "keep-alive",
        host: `${connectionOptions.host}:${connectionOptions.port}`,
        "proxy-authorization": "Basic dXNlcjpwYXNz",
      },
      host: "localhost",
      method: "CONNECT",
      path: "111.111.111.111:8080",
      port: "3434",
      servername: "localhost",
      setHost: false,
      agent: false,
      timeout: 0,
    });
  });

  it("handles request failure", () => {
    jest.spyOn(http, "request").mockImplementation(failureRequest);
    const cb = jest.fn();
    const agent = new HttpProxyAgent({
      proxy: getProxy(),
    });
    agent.createConnection(connectionOptions, cb);

    expect(cb).toHaveBeenNthCalledWith(1, new Error(`Bad response: 400`), null);
  });
});

describe("https request", () => {
  //@ts-ignore
  https.Agent.prototype.createConnection = jest.fn(() => socket);

  it("uses http proxy", () => {
    jest.spyOn(http, "request").mockImplementation(successRequest);
    const cb = jest.fn();
    const agent = new HttpsProxyAgent({
      proxy: getProxy(),
    });
    agent.createConnection(connectionOptions, cb);

    // Success cb
    expect(cb).toHaveBeenNthCalledWith(1, null, socket);
    expect(successRequest).toHaveBeenCalledWith({
      headers: {
        connection: "close",
        host: `${connectionOptions.host}:${connectionOptions.port}`,
      },
      host: "localhost",
      method: "CONNECT",
      path: "111.111.111.111:8080",
      port: "3434",
      setHost: false,
      agent: false,
      timeout: 0,
    });
  });

  it("uses https proxy", () => {
    jest.spyOn(https, "request").mockImplementation(successRequest);
    const cb = jest.fn();

    const agent = new HttpsProxyAgent({
      proxy: url.parse(getProxy("https", "user:pass")),
    });
    agent.keepAlive = true;
    agent.createConnection(connectionOptions, cb);

    // Success cb
    expect(cb).toHaveBeenNthCalledWith(1, null, socket);
    expect(successRequest).toHaveBeenCalledWith({
      headers: {
        connection: "keep-alive",
        host: `${connectionOptions.host}:${connectionOptions.port}`,
        "proxy-authorization": "Basic dXNlcjpwYXNz",
      },
      host: "localhost",
      method: "CONNECT",
      path: "111.111.111.111:8080",
      port: "3434",
      servername: "localhost",
      setHost: false,
      agent: false,
      timeout: 0,
    });
  });

  it("handles request failure", () => {
    jest.spyOn(http, "request").mockImplementation(failureRequest);
    const cb = jest.fn();
    const agent = new HttpsProxyAgent({
      proxy: getProxy(),
    });
    agent.createConnection(connectionOptions, cb);

    expect(cb).toHaveBeenNthCalledWith(1, new Error(`Bad response: 400`), null);
  });
});
