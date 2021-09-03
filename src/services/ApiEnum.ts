export enum Api {
    Actions = "/api/v1/actions/",
    ActionsMe = "/api/v1/actions/me",
    UsersMe = "/api/v1/users/me",
    UsersSettings = "/api/v1/settings/me",
    LoginTestToken = "/api/v1/login/test-token",
    LoginAccessToken = "/api/v1/login/access-token",
    DispatcherImages = "/api/v1/dispatcher/images",
    BuildIdl = "/api/v1/dispatcher/build_idl",
    QualityControl = "/api/v1/dispatcher/quality_control",
    ImagesWithLastAction = "/api/v1/images/with_last_action",
    Litters = "/api/v1/litter/",
    ValidateImage = "/api/v1/images/validate/",
    DeleteImage = "/api/v1/images/flag_delete/"
}
