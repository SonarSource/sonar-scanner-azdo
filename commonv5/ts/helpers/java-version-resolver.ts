import * as tl from "azure-pipelines-task-lib/task";

const HOSTED_AGENT_JAVA_HOME_PATTERN = "JAVA_HOME_%%JAVAVERSION%%_X64";

// Add the version of Java in descending order when a new is out.
const JAVA_VERSION = ["17", "11"];

export default class JavaVersionResolver {
  private static javaHomeOriginalPath: string;
  private static isJavaNewVersionSet: boolean = false;

  public static lookupLatestAvailableJavaVersion(): string {
    for (let i = 0; i < JAVA_VERSION.length; i++) {
      const javaEnvVariable = HOSTED_AGENT_JAVA_HOME_PATTERN.replace(
        "%%JAVAVERSION%%",
        JAVA_VERSION[i]
      );
      tl.debug(`Trying to resolve ${javaEnvVariable} from environment variables...`);
      const javaPath = tl.getVariable(javaEnvVariable);
      if (javaPath) {
        tl.debug(`${javaEnvVariable} was found with value ${javaPath}...`);
        return javaPath;
      } else {
        tl.debug(`No value found for ${javaEnvVariable}.`);
      }
    }
    tl.debug("No JAVA_HOME_XX_X64 found on the environment, nothing to do.");
    return "NOTFOUND";
  }

  public static setJavaHomeToIfAvailable() {
    const latestJavaPath = this.lookupLatestAvailableJavaVersion();

    if (latestJavaPath !== "NOTFOUND") {
      this.javaHomeOriginalPath = tl.getVariable("JAVA_HOME");
      tl.debug(`${latestJavaPath} path has been provided, switching to it for the analysis.`);
      tl.setVariable("JAVA_HOME", latestJavaPath);
      this.isJavaNewVersionSet = true;
    }
  }

  public static revertJavaHomeToOriginal() {
    if (this.isJavaNewVersionSet) {
      tl.debug("Reverting JAVA_HOME to its initial path.");
      tl.setVariable("JAVA_HOME", this.javaHomeOriginalPath);
    }
  }
}
