import * as tl from "azure-pipelines-task-lib";
import * as semver from "semver";
import { EndpointType } from "../sonarqube/Endpoint";
import { JdkVersionSource, SQ_VERSION_DROPPING_JAVA_11, TaskVariables } from "./constants";

export default class JavaVersionResolver {
  /**
   * The value of JAVA_HOME env. variable before this task started.
   */
  private static javaHomeOriginalPath: string;

  /**
   * Whether this task changed the JAVA_HOME variable.
   */
  private static isJavaVersionChanged = false;

  public static setJavaVersion(
    jdkVersion: JdkVersionSource,
    endpointType: EndpointType,
    serverVersion?: string,
  ) {
    if (jdkVersion === JdkVersionSource.JavaHome) {
      tl.debug(
        `${JdkVersionSource.JavaHome} was specified in the Run Code Analysis task configuration, nothing to do.`,
      );
      return;
    }

    /**
     * Ignore Java 11 setting it the SQ server doesn't support it @see VSTS-355
     */
    const ignoreJava11 =
      serverVersion &&
      semver.gte(semver.coerce(serverVersion), SQ_VERSION_DROPPING_JAVA_11) &&
      endpointType === EndpointType.SonarQube;
    if (ignoreJava11 && jdkVersion === JdkVersionSource.JavaHome11) {
      tl.warning(
        `This task was configured to use Java 11, but the ${endpointType} server v${serverVersion} does not support it.` +
          ` Ignoring the configuration and using ${JdkVersionSource.JavaHome} instead.` +
          ` Specify jdkversion in your task definition to use Java 17 to remove this warning.`,
      );
      return;
    }

    // Try and read the java path
    const newJavaPath = tl.getVariable(jdkVersion);

    if (newJavaPath) {
      tl.debug(
        `${jdkVersion} was found with value ${newJavaPath}, will switch to it for Sonar scanner...`,
      );
      this.javaHomeOriginalPath = tl.getVariable(TaskVariables.JavaHome);
      // Replace the JAVA_HOME variable with the new path
      tl.setVariable(TaskVariables.JavaHome, newJavaPath);
      this.isJavaVersionChanged = true;
    }
  }

  /**
   * Clean up the JAVA_HOME variable if it was changed by this task.
   */
  public static revertJavaHomeToOriginal() {
    if (this.isJavaVersionChanged) {
      tl.debug(`Reverting ${TaskVariables.JavaHome} to its initial path.`);
      tl.setVariable(TaskVariables.JavaHome, this.javaHomeOriginalPath);
      this.isJavaVersionChanged = false;
    }
  }
}
