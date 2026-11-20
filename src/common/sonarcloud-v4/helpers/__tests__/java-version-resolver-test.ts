/*
 * Azure DevOps extension for SonarQube
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import * as tl from "azure-pipelines-task-lib/task";
import { EndpointType } from "../../sonarqube/Endpoint";
import { JdkVersionSource, TaskVariables } from "../constants";
import JavaVersionResolver from "../java-version-resolver";
import { log, LogLevel } from "../logging";

jest.mock("../logging");

const MOCKED_JAVA_VARIABLES = {
  [JdkVersionSource.JavaHome]: "/opt/bin/java/bin",
  [JdkVersionSource.JavaHome11]: "/opt/bin/java11/bin",
  [JdkVersionSource.JavaHome17]: "/opt/bin/java17/bin",
  [JdkVersionSource.JavaHome21]: "/opt/bin/java21/bin",
};

beforeEach(() => {
  jest
    .spyOn(tl, "getVariable")
    .mockImplementation((name: string) => MOCKED_JAVA_VARIABLES[name as JdkVersionSource]);
  jest.spyOn(tl, "setVariable");
  jest.spyOn(tl, "warning");
});

describe("JavaVersionResolver", () => {
  it.each([
    [EndpointType.Server, "9.9.0"],
    [EndpointType.Server, "10.4.0"],
    [EndpointType.Cloud, "8.0.0"],
  ])("should not have an effect if chosing JAVA_HOME", (endpointType, serverVersion) => {
    JavaVersionResolver.setJavaVersion(JdkVersionSource.JavaHome, endpointType, serverVersion);

    // Should not have changed the JAVA_HOME
    expect(tl.setVariable).not.toHaveBeenCalled();

    // Revert action has no effect as well
    JavaVersionResolver.revertJavaHomeToOriginal();
    expect(tl.setVariable).not.toHaveBeenCalled();
  });

  it.each([
    [EndpointType.Server, undefined, JdkVersionSource.JavaHome11, "/opt/bin/java11/bin"],
    [EndpointType.Server, "9.9.0", JdkVersionSource.JavaHome11, "/opt/bin/java11/bin"],
    [EndpointType.Server, "9.9.0", JdkVersionSource.JavaHome17, "/opt/bin/java17/bin"],
    [EndpointType.Server, "10.4", JdkVersionSource.JavaHome17, "/opt/bin/java17/bin"],
    [EndpointType.Server, "10.4", JdkVersionSource.JavaHome21, "/opt/bin/java21/bin"],
    [EndpointType.Cloud, "8.0.0", JdkVersionSource.JavaHome11, "/opt/bin/java11/bin"],
    [EndpointType.Cloud, "8.0.0", JdkVersionSource.JavaHome17, "/opt/bin/java17/bin"],
    [EndpointType.Cloud, "8.0.0", JdkVersionSource.JavaHome21, "/opt/bin/java21/bin"],
  ])(
    "should use specified java version if specified and it exists (%s, %s, %s, %s)",
    (endpointType, serverVersion, jdkVersion, path) => {
      JavaVersionResolver.setJavaVersion(jdkVersion, endpointType, serverVersion);

      expect(tl.setVariable).toHaveBeenLastCalledWith(TaskVariables.JavaHome, path);

      JavaVersionResolver.revertJavaHomeToOriginal();
      expect(tl.setVariable).toHaveBeenLastCalledWith(TaskVariables.JavaHome, "/opt/bin/java/bin");
    },
  );

  it.each([
    [EndpointType.Server, "10.4.0"],
    [EndpointType.Server, "10.5.0"],
  ])(
    `should use JAVA_HOME if the server does not support the specified Java 11 (%s, %s)`,
    (endpoint, version) => {
      jest.spyOn(tl, "setVariable").mockReset();

      JavaVersionResolver.setJavaVersion(JdkVersionSource.JavaHome11, endpoint, version);

      expect(tl.setVariable).not.toHaveBeenCalled();

      // Expect a warning to be logged at the task level
      expect(log).toHaveBeenCalledWith(LogLevel.WARN, expect.stringMatching(/Java 11/));

      JavaVersionResolver.revertJavaHomeToOriginal();
      expect(tl.setVariable).not.toHaveBeenCalled();
    },
  );
});
