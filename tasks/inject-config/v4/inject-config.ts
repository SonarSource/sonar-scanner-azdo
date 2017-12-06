import * as tl from 'vsts-task-lib/task';
import * as trm from 'vsts-task-lib/toolrunner';

// TODO Move all this in a shared module

const HOST_URL_PROP = 'sonar.host.url';
const LOGIN_PROP = 'sonar.login';
const PASSSWORD_PROP = 'sonar.password';
const ORG_PROP = 'sonar.organization';
const PROJECTKEY_PROP = 'sonar.projectKey';
const PROJECTNAME_PROP = 'sonar.projectName';
const PROJECTVERSION_PROP = 'sonar.projectVersion';

enum EndpointType {
    SonarCloud,
    SonarQube
}

function toJson(props: Map<string, string>) {
    return JSON.stringify(
        Array.from(props.entries()).reduce((o, [key, value]) => {
            o[key] = value;
            return o;
        }, {})
    );
}

function setIfNotEmpty(props: Map<string, string>, key: string, value: string) {
    if (value) {
        props.set(key, value);
    }
}

// end of shared stuff

async function run() {
    try {
        const props = new Map<string, string>();
        const endpointType: EndpointType = EndpointType[tl.getInput('endpointType', true)];
        switch (endpointType) {
            case EndpointType.SonarCloud:
                const sonarCloudEP: string = tl.getInput('SonarCloud', true);
                props.set(HOST_URL_PROP, tl.getEndpointUrl(sonarCloudEP, false));
                props.set(
                    LOGIN_PROP,
                    tl.getEndpointAuthorizationParameter(sonarCloudEP, 'apitoken', false)
                );
                props.set(ORG_PROP, tl.getInput('organization', true));
                break;
            case EndpointType.SonarQube:
                const sonarQubeEP: string = tl.getInput('SonarQube', true);
                props.set(HOST_URL_PROP, tl.getEndpointUrl(sonarQubeEP, false));
                setIfNotEmpty(
                    props,
                    LOGIN_PROP,
                    tl.getEndpointAuthorizationParameter(sonarQubeEP, 'username', true)
                );
                setIfNotEmpty(
                    props,
                    PASSSWORD_PROP,
                    tl.getEndpointAuthorizationParameter(sonarQubeEP, 'password', true)
                );
                break;
            default:
                throw new Error('Unknown endpoint type: ' + endpointType);
        }

        setIfNotEmpty(props, PROJECTKEY_PROP, tl.getInput('projectKey'));
        setIfNotEmpty(props, PROJECTNAME_PROP, tl.getInput('projectName'));
        setIfNotEmpty(props, PROJECTVERSION_PROP, tl.getInput('projectVersion'));
        tl
            .getDelimitedInput('extraProperties', '\n')
            .map(keyValue => keyValue.split(/=(.+)/))
            .forEach(([k, v]) => {
                props.set(k, v);
            });

        const json = toJson(props);
        tl.setVariable('SONARQUBE_SCANNER_PARAMS', json);
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
