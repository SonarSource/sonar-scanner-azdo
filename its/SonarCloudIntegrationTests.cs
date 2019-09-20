using Microsoft.TeamFoundation.Build.WebApi;
using Microsoft.VisualStudio.Services.Common;
using Microsoft.VisualStudio.Services.WebApi;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Collections;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace AzureDevOpsExtension.IntegrationTests
{
    [TestClass]
    public class SonarCloudIntegrationTests
    {
        public TestContext TestContext { get; set; }

        private static SonarCloudCallWrapper _scInstance;
        private static String _buildParameters;
        private static BuildHttpClient _buildHttpClient;

        [ClassInitialize]
        public static void SetupTests(TestContext testContext)
        {
            _scInstance = new SonarCloudCallWrapper();
            _buildParameters = "{\"IT_TRIGGER_BUILD\":\"true\"}";
            VssConnection connection = GetAzDoConnection();

            _buildHttpClient = connection.GetClient<BuildHttpClient>();
        }

        [TestMethod]
        public async Task Execute_Scannercli_Build_And_Analysis()
        {
            Debug.WriteLine("[Scannercli]Deleting SonarCloud project if it already exists...");
            //We first delete the project on SonarCloud
            var isProjectDeleted = await _scInstance.DeleteProjectAsync(Environment.GetEnvironmentVariable("SC_SCANNERCLI_PROJECT_KEY"));

            Assert.AreEqual(true, isProjectDeleted);

            Debug.WriteLine("[Scannercli]SonarCloud project has been successfully deleted...");
            Debug.WriteLine("[Scannercli]Queuing the corresponding build and waiting for its completion...");

            Build currentBuildResult = await ExecuteBuildAndWaitForCompleted(Environment.GetEnvironmentVariable("AZDO_ITS_SCANNERCLI_PIPELINE_NAME"));

            Debug.WriteLine("[Scannercli]Build completed.");

            Assert.AreEqual(BuildResult.Succeeded, currentBuildResult.Result);
            await AssertVersionsOfTasksAreCorrect(currentBuildResult);

            await AssertNcLocAndCoverage(Environment.GetEnvironmentVariable("SC_SCANNERCLI_PROJECT_KEY"), 1735, 0.5);
        }

        [TestMethod]
        public async Task Execute_Gradle_Build_And_Analysis()
        {
            Debug.WriteLine("[Gradle]Deleting SonarCloud project if it already exists...");
            //We first delete the project on SonarCloud
            var isProjectDeleted = await _scInstance.DeleteProjectAsync(Environment.GetEnvironmentVariable("SC_GRADLE_PROJECT_KEY"));

            Assert.AreEqual(true, isProjectDeleted);

            Debug.WriteLine("[Gradle]SonarCloud project has been successfully deleted...");
            Debug.WriteLine("[Gradle]Queuing the corresponding build and waiting for its completion...");

            Build currentBuildResult = await ExecuteBuildAndWaitForCompleted(Environment.GetEnvironmentVariable("AZDO_ITS_GRADLE_PIPELINE_NAME"));

            Debug.WriteLine("[Gradle]Build completed.");

            Assert.AreEqual(BuildResult.Succeeded, currentBuildResult.Result);
            await AssertVersionsOfTasksAreCorrect(currentBuildResult, false);

            await AssertNcLocAndCoverage(Environment.GetEnvironmentVariable("SC_GRADLE_PROJECT_KEY"), 9, 50);
        }

        [TestMethod]
        public async Task Execute_Maven_Build_And_Analysis()
        {
            Debug.WriteLine("[Maven]Deleting SonarCloud project if it already exists...");
            //We first delete the project on SonarCloud
            var isProjectDeleted = await _scInstance.DeleteProjectAsync(Environment.GetEnvironmentVariable("SC_MAVEN_PROJECT_KEY"));

            Assert.AreEqual(true, isProjectDeleted);

            Debug.WriteLine("[Maven]SonarCloud project has been successfully deleted...");
            Debug.WriteLine("[Maven]Queuing the corresponding build and waiting for its completion...");

            Build currentBuildResult = await ExecuteBuildAndWaitForCompleted(Environment.GetEnvironmentVariable("AZDO_ITS_MAVEN_PIPELINE_NAME"));

            Debug.WriteLine("[Maven]Build completed.");

            Assert.AreEqual(BuildResult.Succeeded, currentBuildResult.Result);
            await AssertVersionsOfTasksAreCorrect(currentBuildResult, false);

            await AssertNcLocAndCoverage(Environment.GetEnvironmentVariable("SC_MAVEN_PROJECT_KEY"), 211, 23.1);
        }

        [TestMethod]
        public async Task Execute_Dotnet_Build_And_Analysis()
        {
            Debug.WriteLine("[Dotnet]Deleting SonarCloud project if it already exists...");
            //We first delete the project on SonarCloud
            var isProjectDeleted = await _scInstance.DeleteProjectAsync(Environment.GetEnvironmentVariable("SC_DOTNET_PROJECT_KEY"));

            Assert.AreEqual(true, isProjectDeleted);

            Debug.WriteLine("[Dotnet]SonarCloud project has been successfully deleted...");
            Debug.WriteLine("[Dotnet]Queuing the corresponding build and waiting for its completion...");

            Build currentBuildResult = await ExecuteBuildAndWaitForCompleted(Environment.GetEnvironmentVariable("AZDO_ITS_DOTNET_PIPELINE_NAME"));

            Debug.WriteLine("[Dotnet]Build completed.");

            Assert.AreEqual(BuildResult.Succeeded, currentBuildResult.Result);

            await AssertVersionsOfTasksAreCorrect(currentBuildResult);

            await AssertNcLocAndCoverage(Environment.GetEnvironmentVariable("SC_DOTNET_PROJECT_KEY"), 43, 25);
        }

        private static VssConnection GetAzDoConnection()
        {
            VssBasicCredential credentials = new VssBasicCredential(string.Empty, Environment.GetEnvironmentVariable("AZURE_TOKEN"));
            VssConnection connection = new VssConnection(new Uri(String.Concat(Environment.GetEnvironmentVariable("AZDO_BASE_URL"), Environment.GetEnvironmentVariable("AZDO_ITS_ORGA"))), credentials);

            return connection;
        }

        private async Task AssertNcLocAndCoverage(String projectKey, long expectedNcLoc, double expectedCoverage)
        {
            //Checking results on SonarQube's side. As all pipelines have a Publish Quality Gate Result in them, 
            //we don't need to check if background task is finished, because it should be by then.
            var actualNcLoc = await _scInstance.GetNclocForProjectAsync(projectKey);
            var actualCoverage = await _scInstance.GetCodeCoveragePercentageForProjectAsync(projectKey);

            Assert.AreEqual(expectedNcLoc, actualNcLoc);
            Assert.AreEqual(expectedCoverage, actualCoverage);
        }

        private async Task AssertVersionsOfTasksAreCorrect(Build currentBuildResult, bool shouldAssertAnalyze = true)
        {
            var buildProperties = await _buildHttpClient.GetBuildPropertiesAsync(Environment.GetEnvironmentVariable("AZDO_ITS_PROJECT_NAME"), currentBuildResult.Id);
            var actualPrepareVersion = buildProperties.FirstOrDefault(p => p.Key.Equals("SonarSourcePrepareTaskVersion"));
            var actualAnalyzeVersion = buildProperties.FirstOrDefault(p => p.Key.Equals("SonarSourceAnalyzeTaskVersion"));
            var actualPublishVersion = buildProperties.FirstOrDefault(p => p.Key.Equals("SonarSourcePublishTaskVersion"));

            var expectedPrepareVersion = System.Environment.GetEnvironmentVariable("PREPARE_TASK_VERSION");
            var expectedAnalyzeVersion = System.Environment.GetEnvironmentVariable("ANALYZE_TASK_VERSION");
            var expectedPublishVersion = System.Environment.GetEnvironmentVariable("PUBLISH_TASK_VERSION");

            Assert.AreEqual(expectedPrepareVersion, actualPrepareVersion.Value.ToString());

            if (shouldAssertAnalyze)
            {
                Assert.AreEqual(expectedAnalyzeVersion, actualAnalyzeVersion.Value.ToString());
            }

            Assert.AreEqual(expectedPublishVersion, actualPublishVersion.Value.ToString());
                
        }

        private async Task<Build> ExecuteBuildAndWaitForCompleted(string pipelineName)
        {
            var definitions = await _buildHttpClient.GetDefinitionsAsync(project: Environment.GetEnvironmentVariable("AZDO_ITS_PROJECT_NAME"));
            var target = definitions.FirstOrDefault(d => d.Name == pipelineName);

            var queuedBuild = await _buildHttpClient.QueueBuildAsync(new Build
            {
                Definition = new DefinitionReference
                {
                    Id = target.Id
                },
                Project = target.Project,
                Parameters = _buildParameters
            });

            
            var currentBuildResult = await _buildHttpClient.GetBuildAsync(queuedBuild.Project.Id, queuedBuild.Id);


            while (currentBuildResult.Status != BuildStatus.Completed)
            {
                Debug.WriteLine("Build is not completed yet, waiting 20 more seconds...");
                Thread.Sleep(TimeSpan.FromSeconds(20));
                currentBuildResult = await _buildHttpClient.GetBuildAsync(queuedBuild.Project.Id, queuedBuild.Id);
            }

            return currentBuildResult;
        }
    }
}
