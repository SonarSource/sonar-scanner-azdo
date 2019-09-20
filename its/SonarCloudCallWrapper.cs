using AzureDevOpsExtension.IntegrationTests.Models;
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
        private string GetBase64EncodedToken()
        {
            return Convert.ToBase64String(ASCIIEncoding.ASCII.GetBytes(String.Format("{0}:", Environment.GetEnvironmentVariable("SC_TOKEN"))));
        }

        private HttpClient GetHttpClient()
        {
            var httpClient = new HttpClient()
            {
                BaseAddress = new Uri(Environment.GetEnvironmentVariable("SONARCLOUD_BASE_URL")),
            };

            httpClient.DefaultRequestHeaders.Add("Authorization", $"Basic {GetBase64EncodedToken()}");

            return httpClient;
        }

        private async Task<MeasureBaseModel> GetNclocAndCoverageForComponent(string component)
        {
            try
            {
                var httpClient = GetHttpClient();

                var httpResult = await httpClient.GetAsync($"/api/measures/component?component={component}&metricKeys=coverage,ncloc");

                var resultContent = JsonConvert.DeserializeObject<MeasureBaseModel>(await httpResult.Content.ReadAsStringAsync());

                return resultContent;

            }
            catch (Exception ex)
            {
                Debug.WriteLine($"An exception has been raised while issuing HTTP call : " + ex.Message + " ;; " + ex.StackTrace);
                return null;
            }
        }

        public async Task<double> GetCodeCoveragePercentageForProjectAsync(string projectKey)
        {
            try
            {
                var measures = await GetNclocAndCoverageForComponent(projectKey);

                var coverage = measures?.component.measures.FirstOrDefault(m => m.metric.Equals("coverage"));

                if (coverage != null && double.TryParse(coverage.value, out double coverageValue))
                {
                    return coverageValue;
                }

                return double.NaN;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("An exception has been raised : " + ex.Message + " ;; " + ex.StackTrace);
                return double.NaN;
            }
        }

        public async Task<long> GetNclocForProjectAsync(string projectKey)
        {
            try
            {
                var measures = await GetNclocAndCoverageForComponent(projectKey);

                var ncloc = measures.component.measures.FirstOrDefault(m => m.metric.Equals("ncloc"));

                if (ncloc != null && long.TryParse(ncloc.value, out long nclocValue))
                {
                    return nclocValue;
                }

                return 0L;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("An exception has been raised : " + ex.Message + " ;; " + ex.StackTrace);
                return 0L;
            }
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
