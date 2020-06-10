import { Dispatch } from "redux";
import { createPayloadAction, IPayloadAction } from "./actionCreators";
import { ActionTypes } from "./actionTypes";
import { ITrackingAction, TrackingActionType, createTrackingAction, TrackingAction } from "../../models/trackingAction";
import { IRegion } from "../../models/applicationState";
import apiService from "../../services/apiService";

/**
 * Actions which manage tracking
 * @member trackingSignIn - Tracks user signs in to the app
 * @member trackingSignOut - Tracks user signs out from the app
 * @member trackingImgIn - Tracks user enters on the image
 * @member trackingImgValidate - Tracks user leaves the image
 * @member trackingImgDelete - Tracks user deletes the image
 */
export default interface ITrackingActions {
    trackingSignIn(userId: number): Promise<void>;
    trackingSignOut(userId: number): Promise<void>;
    trackingImgIn(userId: number, imageBasename: string, regions: IRegion[]): Promise<void>;
    trackingImgValidate(
        userId: number,
        imageBasename: string,
        regions: IRegion[],
        isModified: boolean
    ): Promise<TrackingAction>;
    trackingImgDelete(userId: number, imageBasename: string): Promise<void>;
}

/**
 * Tracks user signs in to the application
 */
export function trackingSignIn(userId: number): (dispatch: Dispatch) => Promise<void> {
    return async (dispatch: Dispatch) => {
        const trackingAction = createTrackingAction(TrackingActionType.SignIn, userId);
        try {
            await apiService.createAction(trackingAction);
            dispatch(trackingSignInAction(trackingAction));
            return Promise.resolve();
        } catch {
            return Promise.reject();
        }
    };
}

/**
 * Tracks user signs out from the application
 */
export function trackingSignOut(userId: number): (dispatch: Dispatch) => Promise<void> {
    return async (dispatch: Dispatch) => {
        const trackingAction = createTrackingAction(TrackingActionType.SignOut, userId);
        try {
            await apiService.createAction(trackingAction);
            dispatch(trackingSignOutAction(trackingAction));
            return Promise.resolve();
        } catch {
            return Promise.reject();
        }
    };
}

/**
 * Tracks user enters on the image
 */
export function trackingImgIn(
    userId: number,
    imageBasename: string,
    regions: IRegion[]
): (dispatch: Dispatch) => Promise<void> {
    return async (dispatch: Dispatch) => {
        const trackingAction = createTrackingAction(TrackingActionType.ImgIn, userId, imageBasename, regions);
        try {
            await apiService.createAction(trackingAction);
            dispatch(trackingImgInAction(trackingAction));
            return Promise.resolve();
        } catch {
            return Promise.reject();
        }
    };
}

/**
 * Tracks user leaves the image
 */
export function trackingImgValidate(
    userId: number,
    imageBasename: string,
    regions: IRegion[],
    isModified: boolean
): (dispatch: Dispatch) => Promise<TrackingAction> {
    return async (dispatch: Dispatch) => {
        const trackingAction = createTrackingAction(
            TrackingActionType.ImgValidate,
            userId,
            imageBasename,
            regions,
            isModified
        );
        try {
            await apiService.createAction(trackingAction);
            dispatch(trackingImgValidateAction(trackingAction));
            return Promise.resolve(trackingAction);
        } catch {
            return Promise.reject();
        }
    };
}

/**
 * Tracks user deletes the image
 */
export function trackingImgDelete(userId: number, imageBasename: string): (dispatch: Dispatch) => Promise<void> {
    return async (dispatch: Dispatch) => {
        const trackingAction = createTrackingAction(TrackingActionType.ImgDelete, userId, imageBasename, [], true);
        try {
            await apiService.createAction(trackingAction);
            dispatch(trackingImgDeleteAction(trackingAction));
            return Promise.resolve();
        } catch {
            return Promise.reject();
        }
    };
}

export interface ITrackingSignInAction extends IPayloadAction<string, ITrackingAction> {
    type: ActionTypes.TRACK_SIGN_IN_SUCCESS;
}

export interface ITrackingSignOutAction extends IPayloadAction<string, ITrackingAction> {
    type: ActionTypes.TRACK_SIGN_OUT_SUCCESS;
}

export interface ITrackingImgInAction extends IPayloadAction<string, ITrackingAction> {
    type: ActionTypes.TRACK_IMG_IN_SUCCESS;
}

export interface ITrackingImgValidateAction extends IPayloadAction<string, ITrackingAction> {
    type: ActionTypes.TRACK_IMG_VALIDATE_SUCCESS;
}

export interface ITrackingImgDeleteAction extends IPayloadAction<string, ITrackingAction> {
    type: ActionTypes.TRACK_IMG_DELETE_SUCCESS;
}

export const trackingSignInAction = createPayloadAction<ITrackingSignInAction>(ActionTypes.TRACK_SIGN_IN_SUCCESS);
export const trackingSignOutAction = createPayloadAction<ITrackingSignOutAction>(ActionTypes.TRACK_SIGN_OUT_SUCCESS);
export const trackingImgInAction = createPayloadAction<ITrackingImgInAction>(ActionTypes.TRACK_IMG_IN_SUCCESS);
export const trackingImgValidateAction = createPayloadAction<ITrackingImgValidateAction>(ActionTypes.TRACK_IMG_VALIDATE_SUCCESS);
export const trackingImgDeleteAction = createPayloadAction<ITrackingImgDeleteAction>(
    ActionTypes.TRACK_IMG_DELETE_SUCCESS
);
