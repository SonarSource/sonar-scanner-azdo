# AzDO Integration Tests

## How are integration tests run

The QA stage of the [Azure pipeline](../azure-pipelines.yml):

- Builds a test extension and installs it
- Runs each [test case](./it/cases.ts) and verifies the result on SonarQube Cloud

The Azure pipeline runs on master pushes and on the nightly build, not on pull requests.
Pushes landing on master while a run is in progress are batched into a single run of the latest commit.

To run the ITs for a pull request, run the pipeline manually in Azure DevOps on the pull request branch
(the branch must belong to this repository, not to a fork). The dogfood extension is only published from master.

Runs share the test extension and the SonarQube Cloud projects, so an "Exclusive Lock" check on the
`sonar-scanner-azdo-variables` variable group lets only one stage use it at a time, across all runs.
Every stage uses this variable group, so stages of different runs can interleave, but never run at the same time.
With `lockBehavior: sequential`, waiting stages proceed in queue order and are never cancelled.

## How to register a new pipeline to the QA

Modify the [test cases](./it/cases.ts) file

## How to add/remove test-cases

- Edit the combinations that are being tested in [the combination.ts file](./combination.ts), or modify the pipeline definition in [the pipeline.ts file](./pipeline.ts).
- Re-generate the pipelines with `npm run generate-its`.
- Create a pull request with your changes (your branch need to exist).
- **If you added a pipeline** file which you want to run in the QA, you need to:
  - Create a new pipeline on Azure DevOps from this GitHub repository and select the pipeline file.
  - Add a test-case for your new pipeline file in [cases.ts](./it/cases.ts)
- **If you removed a pipeline** which is currently run in the QA, you need to:
  - Delete the pipeline on Azure DevOps
  - Renmove the test-case on this pipeline from [cases.ts](./it/cases.ts)

## Test vs Real extension differences

- All tasks in the test extension are suffixed with `Test` (eg `SonarQubePrepareTest`) to avoid name-conflicts with the real/dogfood extension.
- The test extension id should be unique and therefore has its id suffixed with `-test`.
- The test extension task ids need to be valid v4-uuid and also different than the real/dogfood extension, so there first uuid part is set to only `0`s.
