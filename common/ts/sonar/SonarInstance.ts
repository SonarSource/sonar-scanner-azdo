import Endpoint from "./Endpoint";
import * as semver from "semver";
import * as internalRequest from "../helpers/request";

export default class SonarInstance {
  public semver.SemVer serverVersion;

  constructor(private readonly endpoint: Endpoint) {}

  public init() {
    await getServerVersion();
  }

  private getServerVersion(): Promise<semver.SemVer> {
    return internalRequest.callGet(this.endpoint, "/api/server/version", false).then(semver.coerce);
  }
}
