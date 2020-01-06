import * as semver from 'semver';
import { EndpointType } from './Endpoint';

export enum Features {
  FEATURE_BRANCHES_AND_PULLREQUEST = 'sonar.branchesandpullrequest',
  FEATURE_NEW_REPORT_TASK_LOCATION = 'sonar.newreporttasklocation',
  FEATURE_PULL_REQUEST_PROVIDER_PROPERTY_DEPRECATED = 'sonar.pullrequestprovider.deprecated'
}

const featureToggleMap = new Map();

let version: semver.SemVer;
let endpoint: EndpointType;

export default class FeatureEnabler {
  constructor(serverVersion: semver.SemVer, endpointType: EndpointType) {
    version = serverVersion;
    endpoint = endpointType;

    featureToggleMap.set(Features.FEATURE_BRANCHES_AND_PULLREQUEST, false);
    featureToggleMap.set(Features.FEATURE_NEW_REPORT_TASK_LOCATION, false);
    featureToggleMap.set(Features.FEATURE_PULL_REQUEST_PROVIDER_PROPERTY_DEPRECATED, false);

    this.enableBranchesAndPullRequest();
    this.enableNewReportTaskLocation();
    this.enablePullRequestProviderDeprecatedProperty();
  }

  private enableBranchesAndPullRequest() {
    if (endpoint === EndpointType.SonarCloud || version >= semver.parse('7.2.0')) {
      featureToggleMap.set(Features.FEATURE_BRANCHES_AND_PULLREQUEST, true);
    }
  }

  private enableNewReportTaskLocation() {
    if (endpoint === EndpointType.SonarCloud || version >= semver.parse('7.2.0')) {
      featureToggleMap.set(Features.FEATURE_NEW_REPORT_TASK_LOCATION, true);
    }
  }

  private enablePullRequestProviderDeprecatedProperty() {
    if (endpoint === EndpointType.SonarQube && version >= semver.parse('8.0.0')) {
      featureToggleMap.set(Features.FEATURE_PULL_REQUEST_PROVIDER_PROPERTY_DEPRECATED, true);
    }
  }

  public isEnabled(feature: string) {
    return featureToggleMap.get(feature) === true;
  }
}
