import { Env } from "./common/environment";
import { Action } from "redux";
import { IAppError } from "./models/applicationState";
import { config } from "dotenv";

// vott-app-insights
config();

let debug = false;
let maxBatchSize = 250;

if (Env.get() !== "production") {
    // for development/testing
    // myho-appinsights
    debug = true;
    maxBatchSize = 0; // send telemetry as soon as it's collected
}

/**
 * create an app insights connection for web version
 * do nothing for electron mode
 */
export function setUpAppInsights() {
    return;
}

/**
 * send exception event to AppInsights
 * @param appError object containing the error type and error message
 */
export function trackError(appError: IAppError): void {
    return;
}

/**
 * send custom event tracking redux action
 * @param action a redux action
 */
export function trackReduxAction(action: Action): void {
    return;
}
