# AzDO Integration Tests

## How are integration tests run

The QA stage of the [Azure pipeline](../azure-pipelines.yml):

- Builds a test extension and installs it
- Runs each [test case](./it/cases.ts) and verifies the result on SonarQube Cloud

Which test cases run depends on the build:

| Build                                  | ITs run                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| master push, nightly build, manual run | All combinations (`IT_SCOPE=full`)                           |
| Pull request                           | Only `sonarcloud-v4-cli-embedded-unix` (`IT_SCOPE=smoke`)    |
| Pull request changing only docs, `.github/`, `*.md`, ... | None (see [requires-its.sh](../scripts/requires-its.sh)) |
| Draft pull request                     | Not built at all, the build starts when it is marked ready |

To run the smoke test locally: `IT_SCOPE=smoke npm run test-its`.

When the ITs job fails or is cancelled, the IT builds it queued are cancelled (`npm run cancel-its`).

### QA runs are serialized

All QA runs share the test extension and the SonarQube Cloud projects, so only one can run at a time.
The `run_qa` stage targets the `sonar-scanner-azdo-its` environment, which holds an "Exclusive Lock" check:
other runs wait in queue order (`lockBehavior: sequential`).

One-time setup (requires admin rights on the Azure DevOps project): in `sonarsource/SonarScannerAzdo`, go to
Pipelines > Environments > `sonar-scanner-azdo-its` (created on first use if missing) > Approvals and checks,
and add an "Exclusive Lock" check.

## How to register a new pipeline to every PR analysis

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
