import * as tl from "azure-pipelines-task-lib/task";

export default class JavaVersionResolver {
  private static javaHomeOriginalPath: string;
  private static isJavaNewVersionSet: boolean = false;

  public static setJavaHomeToIfAvailable(newJavaPath: string) {
    this.javaHomeOriginalPath = tl.getVariable("JAVA_HOME");
    const javaNewPath = tl.getVariable(newJavaPath);
    if (javaNewPath) {
      tl.debug(`${newJavaPath} path has been detected, switching to it for the analysis.`);
      tl.setVariable("JAVA_HOME", javaNewPath);
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
