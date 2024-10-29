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

using IntegrationTests;
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

        private SonarCloudCallWrapper _scInstance;
        private BuildHttpClient _buildHttpClient;

        private static string _azureToken => EnvironmentVariableWrapper.GetVariableOrThrow("AZURE_TOKEN");
        private static string _azureBaseUrl => EnvironmentVariableWrapper.GetVariableOrThrow("AZDO_BASE_URL");
        private static string _azureDevOpsItsOrganization = EnvironmentVariableWrapper.GetVariableOrThrow("ITS_ORGA");
        private static string _azureDevOpsItsProjectName => EnvironmentVariableWrapper.GetVariableOrThrow("ITS_PROJECT_NAME");


        [OneTimeSetUp]
        public void SetupTests()
        {
            _scInstance = new SonarCloudCallWrapper();
            VssConnection connection = GetAzDoConnection();

            _buildHttpClient = connection.GetClient<BuildHttpClient>();
        }

        public static IEnumerable<BuildTestCase> GetTestCases()
        {
            yield return new DotnetFrameworkV3TestCase();
            yield return new DotnetCoreV3TestCase();
            yield return new CobolV3TestCase();
            yield return new CobolV2TestCase();
            yield return new MavenV3TestCase();
            yield return new GradleV3TestCase();
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

            await AssertNcLocAndCoverage(testAssets.ProjectKey, testAssets.NcLocs, testAssets.Coverage);
        }


        private static VssConnection GetAzDoConnection()
        {
            VssBasicCredential credentials = new VssBasicCredential(string.Empty, _azureToken);
            VssConnection connection = new VssConnection(new Uri(String.Concat(_azureBaseUrl, _azureDevOpsItsOrganization)), credentials);

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

        private async Task<Build> ExecuteBuildAndWaitForCompleted(string pipelineName)
        {
            var definitions = await _buildHttpClient.GetDefinitionsAsync(project: _azureDevOpsItsProjectName);
            var target = definitions.FirstOrDefault(d => d.Name == pipelineName);

            var queuedBuild = await _buildHttpClient.QueueBuildAsync(new Build
            {
                Definition = new DefinitionReference
                {
                    Id = target.Id
                },
                Project = target.Project
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
