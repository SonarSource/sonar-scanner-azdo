import * as tl from "azure-pipelines-task-lib/task";

export default class JavaVersionResolver {
  private static javaHomeOriginalPath: string;
  private static isJavaNewVersionSet: boolean = false;

  public static lookupVariable(jdkversionSource: string): string | undefined {
    tl.debug(`Trying to resolve ${jdkversionSource} from environment variables...`);
    const javaPath = tl.getVariable(jdkversionSource);
    if (javaPath) {
      tl.debug(
        `${jdkversionSource} was found with value ${javaPath}, will switch to it for Sonar scanner...`
      );
      return javaPath;
    } else {
      tl.debug(`No value found for ${jdkversionSource}.`);
      return undefined;
    }
  }

  public static setJavaVersion(jdkversionSource: string) {
    let newJavaPath = undefined;
    if (jdkversionSource !== "JAVA_HOME") {
      newJavaPath = this.lookupVariable(jdkversionSource);
      if (newJavaPath) {
        this.javaHomeOriginalPath = tl.getVariable("JAVA_HOME");
        tl.setVariable("JAVA_HOME", newJavaPath);
        this.isJavaNewVersionSet = true;
      }
    } else {
      tl.debug(
        `JAVA_HOME was specified in the Run Code Analysis task configuration, nothing to do.`
      );
    }
  }

  public static revertJavaHomeToOriginal() {
    if (this.isJavaNewVersionSet) {
      tl.debug("Reverting JAVA_HOME to its initial path.");
      tl.setVariable("JAVA_HOME", this.javaHomeOriginalPath);
    }
  }
}
