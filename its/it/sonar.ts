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
