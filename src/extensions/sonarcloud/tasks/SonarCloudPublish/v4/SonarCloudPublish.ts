import { EndpointType, publishTask, runTask } from "../../../../../common/latest";

runTask(publishTask, "Publish", EndpointType.Cloud);
