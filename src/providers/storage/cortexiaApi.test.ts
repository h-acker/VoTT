import registerProviders from "../../registerProviders";
import { AssetService } from "../../services/assetService";
jest.mock("../../services/assetService");
import { AssetType } from "../../models/applicationState";
import ApiService from "../../services/apiService";
import { CortexiaApi } from "./cortexiaApi";
import { appInfo } from "../../common/appInfo";
jest.mock("../../services/apiService");

describe("Cortexia Api", () => {
    registerProviders();

    it("reads text from asset metadata received by api", async () => {
        const responseObject = {
            path: "path",
            id: 0,
            last_action: {
                regions: {}
            }
        };
        const apiResponeMock = [{ ...responseObject }, { ...responseObject, id: 1 }, { ...responseObject, id: 2 }];
        AssetService.createAssetFromFilePath = jest.fn(() => ({ type: AssetType.Image }));
        jest.spyOn(ApiService, "getImageWithLastAction").mockImplementationOnce(() =>
            Promise.resolve({
                data: apiResponeMock
            })
        );
        const provider: CortexiaApi = new CortexiaApi();
        const content = await provider.readText("1");
        const stringifiedAssetMetadata = JSON.stringify({
            regions: apiResponeMock[1].last_action.regions,
            asset: AssetService.createAssetFromFilePath(""),
            version: appInfo.version
        });
        expect(content).toEqual(stringifiedAssetMetadata);
    });

    describe("getAssets", () => {
        const userImage = {
            path: "path",
            size: {},
            predicted: false,
            type: 1,
            state: 1,
            is_deleted: true,
            tagger_id: 1,
            id: 1
        };

        it("does not return assets with wrong file type", async () => {
            const assetsMock = [userImage, { ...userImage, id: 2 }];
            AssetService.createAssetFromFilePath = jest.fn((url, fileName, id) => ({
                type: id !== 1 ? AssetType.Image : AssetType.Unknown,
                id,
                path: url,
                name: fileName
            }));
            jest.spyOn(ApiService, "getUserImages").mockImplementationOnce(() =>
                Promise.resolve({
                    data: assetsMock
                })
            );
            const provider: CortexiaApi = new CortexiaApi();
            const content = await provider.getAssets();
            const imageAsset = assetsMock[1];
            const assetsTypeImage = [
                AssetService.createAssetFromFilePath(imageAsset.path, imageAsset.path, imageAsset.id)
            ];
            expect(content).toEqual(assetsTypeImage);
        });
    });
});
