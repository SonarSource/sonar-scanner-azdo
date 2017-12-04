import * as tl from 'vsts-task-lib/task';
import * as trm from 'vsts-task-lib/toolrunner';

async function run() {
    try {
        console.log('Task done! ');
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();