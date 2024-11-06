import axios from "axios";
import { getBranch, loadEnvironmentVariables } from "./env";

export async function getLastAnalysisDate(
  sonarHostUrl: string,
  componentKey: string,
  log: (...args: any[]) => void = console.log,
  token?: string,
): Promise<string | null> {
  const env = loadEnvironmentVariables();

  const url = `${sonarHostUrl}/api/components/show?component=${componentKey}&branch=${getBranch()}&ps=1`;
  log(`Getting last analysis date for ${componentKey} at ${url}...`);
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token || env.SONARCLOUD_TOKEN}`,
      },
    });
    return response.data.component.analysisDate;
  } catch (error: unknown) {
    return null;
  }
}
