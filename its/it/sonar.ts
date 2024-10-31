import axios from "axios";
import { getBranch, loadEnvironmentVariables } from "./env";

export async function getMeasures(
  sonarHostUrl: string,
  componentKey: string,
): Promise<{ nloc: number }> {
  const env = loadEnvironmentVariables();

  const response = await axios.get(
    `${sonarHostUrl}/api/measures/component?component=${componentKey}&branch=${getBranch()}&metricKeys=coverage,ncloc`,
    {
      headers: {
        Authorization: `Bearer ${env.SONARCLOUD_TOKEN}`,
      },
    },
  );
  const { measures } = response.data.component;
  return {
    nloc: parseInt(measures.find((m: any) => m.metric === "ncloc").value, 10),
  };
}

export async function verifyMeasures(
  sonarHostUrl: string,
  componentKey: string,
  expectedNloc: number,
): Promise<void> {
  const { nloc } = await getMeasures(sonarHostUrl, componentKey);
  if (nloc !== expectedNloc) {
    throw new Error(`NLOC is not as expected: ${nloc} !== ${expectedNloc}`);
  }
}
