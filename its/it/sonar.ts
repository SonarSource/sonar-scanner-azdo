import axios from "axios";
import { getBranch, loadEnvironmentVariables } from "./env";

export async function getLastAnalysisDate(
  sonarHostUrl: string,
  componentKey: string,
): Promise<string | null> {
  const env = loadEnvironmentVariables();

  const url = `${sonarHostUrl}/api/components/show?component=${componentKey}&branch=${getBranch()}&ps=1`;
  console.log(`Getting last analysis date for ${componentKey} at ${url}...`);
  try {
    const response = await axios.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${env.SONARCLOUD_TOKEN}`,
        },
      },
    );
    return response.data.component.analysisDate;
  } catch (error: unknown) {
    return null;
  }
}
