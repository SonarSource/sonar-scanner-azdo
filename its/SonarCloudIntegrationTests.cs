/*
 * Azure DevOps extension for SonarQube/SonarCloud ITs
 * Copyright (C) 2016-2022 SonarSource SA
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

using IntegrationTests.Models;
using Microsoft.TeamFoundation.Build.WebApi;
using Microsoft.VisualStudio.Services.Common;
using Microsoft.VisualStudio.Services.WebApi;
using NUnit.Framework;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace AzureDevOpsExtension.IntegrationTests
{
    [TestFixture]
    public class SonarCloudIntegrationTests
    {

        private static SonarCloudCallWrapper _scInstance;
        private static String _buildParameters;
        private static BuildHttpClient _buildHttpClient;

        [OneTimeSetUp]
        public void SetupTests()
        {
            _scInstance = new SonarCloudCallWrapper();
            _buildParameters = "{\"IT_TRIGGER_BUILD\":\"true\"}";
            VssConnection connection = GetAzDoConnection();

            _buildHttpClient = connection.GetClient<BuildHttpClient>();
        }

        public static IEnumerable<BuildTestCase> GetTestCases()
        {
            yield return new DotnetFrameworkTestCase();
            yield return new CobolTestCase();
            yield return new MavenTestCase();
            yield return new GradleTestCase();
        }

        [Test]
        [TestCaseSource("GetTestCases")]
        public async Task Execute_Build_And_Analysis(BuildTestCase testAssets)
        {
            Debug.WriteLine($"[{testAssets.LogPrefix}]Deleting SonarCloud project if it already exists...");
            //We first delete the project on SonarCloud
            var isProjectDeleted = await _scInstance.DeleteProjectAsync(testAssets.ProjectKey);

            Assert.IsTrue(isProjectDeleted);

            Debug.WriteLine($"[{testAssets.LogPrefix}]SonarCloud project has been successfully deleted...");
            Debug.WriteLine($"[{testAssets.LogPrefix}]Queuing the corresponding build and waiting for its completion...");

            Build currentBuildResult = await ExecuteBuildAndWaitForCompleted(testAssets.PipelineName);

            Debug.WriteLine($"[{testAssets.LogPrefix}]Build completed.");

            Assert.AreEqual(BuildResult.Succeeded, currentBuildResult.Result);
            await AssertVersionsOfTasksAreCorrect(currentBuildResult);

            await AssertNcLocAndCoverage(testAssets.ProjectKey, testAssets.NcLocs, testAssets.Coverage);
        }


        private static VssConnection GetAzDoConnection()
        {
            VssBasicCredential credentials = new VssBasicCredential(string.Empty, Environment.GetEnvironmentVariable("AZURE_TOKEN"));
            VssConnection connection = new VssConnection(new Uri(String.Concat(Environment.GetEnvironmentVariable("AZDO_BASE_URL"), Environment.GetEnvironmentVariable("ITS_ORGA"))), credentials);

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
            var buildProperties = await _buildHttpClient.GetBuildPropertiesAsync(Environment.GetEnvironmentVariable("ITS_PROJECT_NAME"), currentBuildResult.Id);
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
            var definitions = await _buildHttpClient.GetDefinitionsAsync(project: Environment.GetEnvironmentVariable("ITS_PROJECT_NAME"));
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
