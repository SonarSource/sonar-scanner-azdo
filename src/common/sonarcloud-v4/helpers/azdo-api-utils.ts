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

import * as vm from "azure-devops-node-api";
import {
  JsonPatchDocument,
  JsonPatchOperation,
  Operation,
} from "azure-devops-node-api/interfaces/common/VSSInterfaces";
import * as tl from "azure-pipelines-task-lib/task";
import { log, LogLevel } from "./logging";

export interface IPropertyBag {
  propertyName: string;
  propertyValue: string;
}

export async function addBuildProperty(properties: IPropertyBag[]) {
  const collectionUri = tl.getVariable("System.TeamFoundationCollectionUri") + "/";
  const teamProjectId = tl.getVariable("System.TeamProjectId") + "/";
  const buildId = tl.getVariable("Build.BuildId") as string;

  const patchBody: JsonPatchOperation[] = [];

  properties.forEach((property: IPropertyBag) => {
    patchBody.push({
      op: Operation.Add,
      path: `/${property.propertyName}`,
      value: `${property.propertyValue}`,
    });
  });

  log(LogLevel.DEBUG, `Adding build property: ${JSON.stringify(patchBody)}`);

  const customHeader = { Authorization: `Bearer ${getAuthToken()}` };

  const azdoWebApi = getWebApi(collectionUri);
  const jsonPatchBody: JsonPatchDocument[] = patchBody;

  try {
    log(LogLevel.DEBUG, "Acquiring a build API object.");
    const buildApi = await azdoWebApi.getBuildApi();
    log(LogLevel.DEBUG, "Creating a new build property with global Quality Gate Status");
    await buildApi.updateBuildProperties(customHeader, jsonPatchBody, teamProjectId, +buildId);
  } catch (exception) {
    log(
      LogLevel.WARN,
      "Failed to create a build property. Not blocking unless you are using the Sonar Pre-Deployment gate in Release Pipelines. Exception : " +
        exception,
    );
  }
}

export function getWebApi(collectionUrl: string): vm.WebApi {
  const accessToken = getAuthToken();
  const credentialHandler = vm.getBearerHandler(accessToken);
  return new vm.WebApi(collectionUrl, credentialHandler);
}

export function getAuthToken() {
  const auth = tl.getEndpointAuthorization("SYSTEMVSSCONNECTION", false);
  if (auth?.scheme.toLowerCase() === "oauth") {
    return auth.parameters["AccessToken"];
  } else {
    throw new Error("Unable to get credential to perform rest API calls");
  }
}

export function parseScannerExtraProperties(): { [key: string]: string } {
  const props: { [key: string]: string } = {};
  tl.getDelimitedInput("extraProperties", "\n")
    .filter((keyValue) => !keyValue.startsWith("#"))
    .map((keyValue) => keyValue.split(/=(.+)/))
    .forEach(([k, v]) => (props[k] = v));
  return props;
}
