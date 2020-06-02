import { IStorageProvider } from "./storageProviderFactory";
import { StorageType, IAsset, AssetType, IAssetMetadata, IRegion } from "../../models/applicationState";
import { AssetService } from "../../services/assetService";
import { IImageWithAction } from "../../services/apiService";
import { appInfo } from "../../common/appInfo";
import { store } from "../../redux/store/store";

export class CortexiaApi implements IStorageProvider {
    /**
     * Storage type
     * @returns - StorageType.Cloud
     */
    public storageType: StorageType = StorageType.Cloud;

    /**
     * @description - Gets images with the provider and returns stringified asset metadata.
     * @param filePath
     */
    public async readText(basename: string): Promise<string> {
        const appStore = store.getState();
        const images = appStore.currentProject.images;
        const currentImage = images.find((item: IImageWithAction) => item.basename === basename);
        const asset = AssetService.createAssetFromFilePath(currentImage.path, this.getFileName(currentImage.path));
        return Promise.resolve(JSON.stringify(this.createAssetMetadata(currentImage.last_action.regions, asset)));
    }

    /**
     * @description - It reads buffer from the stringified asset metadata
     * @param filePath
     */
    public async readBinary(filePath: string): Promise<Buffer> {
        const text = await this.readText(filePath);
        return Buffer.from(text);
    }

    /**
     * @description - Function is not implemented, because currently is not needed in the provider.
     * Function is required by IStorageProvider interface.
     * @param filePath
     */
    public deleteFile(filePath: string): Promise<void> {
        return Promise.resolve();
    }

    /**
     * @description - Function is not implemented, because currently is not needed in the provider.
     * Function is required by IStorageProvider interface.
     * @param filePath
     * @param contents
     */
    public async writeText(filePath: string, contents: string): Promise<void> {
        // Nothing to do there
    }

    /**
     * @description - Function is not implemented, because currently is not needed in the provider.
     * Function is required by IStorageProvider interface.
     * @param filePath
     * @param contents
     */
    public writeBinary(filePath: string, contents: Buffer): Promise<void> {
        return Promise.resolve();
    }

    /**
     * @description - Function is not implemented, because currently is not needed in the provider.
     * Function is required by IStorageProvider interface.
     * @param folderPath
     * @param ext
     */
    public listFiles(folderPath?: string, ext?: string): Promise<string[]> {
        return Promise.resolve(["Not used"]);
    }

    /**
     * @description - Function is not implemented, because currently is not needed in the provider.
     * Function is required by IStorageProvider interface.
     * @param folderPath
     */
    public listContainers(folderPath?: string): Promise<string[]> {
        return Promise.resolve(["Not used"]);
    }

    /**
     * @description - Function is not implemented, because currently is not needed in the provider.
     * Function is required by IStorageProvider interface.
     * @param folderPath
     */
    public createContainer(folderPath: string): Promise<void> {
        return Promise.resolve();
    }

    /**
     * @description - Function is not implemented, because currently is not needed in the provider.
     * Function is required by IStorageProvider interface.
     * @param folderPath
     */
    public deleteContainer(folderPath: string): Promise<void> {
        return Promise.resolve();
    }

    /**
     * @description - Function is not implemented, because currently is not needed in the provider.
     * Function is required by IStorageProvider interface.
     */
    public initialize(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * @description - It gets assets from the provider.
     * @param containerName - It's not required as our provider doesn't use containers.
     */
    public async getAssets(containerName?: string): Promise<IAsset[]> {
        const appStore = store.getState();
        const images = appStore.currentProject.images;
        const result: IAsset[] = [];
        images.map((image: IImageWithAction) => {
            const url = image.path;
            const asset = AssetService.createAssetFromFilePath(url, image.basename);
            if (asset.type !== AssetType.Unknown) {
                result.push(asset);
            }
        });
        return result;
    }

    private getFileName(url: string) {
        const pathParts = url.split("/");
        return pathParts[pathParts.length - 1].split("?")[0];
    }

    private createAssetMetadata(regions: IRegion[], asset: IAsset): IAssetMetadata {
        return {
            regions,
            asset,
            version: appInfo.version
        };
    }
}
