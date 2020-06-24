import { SemVer } from "semver";
import FeatureEnabler, { Features } from "../FeatureEnabler";
import { EndpointType } from "../Endpoint";

it("should enable FEATURE_BRANCHES_AND_PULLREQUEST, FEATURE_NEW_REPORT_TASK_LOCATION", () => {
  const featureEnabler = new FeatureEnabler(new SemVer("7.2.0"), EndpointType.SonarCloud);
  expect(featureEnabler.isEnabled(Features.FEATURE_BRANCHES_AND_PULLREQUEST)).toEqual(true);
  expect(featureEnabler.isEnabled(Features.FEATURE_NEW_REPORT_TASK_LOCATION)).toEqual(true);
});

it("should enable no features", () => {
  const featureEnabler = new FeatureEnabler(new SemVer("6.0.0"), EndpointType.SonarQube);
  expect(featureEnabler.isEnabled(Features.FEATURE_BRANCHES_AND_PULLREQUEST)).toEqual(false);
  expect(featureEnabler.isEnabled(Features.FEATURE_NEW_REPORT_TASK_LOCATION)).toEqual(false);
  expect(
    featureEnabler.isEnabled(Features.FEATURE_PULL_REQUEST_PROVIDER_PROPERTY_DEPRECATED)
  ).toEqual(false);
});

it("should enable FEATURE_PULL_REQUEST_PROVIDER_PROPERTY_DEPRECATED", () => {
  const featureEnabler = new FeatureEnabler(new SemVer("8.1.1"), EndpointType.SonarQube);
  expect(
    featureEnabler.isEnabled(Features.FEATURE_PULL_REQUEST_PROVIDER_PROPERTY_DEPRECATED)
  ).toEqual(true);
});
