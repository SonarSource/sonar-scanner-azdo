# AzDO Integration Tests

## How are integration tests run

On each pull request and main branch, the QA pipeline should:

- Build a test extension and install it
- Run each [test case](./it/cases.ts) and verify the result on SonarCloud

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
