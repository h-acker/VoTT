import React from "react";
import { AutoSizer, List } from "react-virtualized";
import { IAsset, AssetState, ISize } from "../../../../models/applicationState";
import { AssetPreview } from "../../common/assetPreview/assetPreview";
import { strings } from "../../../../common/strings";
import { IImageWithAction } from "../../../../services/apiService";

/**
 * Properties for Editor Side Bar
 * @member assets - Array of assets to be previewed
 * @member onAssetSelected - Function to call when asset from side bar is selected
 * @member selectedAsset - Asset initially selected
 * @member thumbnailSize - The size of the asset thumbnails
 */
export interface IEditorSideBarProps {
    assets: IAsset[];
    images: IImageWithAction[];
    onAssetSelected: (asset: IAsset) => void;
    onBeforeAssetSelected?: () => boolean;
    onSendButtonPressed: () => void;
    onDelButtonPressed: (isDeleted: boolean) => void;
    onValidateButtonPressed: (isValidated: boolean) => void;
    selectedAsset?: IAsset;
    thumbnailSize?: ISize;
    endpointType: number;
    isAdmin: boolean;
}

/**
 * State for Editor Side Bar
 * @member selectedAsset - Asset selected from side bar
 */
export interface IEditorSideBarState {
    scrollToIndex: number;
}

/**
 * @name - Editor Side Bar
 * @description - Side bar for editor page
 */
export default class EditorSideBar extends React.Component<IEditorSideBarProps, IEditorSideBarState> {
    public state: IEditorSideBarState = {
        scrollToIndex: this.props.selectedAsset
            ? this.props.assets.findIndex(asset => asset.id === this.props.selectedAsset.id)
            : 0
    };

    private listRef: React.RefObject<List> = React.createRef();

    public render() {
        return (
            <div className="editor-page-sidebar-nav">
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            ref={this.listRef}
                            className="asset-list"
                            height={height}
                            width={width}
                            rowCount={this.props.assets.length}
                            rowHeight={() => this.getRowHeight(width)}
                            rowRenderer={this.rowRenderer}
                            overscanRowCount={2}
                            scrollToIndex={this.state.scrollToIndex}
                        />
                    )}
                </AutoSizer>
            </div>
        );
    }

    public componentDidUpdate(prevProps: IEditorSideBarProps) {
        if (prevProps.thumbnailSize !== this.props.thumbnailSize) {
            this.listRef.current.recomputeRowHeights();
        }

        if (!prevProps.selectedAsset && !this.props.selectedAsset) {
            return;
        }

        if (
            (!prevProps.selectedAsset && this.props.selectedAsset) ||
            prevProps.selectedAsset.id !== this.props.selectedAsset.id
        ) {
            this.selectAsset(this.props.selectedAsset);
        }
    }

    private getRowHeight = (width: number) => {
        return width / (4 / 3) + 16;
    };

    private selectAsset = (selectedAsset: IAsset): void => {
        const scrollToIndex = this.props.assets.findIndex(asset => asset.id === selectedAsset.id);

        this.setState(
            {
                scrollToIndex
            },
            () => {
                this.listRef.current.forceUpdateGrid();
            }
        );
    };

    private onAssetClicked = (asset: IAsset): void => {
        if (this.props.onBeforeAssetSelected) {
            if (!this.props.onBeforeAssetSelected()) {
                return;
            }
        }

        this.selectAsset(asset);
        this.props.onAssetSelected(asset);
    };

    private rowRenderer = ({ key, index, style }): JSX.Element => {
        const asset = this.props.assets[index];
        const image = this.props.images.filter(image => image.basename === asset.name)[0];
        const selectedAsset = this.props.selectedAsset;

        return (
            <div
                key={key}
                style={style}
                className={this.getAssetCssClassNames(asset, selectedAsset)}
                onClick={() => this.onAssetClicked(asset)}
            >
                <div className="asset-item-image">
                    {this.renderBadges(asset)}
                    {image && this.props.isAdmin === true && this.renderBadgesFromImageState(image)}
                    <AssetPreview asset={asset} />
                    {image && this.renderButtons(asset)}
                </div>
                <div className="asset-item-metadata">
                    <span className="asset-filename" title={asset.name}>
                        {asset.name}
                    </span>
                    {asset.size && (
                        <span>
                            {asset.size.width} x {asset.size.height}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    private renderBadges = (asset: IAsset): JSX.Element => {
        switch (asset.state) {
            case AssetState.Tagged:
                return (
                    <span title={strings.editorPage.tagged} className="badge badge-tagged">
                        <i className="fas fa-tag"></i>
                    </span>
                );
            case AssetState.Visited:
                return (
                    <span title={strings.editorPage.visited} className="badge badge-visited">
                        <i className="fas fa-eye"></i>
                    </span>
                );
            default:
                return null;
        }
    };

    private renderBadgesFromImageState = (image: IImageWithAction): JSX.Element => {
        return (
            <>
                <button
                    className={image.is_deleted ? "badge badge-deleted" : "badge badge-deleted badge-off"}
                    onClick={async () => {
                        if (!image.is_deleted && image.is_validated) {
                            await this.props.onDelButtonPressed(true);
                            await this.props.onValidateButtonPressed(false);
                        } else {
                            await this.props.onDelButtonPressed(!image.is_deleted);
                        }
                    }}
                >
                    <i className="far fa-trash-alt"></i>
                </button>
                <button className={image.is_validated ? "badge badge-validated" : "badge badge-validated badge-off"}>
                    <i
                        className="far fa-check-circle"
                        onClick={async () => {
                            if (!image.is_validated && image.is_deleted) {
                                await this.props.onDelButtonPressed(false);
                                await this.props.onValidateButtonPressed(true);
                            } else {
                                await this.props.onValidateButtonPressed(!image.is_validated);
                            }
                        }}
                    ></i>
                </button>
            </>
        );
    };

    private renderButtons = (asset: IAsset): JSX.Element => {
        return (
            <>
                <button className={"badge badge-button-send"} onClick={this.props.onSendButtonPressed}>
                    send
                </button>
            </>
        );
    };

    private getAssetCssClassNames = (asset: IAsset, selectedAsset: IAsset = null): string => {
        const cssClasses = ["asset-item"];
        if (selectedAsset && selectedAsset.id === asset.id) {
            cssClasses.push("selected");
        }

        return cssClasses.join(" ");
    };
}
