import axios from "axios";
import { getBranch, loadEnvironmentVariables } from "./env";
import {
  SONARCLOUD_ORGANIZATION_KEY,
} from "../constant";

export async function getLastAnalysisDate(
  sonarHostUrl: string,
  componentKey: string,
  log: (...args: any[]) => void = console.log,
): Promise<string | null> {
  const env = loadEnvironmentVariables();

  const url = `${sonarHostUrl}/api/components/show?component=${componentKey}&branch=${getBranch()}&ps=1`;
  log(`Getting last analysis date for ${componentKey} at ${url}...`);
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${env.SONARCLOUD_TOKEN}`,
      },
    });
    return response.data.component.analysisDate;
  } catch (error: unknown) {
    return null;
  }
}

export async function provisionProject(
  sonarHostUrl: string,
  projectKey: string,
  log: (...args: any[]) => void = console.log,
): Promise<boolean> {
  const env = loadEnvironmentVariables();

  const url = `${sonarHostUrl}/api/projects/create`;
  log(`Provisionning project ${projectKey} at ${sonarHostUrl}...`);
  try {
    await axios.post(url, {
      name: projectKey,
      organization: SONARCLOUD_ORGANIZATION_KEY,
      project: projectKey
    }, {
      headers: {
        Authorization: `Bearer ${env.SONARCLOUD_TOKEN}`,
      },
    }).catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
    });
    return true;
  } catch (error: unknown) {
    return false;
  }
}

export async function deleteProject(
  sonarHostUrl: string,
  projectKey: string,
  log: (...args: any[]) => void = console.log,
): Promise<boolean> {
  const env = loadEnvironmentVariables();

  const url = `${sonarHostUrl}/api/projects/delete`;
  log(`Deleting project ${projectKey} at ${sonarHostUrl}...`);
  try {
    await axios.post(url, {
      project: projectKey
    }, {
      headers: {
        Authorization: `Bearer ${env.SONARCLOUD_TOKEN}`,
      },
    });
    return true;
  } catch (error: unknown) {
    return false;
  }
}
