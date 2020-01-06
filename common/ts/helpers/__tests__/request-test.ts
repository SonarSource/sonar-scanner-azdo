import * as tl from 'azure-pipelines-task-lib/task';
import * as request from '../request';

describe('logAndReject', () => {
  it('should log error message', () => {
    const errMessage = 'this is the error message';

    jest.spyOn(tl, 'debug').mockImplementation(() => null);

    const actual = request.logAndReject(error => {
      return error.message;
    }, errMessage);

    expect(tl.debug).toHaveBeenCalledWith(errMessage);
    expect(actual).toBe(errMessage);
  });
});
