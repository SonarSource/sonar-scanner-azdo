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

using AzureDevOpsExtension.IntegrationTests.Models;
using IntegrationTests;
using Newtonsoft.Json;
using System;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace AzureDevOpsExtension.IntegrationTests
{
    public class SonarCloudCallWrapper
    {
        private string _sonarCloudToken => EnvironmentVariableWrapper.GetVariableOrThrow("SC_TOKEN");

        private string GetBase64EncodedToken()
        {
            return Convert.ToBase64String(ASCIIEncoding.ASCII.GetBytes($"{_sonarCloudToken}:"));
        }

        private HttpClient GetHttpClient()
        {
            var httpClient = new HttpClient()
            {
                BaseAddress = new Uri("https://sonarcloud.io/"),
            };

            httpClient.DefaultRequestHeaders.Add("Authorization", $"Basic {GetBase64EncodedToken()}");

            return httpClient;
        }

        private async Task<MeasureBaseModel> GetNclocAndCoverageForComponent(string component)
        {
            var httpClient = GetHttpClient();

            var httpResult = await httpClient.GetAsync($"/api/measures/component?component={component}&metricKeys=coverage,ncloc");

            var resultContent = JsonConvert.DeserializeObject<MeasureBaseModel>(await httpResult.Content.ReadAsStringAsync());

            return resultContent;
        }

        public async Task<double> GetCodeCoveragePercentageForProjectAsync(string projectKey)
        {
            var measures = await GetNclocAndCoverageForComponent(projectKey);

            var coverage = measures?.component.measures.FirstOrDefault(m => m.metric.Equals("coverage"));

            if (coverage != null && double.TryParse(coverage.value, out double coverageValue))
            {
                return coverageValue;
            }

            return double.NaN;
        }

        public async Task<long> GetNclocForProjectAsync(string projectKey)
        {

            var measures = await GetNclocAndCoverageForComponent(projectKey);

            var ncloc = measures.component.measures.FirstOrDefault(m => m.metric.Equals("ncloc"));

            if (ncloc != null && long.TryParse(ncloc.value, out long nclocValue))
            {
                return nclocValue;
            }

            return 0L;
        }

        public async Task<bool> DeleteProjectAsync(string projectKey)
        {
            using (var httpClient = GetHttpClient())
            {
                var result = await httpClient.PostAsync($"/api/projects/delete?project={projectKey}", new StringContent(""));
                if (result.StatusCode == System.Net.HttpStatusCode.NoContent || result.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return true;
                }

                Debug.WriteLine($"An error occured while deleting the project : Status Code returned {result.StatusCode} " +
                    $" ;; Body returned : {await result.Content.ReadAsStringAsync()}");
                return false;

            }
        }
    }
}
