import axios, { AxiosInstance, AxiosPromise } from "axios";
import qs from "qs";
import { Env } from "../common/environment";
import { ITrackingAction } from "../models/trackingAction";
import { mapTrackingActionToApiBody } from "./ApiMapper";
import { Api } from "./ApiEnum";
import { IRegion, ISize, PlatformMode } from "../models/applicationState";

export interface ILoginRequestPayload {
    username: string;
    password: string;
}

export interface IApiService {
    loginWithCredentials(data: ILoginRequestPayload): AxiosPromise<IUserCredentials>;
    testToken(): AxiosPromise<IUser>;
    getCurrentUser(): AxiosPromise<IUser>;
    createAction(action: ITrackingAction): AxiosPromise<IActionResponse>;
}

interface IUserCredentials {
    access_token: string;
    token_type: string;
}

export interface IActionRequest {
    type: string;
    timestamp?: string;
    regions: IRegion[];
    is_modified: boolean;
    user_id: number;
    image_basename: string;
}

interface IActionResponse extends IActionRequest {
    id: number;
}

interface IUser {
    email: string;
    full_name: string;
    is_active: boolean;
    is_superuser: boolean;
    city_id: number;
    id: number;
    created_at: string;
    updated_at: string;
}

interface IUserttings {
    id: number;
    filter_path: string;
    user_id: number;
    vott_mode: PlatformMode;
}

export interface IImage {
    path: string;
    size: ISize;
    predicted: boolean;
    type: number;
    state: number;
    is_deleted: boolean;
    is_validated: boolean;
    tagger_id: number;
    basename: string;
}

export interface ILitter {
    id: number;
    color: string;
}

export interface IImageWithAction extends IImage {
    last_action: IActionRequest;
}

export class ApiService implements IApiService {
    private client: AxiosInstance;
    constructor() {
        this.client = axios.create({
            baseURL: Env.getApiUrl(),
            timeout: 10 * 1000,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        this.client.interceptors.request.use(
            config => {
                if (localStorage.getItem("auth")) {
                    const token = JSON.parse(localStorage.getItem("auth")).accessToken;
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                }
                return config;
            },
            error => Promise.reject(error)
        );
    }

    public loginWithCredentials = (data: ILoginRequestPayload): AxiosPromise<IUserCredentials> => {
        return this.client.post(Api.LoginAccessToken, qs.stringify(data));
    };

    public testToken = (): AxiosPromise<IUser> => {
        return this.client.post(Api.LoginTestToken);
    };

    public getCurrentUser = (): AxiosPromise<IUser> => {
        return this.client.get(Api.UsersMe);
    };

    public getUserSettings = (): AxiosPromise<IUserttings> => {
        return this.client.get(Api.UsersSettings);
    };

    public createAction = (action: ITrackingAction): AxiosPromise<IActionResponse> => {
        return this.client.post(Api.Actions, mapTrackingActionToApiBody(action));
    };

    public getImagesFromDispatcher = (limit: number = 20): AxiosPromise<IImageWithAction[]> => {
        return this.client.put(`${Api.DispatcherImages}?limit=${limit}`, { limit });
    };

    public getImagesForQualityControl = (limit: number = 20): AxiosPromise<IImageWithAction[]> => {
        return this.client.put(`${Api.QualityControl}?limit=${limit}`, []);
    };

    public buildIdl = (imageNames: string[]): AxiosPromise<IImageWithAction[]> => {
        return this.client.put(`${Api.BuildIdl}`, imageNames);
    };

    public validateImage = (isValidated: boolean, imageBasename: string): AxiosPromise<IImageWithAction> => {
        return this.client.put(`${Api.ValidateImage}/${imageBasename}?is_validated=${isValidated}`);
    };

    public deleteImage = (isDeleted: boolean, imageBasename: string): AxiosPromise<IImageWithAction> => {
        return this.client.put(`${Api.DeleteImage}/${imageBasename}?is_deleted=${isDeleted}`);
    };

    public getImageWithLastAction = (): AxiosPromise<IImageWithAction[]> => {
        return this.client.get(Api.ImagesWithLastAction);
    };

    public getLitters = (data: number[] = []): AxiosPromise<ILitter[]> => {
        return this.client.post(Api.Litters, data);
    };
}

const apiService = new ApiService();

export default apiService;
