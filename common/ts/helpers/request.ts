import * as semver from "semver";
import * as tl from "azure-pipelines-task-lib/task";
import fetch from 'node-fetch'
import Endpoint from "../sonarqube/Endpoint";

interface RequestData {
  [x: string]: any;
}

const parseJson = async response => {
  const text = await response.text()
  try{
    const json = JSON.parse(text)
    return json
  } catch(err) {
    return text
  }
}

export function get(endpoint: Endpoint, path: string, query?: RequestData): Promise<any> {
  tl.debug(`[SQ] API GET: '${path}' with query "${JSON.stringify(query)}"`);
  let url = endpoint.url + path;
  const headers = {}

  if (query) {
    const params = new URLSearchParams(query)
    url = url + '?' + params
  }

  if (endpoint.auth) {
    headers["Authorization"] = `Basic: ${btoa(endpoint.auth.user + ':' + endpoint.auth.pass)}`
  }

  return fetch(url, {
    method: 'GET',
    headers
  })
    .then((response) => {
      tl.debug(`Response: ${response.status}`);

      return parseJson(response)
    })
    .then((data) => {
      tl.debug(`Response Data: ${data}`);

      return data
    })
    .catch((error) => {
      if (error.response) {
        tl.debug(`[SQ] API GET '${path}' failed, status code was: ${error.response.status}`);
      } else {
        tl.debug(`[SQ] API GET '${path}' failed, error is ${error.message}`);
      }
      throw new Error(`[SQ] API GET '${path}' failed, error is ${error.message}`);
    });
}

export function getServerVersion(endpoint: Endpoint): Promise<semver.SemVer> {
  return get(endpoint, "/api/server/version").then(semver.coerce);
}
