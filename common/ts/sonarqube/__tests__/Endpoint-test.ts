import Endpoint, { EndpointType } from '../Endpoint';

// VSTS-134
it('should not return null password', () => {
  const enpoint = new Endpoint(EndpointType.SonarQube, {
    url: 'http://foo',
    token: null,
    username: 'token123',
    password: null,
    organization: null
  });
  expect(enpoint.auth).toEqual({ user: 'token123' });
});
