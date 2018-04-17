**[SonarCloud][sc]** is the leading product for Continuous Code Quality online. It is a static source code analysis solution that enables continuous tracking of bugs, code smells and vulnerabilities for 16 different languages such as C#, VB .Net, Java, C, C++, JavaScript, ...

SonarCloud is totally free for open-source projects, and has a paid plan for private ones. Simply sign up and create an organization for your team, and you are ready to configure your build definitions to get your projects analyzed in a couple of minutes.

## About the SonarCloud VSTS Marketplace Extension
This extension provides the following features:
* A dedicated **SonarCloud EndPoint** to set the user token and validate the connection.
* Three build tasks (along with build templates) to get your projects analyzed easily:
  * **Prepare Analysis Configuration** task, to configure all the required settings before executing the build. This task is mandatory. In case of .NET solutions or Java projects, this tasks helps to integrate seamlessly with MSBuild, Maven and Gradle tasks.
  * **Run Code Analysis** task, to actually execute the analysis of the source code. Not required for Maven or Gradle projects.
  * **Publish Quality Gate Result** task, to display the quality gate status in the build summary. This tasks is optional, as it can increase the overall build time.
* Analysis of the branches and the **pull requests** of your projects
* A **widget** to monitor the quality gate for your projects on your favorite VSTS dashboard

## Highlighted Features
### Seamless Integration with .Net solutions
The analysis of C# and VB. Net solution is really straightforward since it only requires adding the two **Prepare Analysis Configuration** and **Run Code Analysis** tasks to your build definition.

### Easy setup for Maven and Gradle projects
If you're doing Java, analyzing your source code is also very easy. It only requires adding the **Prepare Analysis Configuration** task, and check the **Run SonarCloud Analysis** option in the "Code Analysis" panel of the Maven or Gradle task.

### Branch and Pull Request analysis
Whatever type of source repository you are analysing, when a build is run on a branch of your project, the extension 
automatically configures the analysis to be pushed to the relevant project branch on SonarCloud:

![Branches](img/branches.png)

If you configure your build definition as a build validation for pull requests of that project (this can be done on "Branch policies"), SonarCloud will also
analyze the code changes and decorate the pull request with comments and overall status so that you can merge with confidence:

![PR-Decoration](img/pull-request-decoration.png)

**Important note**: to activate pull request decoration, you must specify a user token in the 
"General Settings > Pull Requests" administration page of your project in SonarCloud.

### Quality Gate Status

#### In a dashboard widget
You can monintor the quality gate status of your projects in your favorite dashboard:

![Quality Gate Widget](img/widget.png)

#### In the build summary
The **Publish Quality Gate Result** task waits for the analysis report to be consumed by the SonarCloud in order to flag the build job with the Quality Gate status. The Quality Gate is a major, out-of-the-box, feature of SonarCloud. It provides the ability to know at each analysis whether an application passes or fails the release criteria. In other words it tells you at every analysis whether an application is ready for production "quality-wise".

Example of a passing Quality Gate:

![Passed Qualiy Gate](img/sq-analysis-report-passed.png)

Example of a failing Quality Gate:

![Failed Qualiy Gate](img/sq-analysis-report-failed.png)



This [Get Started][getstarted] guide provides all the required documentation for you to setup a build definition.

   [sc]: <https://sonarcloud.io>
   [getstarted]: <http://redirect.sonarsource.com/doc/install-configure-scanner-tfs-ts.html>
