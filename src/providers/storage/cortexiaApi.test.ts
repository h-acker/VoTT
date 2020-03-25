import { AssetService } from "../../services/assetService";
jest.mock("../../services/assetService");
import { AssetType } from "../../models/applicationState";
import { CortexiaApi } from "./cortexiaApi";
import { appInfo } from "../../common/appInfo";
jest.mock("../../services/apiService");

import { store } from "../../redux/store/store";
import { path } from "snapsvg";
jest.mock("../../redux/store/store");

describe("Cortexia Api", () => {
    const mockState = {
        currentProject: {
            images: [
                {
                    path: "path",
                    size: null,
                    predicted: false,
                    type: 1,
                    state: 0,
                    is_deleted: false,
                    tagger_id: 0,
                    basename: "name",
                    last_action: {
                        type: 1,
                        timestamp: "",
                        regions: {},
                        is_modified: false,
                        user_id: 0,
                        image_basename: "basename"
                    },
                    name: "path"
                }
            ]
        }
    };

    it("reads text from asset metadata received by api", async () => {
        const responseObject = {
            path: "path",
            basename: "name",
            last_action: {
                regions: {},
                image_basename: "basename"
            }
        };
        store.getState = () => mockState;
        const apiResponeMock = [
            { ...responseObject },
            { ...responseObject, basename: "test1" },
            { ...responseObject, basename: "test2" }
        ];
        AssetService.createAssetFromFilePath = jest.fn(() => ({ type: AssetType.Image }));
        const provider: CortexiaApi = new CortexiaApi();
        const content = await provider.readText("name");
        const stringifiedAssetMetadata = JSON.stringify({
            regions: apiResponeMock[1].last_action.regions,
            asset: AssetService.createAssetFromFilePath("filepath", "test1"),
            version: appInfo.version
        });
        expect(content).toEqual(stringifiedAssetMetadata);
    });

    describe("getAssets", () => {
        const mockState = {
            currentProject: {
                images: [
                    {
                        path: "path",
                        size: null,
                        predicted: false,
                        type: 1,
                        state: 0,
                        is_deleted: false,
                        tagger_id: 1,
                        basename: "",
                        last_action: {
                            type: 1,
                            timestamp: "",
                            regions: {},
                            is_modified: false,
                            user_id: 0,
                            image_basename: "basename"
                        },
                        name: "path"
                    },
                    {
                        path: "path",
                        size: null,
                        predicted: false,
                        type: 1,
                        state: 0,
                        is_deleted: false,
                        tagger_id: 1,
                        basename: "",
                        last_action: {
                            type: 1,
                            timestamp: "",
                            regions: {},
                            is_modified: false,
                            user_id: 0,
                            image_basename: "basename"
                        },
                        name: "path"
                    }
                ]
            }
        };

        const userImage = {
            path: "path",
            size: {},
            predicted: false,
            type: 1,
            state: 1,
            is_deleted: true,
            tagger_id: 1,
            basename: "basename"
        };

        it("does not return assets with wrong file type", async () => {
            store.getState = () => mockState;
            const assetsMock = [userImage, { ...userImage, path: "otherpath" }];
            AssetService.createAssetFromFilePath = jest.fn((url, fileName) => ({
                type: url === "path" ? AssetType.Image : AssetType.Unknown,
                path: url,
                name: ""
            }));
            const provider: CortexiaApi = new CortexiaApi();
            const content = await provider.getAssets();
            const imageAsset = assetsMock[0];
            const assetsTypeImage = [
                AssetService.createAssetFromFilePath(imageAsset.path, imageAsset.path),
                AssetService.createAssetFromFilePath(imageAsset.path, imageAsset.path)
            ];
            expect(content).toEqual(assetsTypeImage);
        });
    });
});
