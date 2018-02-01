import * as request from 'request';
import * as tl from 'vsts-task-lib/task';
import Endpoint from '../sonarqube/Endpoint';

interface RequestData {
  [x: string]: any;
}

export function getJSON(endpoint: Endpoint, path: string, query?: RequestData): Promise<any> {
  tl.debug(`[SQ] API GET: '${path}' with query "${JSON.stringify(query)}"`);
  return new Promise((resolve, reject) => {
    const options: request.CoreOptions = {
      auth: endpoint.auth
    };
    if (query) {
      options.qs = query;
      options.useQuerystring = true;
    }
    request.get(
      {
        method: 'GET',
        baseUrl: endpoint.url,
        uri: path,
        json: true,
        ...options
      },
      (error, response, body) => {
        if (error) {
          return reject(`[SQ] API GET '${path}' failed, error was: ${error}`);
        }
        tl.debug(`Response: ${response.statusCode} Body: "${body}"`);
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(
            new Error(`[SQ] API GET '${path}' failed, status code was: ${response.statusCode}`)
          );
        }
        return resolve(body || {});
      }
    );
  });
}
