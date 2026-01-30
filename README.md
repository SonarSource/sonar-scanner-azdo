# Azure DevOps extension for SonarQube (Server, Cloud)

[![Build Status](https://dev.azure.com/sonarsource/SonarScannerAzdo/_apis/build/status%2FSonarSource.sonar-scanner-azdo?branchName=master)](https://dev.azure.com/sonarsource/SonarScannerAzdo/_build/latest?definitionId=160&branchName=master)

Sonar's [Clean Code solutions](https://www.sonarsource.com/solutions/clean-code/?utm_medium=referral&utm_source=github&utm_campaign=clean-code&utm_content=sonar-scanner-azdo) help developers deliver high-quality, efficient code standards that benefit the entire team or organization.

## Marketplace

- [SonarQube Server Extension](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarqube)
- [SonarQube Cloud Extension](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud)

## Have Questions or Feedback?

For support questions ("How do I?", "I got this error, why?", ...), please head to the [SonarSource forum](https://community.sonarsource.com/c/help). There are chances that a question similar to yours has already been answered.

Be aware that this forum is a community, so the standard pleasantries ("Hi", "Thanks", ...) are expected. And if you don't get an answer to your thread, you should sit on your hands for at least three days before bumping it. Operators are not standing by. :-)

## Contributing

If you would like to see a new feature, please create a new thread in the forum ["Suggest new features"](https://community.sonarsource.com/c/suggestions/features).

Please be aware that we are not actively looking for feature contributions. The truth is that it's extremely difficult for someone outside SonarSource to comply with our roadmap and expectations. Therefore, we typically only accept minor cosmetic changes and typo fixes.

With that in mind, if you would like to submit a code contribution, please create a pull request for this repository. Please explain your motives to contribute this change: what problem you are trying to fix, what improvement you are trying to make.

Make sure that you follow our [code style](https://github.com/SonarSource/sonar-developer-toolset#code-style) and all tests are passing (GitHub Actions build and Azure DevOps integration tests are executed for each pull request).

## Developer documentation

### How to set the environment

- Install NPM (v8 or higher) / Node.js (v14 or higher)
- ```bash
  npm install -g tfx-cli
  npm install
  ```

### Formatting and Linting

Automatic formatting can be achieved by using `npm run format`. Pipeline execution in PRs will fail if the format is not ok. There is also linting enabled in the pipeline, you can run `npm run lint` to ensure your code is properly lint.

### Run tests

```bash
npm test
```

To run the same set of validation that happens in the pipeline, use:

```bash
npm run validate-ci
```

### Package a production build

```bash
npm run build
```

### Package a test build

```bash
npm run test-build -- --publisher <your-publisher>
```

### Update the extension/task versions automatically

During testing, when publishing an extension for validation, it is useful to have a way to increment the patch versions automatically so your changes are not rejected.

Use these helpers to automatically bump the patch versions of the extensions and tasks, to ensure your changes are taken

```bash
# Change the task versions from X.Y.X to X.Y.123
BUILD_BUILDID=123 npx gulp ci:azure:hotfix-tasks-version

# Change the extensions versions from X.Y.Z to X.Y.Z.123
BUILD_BUILDID=123 npx gulp ci:azure:hotfix-extensions-version
```

Run a test build after to create a test extension with the modified versions. Increment the value of `BUILD_BUILDID` every time you want to publish a new version for test purposes.

### Package a test build with custom .NET scanners inside the extension

Download the sonar-scanner-XXX-net.zip and sonar-scanner-XXX-net-framework.zip that you wish to test from the [SonarScanner for .NET releases page](https://github.com/SonarSource/sonar-scanner-msbuild/releases).

When building the extension with your test publisher use the command:

```bash
SCANNER_NET_FRAMEWORK_LOCATION=/path/to/sonar-scanner-9.0.0-rc.99116-net-framework.zip \
SCANNER_NET_LOCATION=/path/to/sonar-scanner-9.0.0-rc.99116-net.zip \
npm run test-build -- --publisher <your-publisher>
```

## License

Copyright 2017-2024 SonarSource.

Licensed under the [GNU Lesser General Public License, Version 3.0](http://www.gnu.org/licenses/lgpl.txt))
