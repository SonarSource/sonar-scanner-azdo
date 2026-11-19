# AzDO Integration Tests

## How are integration tests run

The QA stage of the [Azure pipeline](../azure-pipelines.yml):

- Builds a test extension and installs it
- Runs one test case per combination defined in [combination.ts](./combination.ts) and verifies the result on SonarQube Cloud

The Azure pipeline runs on master pushes and on the nightly build, not on pull requests.
Pushes landing on master while a run is in progress are batched into a single run of the latest commit.

To run the ITs for a pull request, run the pipeline manually in Azure DevOps on the pull request branch
(the branch must belong to this repository, not to a fork). The dogfood extension is only published from master.

Runs share the test extension and the SonarQube Cloud projects, so an "Exclusive Lock" check on the
`sonar-scanner-azdo-variables` variable group lets only one stage use it at a time, across all runs.
Every stage uses this variable group, so stages of different runs can interleave, but never run at the same time.
With `lockBehavior: sequential`, waiting stages proceed in queue order and are never cancelled.

## How to add/remove test-cases

Test cases are derived from the combinations: each combination produces one pipeline file and one test case,
so there is no separate list of test cases to maintain.

- Edit the combinations that are being tested in [the combination.ts file](./combination.ts), or modify the pipeline definition in [the pipeline.ts file](./pipeline.ts).
- Re-generate the pipelines with `npm run generate-its`.
- Push your branch, so the pipeline files exist on GitHub.
- Synchronize the pipelines on Azure DevOps with `npm run install-its` (requires the `AZURE_TOKEN` and `SONARCLOUD_TOKEN` environment variables),
  or run the **Install QA pipelines** release in Azure DevOps. This creates the missing pipelines and deletes the ones that no longer have a pipeline file.
- Create a pull request with your changes.

The QA fails for new combinations until their pipelines exist on Azure DevOps.

SonarQube Server is not supported in the E2E tests.
Only SonarQube Cloud combinations are tested for the time being.

## Test vs Real extension differences

- All tasks in the test extension are suffixed with `Test` (eg `SonarQubePrepareTest`) to avoid name-conflicts with the real/dogfood extension.
- The test extension id should be unique and therefore has its id suffixed with `-test`.
- The test extension task ids need to be valid v4-uuid and also different than the real/dogfood extension, so there first uuid part is set to only `0`s.
