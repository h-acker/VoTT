import _ from "lodash";
import React, { RefObject } from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import SplitPane from "react-split-pane";
import { bindActionCreators } from "redux";
import { SelectionMode } from "vott-ct/lib/js/CanvasTools/Interface/ISelectorSettings";
import HtmlFileReader from "../../../../common/htmlFileReader";
import { strings } from "../../../../common/strings";
import {
    AssetState,
    AssetType,
    EditorMode,
    IApplicationState,
    IAppSettings,
    IAsset,
    IAssetMetadata,
    IProject,
    IRegion,
    ISize,
    ITag,
    IAdditionalPageSettings,
    AppError,
    ErrorCode,
    IAuth,
    PlatformMode
} from "../../../../models/applicationState";
import { IToolbarItemRegistration, ToolbarItemFactory } from "../../../../providers/toolbar/toolbarItemFactory";
import IApplicationActions, * as applicationActions from "../../../../redux/actions/applicationActions";
import IProjectActions, * as projectActions from "../../../../redux/actions/projectActions";
import { ToolbarItemName } from "../../../../registerToolbar";
import { AssetService } from "../../../../services/assetService";
import { AssetPreview } from "../../common/assetPreview/assetPreview";
import { KeyboardBinding } from "../../common/keyboardBinding/keyboardBinding";
import { KeyEventType } from "../../common/keyboardManager/keyboardManager";
import { TagInput, buildTagsWithId } from "../../common/tagInput/tagInput";
import { ToolbarItem } from "../../toolbar/toolbarItem";
import Canvas from "./canvas";
import "./editorPage.scss";
import EditorSideBar from "./editorSideBar";
import { EditorToolbar } from "./editorToolbar";
import Alert from "../../common/alert/alert";
import Confirm from "../../common/confirm/confirm";
import { ActiveLearningService } from "../../../../services/activeLearningService";
import { toast } from "react-toastify";
import { TrackingActionType } from "../../../../models/trackingAction";
import ITrackingActions, * as trackingActions from "../../../../redux/actions/trackingActions";
import { MagnifierModalMessage } from "./MagnifierModalMessage";
import apiService, { IActionRequest, ILitter, IImageWithAction } from "../../../../services/apiService";
import CanvasHelpers from "./canvasHelpers";

/**
 * Properties for Editor Page
 * @member project - Project being edited
 * @member recentProjects - Array of projects recently viewed/edited
 * @member appSettings - Settings of the application
 * @member actions - Project actions
 * @member applicationActions - Application setting actions
 * @member auth - Authentication of the user
 * @member trackingActions - Tracking of user actions
 */
export interface IEditorPageProps extends RouteComponentProps, React.Props<EditorPage> {
    project: IProject;
    recentProjects: IProject[];
    appSettings: IAppSettings;
    actions: IProjectActions;
    applicationActions: IApplicationActions;
    auth: IAuth;
    trackingActions: ITrackingActions;
}

export const EnpointType = {
    REGULAR: 0,
    ADMIN: 1
};

/**
 * State for Editor Page
 */
export interface IEditorPageState {
    /** Array of assets in project */
    assets: IAsset[];
    /** The editor mode to set for canvas tools */
    editorMode: EditorMode;
    /** The selection mode to set for canvas tools */
    selectionMode: SelectionMode;
    /** The selected asset for the primary editing experience */
    selectedAsset?: IAssetMetadata;
    /** Currently selected region on current asset */
    selectedRegions?: IRegion[];
    /** The child assets used for nest asset typs */
    childAssets?: IAsset[];
    /** Additional settings for asset previews */
    additionalSettings?: IAdditionalPageSettings;
    /** Most recently selected tag */
    selectedTag: string;
    /** Tags locked for region labeling */
    lockedTags: string[];
    /** Size of the asset thumbnails to display in the side bar */
    thumbnailSize: ISize;
    /**
     * Whether or not the editor is in a valid state
     * State is invalid when a region has not been tagged
     */
    isValid: boolean;
    /** Whether the show invalid region warning alert should display */
    showInvalidRegionWarning: boolean;
    /** Magnifier modal status */
    magnifierModalIsOpen: boolean;
    /** Base metadata of selected asset */
    selectedAssetBase?: IAssetMetadata;
    litters: ILitter[];
    pressedKeys: number[];
    images: IImageWithAction[];
    imageNumber: number;
    endpointType: number;
    pressingHideImage: boolean;
    currentRegions: IRegion[];
}

function mapStateToProps(state: IApplicationState) {
    return {
        recentProjects: state.recentProjects,
        project: state.currentProject,
        appSettings: state.appSettings,
        auth: state.auth
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(projectActions, dispatch),
        applicationActions: bindActionCreators(applicationActions, dispatch),
        trackingActions: bindActionCreators(trackingActions, dispatch)
    };
}

/**
 * @name - Editor Page
 * @description - Page for adding/editing/removing tags to assets
 */
@connect(
    mapStateToProps,
    mapDispatchToProps
)
class EditorPage extends React.Component<IEditorPageProps, IEditorPageState> {
    public state: IEditorPageState = {
        selectedTag: null,
        lockedTags: [],
        selectionMode: SelectionMode.RECT,
        assets: [],
        childAssets: [],
        editorMode: EditorMode.Rectangle,
        additionalSettings: {
            videoSettings: this.props.project ? this.props.project.videoSettings : null,
            activeLearningSettings: this.props.project ? this.props.project.activeLearningSettings : null
        },
        thumbnailSize: this.props.appSettings.thumbnailSize || { width: 175, height: 155 },
        isValid: true,
        showInvalidRegionWarning: false,
        magnifierModalIsOpen: false,
        litters: [],
        pressedKeys: [],
        images: [],
        imageNumber: 20,
        endpointType: EnpointType.REGULAR,
        pressingHideImage: false,
        currentRegions: []
    };

    private activeLearningService: ActiveLearningService = null;
    private loadingProjectAssets: boolean = false;
    private toolbarItems: IToolbarItemRegistration[] = ToolbarItemFactory.getToolbarItems();
    private canvas: RefObject<Canvas> = React.createRef();
    private renameTagConfirm: React.RefObject<Confirm> = React.createRef();
    private deleteTagConfirm: React.RefObject<Confirm> = React.createRef();
    private reloadImagesConfirm: React.RefObject<Confirm> = React.createRef();

    public async componentDidMount() {
        const projectId = this.props.match.params["projectId"];
        if (this.props.project) {
            await this.loadProjectAssets();
        } else if (projectId) {
            const project = this.props.recentProjects.find(project => project.id === projectId);
            await this.props.actions.loadProject(project);
        }
        this.activeLearningService = new ActiveLearningService(this.props.project.activeLearningSettings);
        const litters = await apiService.getLitters()
        this.setState({
            litters: litters.data
        });
    }

    public saveImages = (images: IImageWithAction[]) => {
        this.props.actions.saveProjectImages(images);
    };

    public async componentDidUpdate(prevProps: Readonly<IEditorPageProps>, prevState: IEditorPageState) {
        if (
            this.state.endpointType !== prevState.endpointType ||
            (this.props.project && this.state.assets.length === 0)
        ) {
            await this.loadProjectAssets(false, true);
        }

        // Navigating directly to the page via URL (ie, http://vott/projects/a1b2c3dEf/edit) sets the default state
        // before props has been set, this updates the project and additional settings to be valid once props are
        // retrieved.
        if (this.props.project && !prevProps.project) {
            this.setState({
                additionalSettings: {
                    videoSettings: this.props.project ? this.props.project.videoSettings : null,
                    activeLearningSettings: this.props.project ? this.props.project.activeLearningSettings : null
                }
            });
        }
        if (this.props.project && prevProps.project && this.props.project.tags !== prevProps.project.tags) {
            this.updateRootAssets();
        }
    }

    public render() {
        const { project } = this.props;
        const { assets, selectedAsset, endpointType } = this.state;
        const rootAssets = assets.filter(asset => !asset.parent);

        if (!project) {
            return <div>Loading...</div>;
        }

        return (
            <div className="editor-page">
                {[...project.tags.keys()].map(index => {
                    return (
                        <KeyboardBinding
                            displayName={strings.editorPage.tags.hotKey.apply}
                            key={index}
                            keyEventType={KeyEventType.KeyDown}
                            accelerators={[`${index}`]}
                            icon={"fa-tag"}
                            handler={this.handleTagHotKey}
                        />
                    );
                })}
                {[...project.tags.keys()].map(index => {
                    return (
                        <KeyboardBinding
                            displayName={strings.editorPage.tags.hotKey.lock}
                            key={index}
                            keyEventType={KeyEventType.KeyDown}
                            accelerators={[`CmdOrCtrl+${index}`]}
                            icon={"fa-lock"}
                            handler={this.handleCtrlTagHotKey}
                        />
                    );
                })}
                <KeyboardBinding
                    displayName={strings.editorPage.tags.hotKey.hide}
                    keyEventType={KeyEventType.KeyDown}
                    accelerators={["h", "H"]}
                    icon={"fa-tag"}
                    handler={this.hideRegions}
                />
                <KeyboardBinding
                    displayName={strings.editorPage.tags.hotKey.show}
                    keyEventType={KeyEventType.KeyUp}
                    accelerators={["h", "H"]}
                    icon={"fa-tag"}
                    handler={this.showRegions}
                />
                <SplitPane
                    split="vertical"
                    defaultSize={this.state.thumbnailSize.width}
                    minSize={100}
                    maxSize={400}
                    paneStyle={{ display: "flex" }}
                    onChange={this.onSideBarResize}
                    onDragFinished={this.onSideBarResizeComplete}
                >
                    <div className="editor-page-sidebar bg-lighter-1">
                        <EditorSideBar
                            assets={rootAssets}
                            images={this.state.images}
                            endpointType={endpointType}
                            isAdmin={this.props.auth.isAdmin}
                            selectedAsset={selectedAsset ? selectedAsset.asset : null}
                            onBeforeAssetSelected={this.onBeforeAssetSelected}
                            onAssetSelected={this.selectAsset}
                            onSendButtonPressed={this.onSendButtonPressed}
                            onDelButtonPressed={this.onDelete}
                            onValidateButtonPressed={this.onValidate}
                            thumbnailSize={this.state.thumbnailSize}
                        />
                    </div>
                    <div className="editor-page-content" onClick={this.onPageClick}>
                        <div className="editor-page-content-main">
                            <div className="editor-page-content-main-header">
                                <EditorToolbar
                                    project={this.props.project}
                                    items={this.toolbarItems}
                                    actions={this.props.actions}
                                    onToolbarItemSelected={this.onToolbarItemSelected}
                                    setImageNumber={this.onChangeImageNumber}
                                    isAdmin={this.props.auth.isAdmin}
                                    onEndpointTypeChange={this.handleEndpointTypeChange}
                                    endpointType={endpointType}
                                    onBuildIdlButtonClick={this.onConfirmBuildIdl}
                                />
                            </div>
                            <div className="editor-page-content-main-body">
                                {selectedAsset ? (
                                    <Canvas
                                        ref={this.canvas}
                                        selectedAsset={this.state.selectedAsset}
                                        onAssetMetadataChanged={this.onAssetMetadataChanged}
                                        onCanvasRendered={this.onCanvasRendered}
                                        onSelectedRegionsChanged={this.onSelectedRegionsChanged}
                                        onValidate={this.onValidate}
                                        editorMode={this.state.editorMode}
                                        selectionMode={this.state.selectionMode}
                                        project={this.props.project}
                                        lockedTags={this.state.lockedTags}
                                        isAdmin={this.props.auth.isAdmin}
                                    >
                                        <AssetPreview
                                            additionalSettings={this.state.additionalSettings}
                                            autoPlay={true}
                                            controlsEnabled={this.state.isValid}
                                            onBeforeAssetChanged={this.onBeforeAssetSelected}
                                            onChildAssetSelected={this.onChildAssetSelected}
                                            asset={this.state.selectedAsset.asset}
                                            childAssets={this.state.childAssets}
                                        />
                                    </Canvas>
                                ) : (
                                    <div className="asset-loading" style={styles.assetLoading}>
                                        <div
                                            className="asset-loading-spinner text-center"
                                            style={styles.assetLoadingSpinner}
                                        >
                                            <i className="fas fa-circle-notch fa-spin" style={styles.icon} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="editor-page-right-sidebar">
                            <TagInput
                                tags={project.tags}
                                lockedTags={this.state.lockedTags}
                                selectedRegions={this.state.selectedRegions}
                                onChange={this.onTagsChanged}
                                onLockedTagsChange={this.onLockedTagsChanged}
                                onTagClick={this.onTagClicked}
                                onCtrlTagClick={this.onCtrlTagClicked}
                                onTagRenamed={this.confirmTagRenamed}
                            />
                        </div>
                        <Confirm
                            title={strings.editorPage.tags.rename.title}
                            ref={this.renameTagConfirm}
                            message={strings.editorPage.tags.rename.confirmation}
                            confirmButtonColor="danger"
                            onConfirm={this.onTagRenamed}
                        />
                        <Confirm
                            title={strings.editorPage.tags.delete.title}
                            ref={this.deleteTagConfirm}
                            message={strings.editorPage.tags.delete.confirmation}
                            confirmButtonColor="danger"
                            onConfirm={this.onTagDeleted}
                        />
                        <Confirm
                            title={strings.editorPage.images.reload.title}
                            ref={this.reloadImagesConfirm}
                            message={strings.editorPage.images.reload.confirmation}
                            confirmButtonColor="danger"
                            onConfirm={this.onReloadedImages}
                        />
                    </div>
                </SplitPane>

                <Alert
                    show={this.state.magnifierModalIsOpen}
                    title="Native Magnifier Instruction"
                    // tslint:disable-next-line:max-line-length
                    message={<MagnifierModalMessage />}
                    closeButtonColor="info"
                    onClose={this.closeNativeMagnifierModal}
                />

                <Alert
                    show={this.state.showInvalidRegionWarning}
                    title={strings.editorPage.messages.enforceTaggedRegions.title}
                    // tslint:disable-next-line:max-line-length
                    message={strings.editorPage.messages.enforceTaggedRegions.description}
                    closeButtonColor="info"
                    onClose={() => this.setState({ showInvalidRegionWarning: false })}
                />
            </div>
        );
    }

    private hideRegions = () => {
        if (!this.state.pressingHideImage) {
            this.setState({ pressingHideImage: true });
            const tmpRegions = this.state.selectedAsset.regions;
            const hiddenRegionsAsset = { ...this.state.selectedAsset, regions: [] };
            this.setState({ selectedAsset: hiddenRegionsAsset, currentRegions: tmpRegions });
        }
    };

    private showRegions = () => {
        if (this.state.pressingHideImage) {
            this.setState({ pressingHideImage: false });
            const previousAsset = { ...this.state.selectedAsset, regions: this.state.currentRegions };
            this.setState({ selectedAsset: previousAsset });
        }
    };

    private handleEndpointTypeChange = (event: any) => {
        const endpointType: number = Number(event.target.value);
        this.setState({ endpointType });
    };

    private closeNativeMagnifierModal = () => {
        this.setState({
            magnifierModalIsOpen: false
        });
    };

    private showNativeMagnifierModal = () => {
        this.setState({
            magnifierModalIsOpen: true
        });
    };

    private onPageClick = () => {
        this.setState({
            selectedRegions: []
        });
    };

    private onConfirmBuildIdl = async () => {
        const images = [...this.state.images];
        const imageNames = images.map(item => {
            const object = { ...item };
            return object.basename;
        });
        await apiService.buildIdl(imageNames);
        await this.loadProjectAssets(true).then(() => {
            this.forceUpdate();
            toast.success("Successfully built IDL!", { position: toast.POSITION.TOP_CENTER });
        });
    };

    /**
     * Called when the asset side bar is resized
     * @param newWidth The new sidebar width
     */
    private onSideBarResize = (newWidth: number) => {
        this.setState(
            {
                thumbnailSize: {
                    width: newWidth,
                    height: newWidth / (4 / 3)
                }
            },
            () => this.canvas.current.forceResize()
        );
    };

    /**
     * Called when the asset sidebar has been completed
     */
    private onSideBarResizeComplete = () => {
        const appSettings = {
            ...this.props.appSettings,
            thumbnailSize: this.state.thumbnailSize
        };

        this.props.applicationActions.saveAppSettings(appSettings);
    };

    /**
     * Called when a tag from footer is clicked
     * @param tag Tag clicked
     */
    private onTagClicked = (tag: ITag): void => {
        this.setState(
            {
                selectedTag: tag.name,
                lockedTags: []
            },
            () => this.canvas.current.applyTag(tag.name)
        );
    };

    /**
     * Open confirm dialog for tag renaming
     */
    private confirmTagRenamed = (tagName: string, newTagName: string): void => {
        this.renameTagConfirm.current.open(tagName, newTagName);
    };

    /**
     * Renames tag in assets and project, and saves files
     * @param tagName Name of tag to be renamed
     * @param newTagName New name of tag
     */
    private onTagRenamed = async (tagName: string, newTagName: string): Promise<void> => {
        const assetUpdates = await this.props.actions.updateProjectTag(this.props.project, tagName, newTagName);
        const selectedAsset = assetUpdates.find(am => am.asset.id === this.state.selectedAsset.asset.id);

        if (selectedAsset) {
            if (selectedAsset) {
                this.setState({ selectedAsset });
            }
        }
    };

    private onReloadedImages = async () => {
        await this.loadProjectAssets(true).then(() => {
            this.forceUpdate();
        });
    };

    /**
     * Removes tag from assets and projects and saves files
     * @param tagName Name of tag to be deleted
     */
    private onTagDeleted = async (tagName: string): Promise<void> => {
        const assetUpdates = await this.props.actions.deleteProjectTag(this.props.project, tagName);
        const selectedAsset = assetUpdates.find(am => am.asset.id === this.state.selectedAsset.asset.id);

        if (selectedAsset) {
            this.setState({ selectedAsset });
        }
    };

    private getTagFromPressedKeys = (): ITag => {
        const { tags } = this.props.project;
        const index = parseInt(this.state.pressedKeys.join(""), 10);
        if (index < tags.length) {
            return tags[index];
        }
        return null;
    };

    /**
     * Listens for {number key} and calls `onTagClicked` with tag corresponding to that number
     * @param event KeyDown event
     */
    private handleTagHotKey = (event: KeyboardEvent): void => {
        this.setState({ pressedKeys: [...this.state.pressedKeys, parseInt(event.key, 10)] });
        _.debounce(() => {
            const tag = this.getTagFromPressedKeys();
            if (tag) {
                this.onTagClicked(tag);
            }
            this.setState({ pressedKeys: [] });
        }, 500)();
    };

    private handleCtrlTagHotKey = (event: KeyboardEvent): void => {
        const tag = this.getTagFromKeyboardEvent(event);
        if (tag) {
            this.onCtrlTagClicked(tag);
        }
    };

    private onCtrlTagClicked = (tag: ITag): void => {
        const locked = this.state.lockedTags;
        this.setState(
            {
                selectedTag: tag.name,
                lockedTags: CanvasHelpers.toggleTag(locked, tag.name)
            },
            () => this.canvas.current.applyTag(tag.name)
        );
    };

    private getTagFromKeyboardEvent = (event: KeyboardEvent): ITag => {
        let key = parseInt(event.key, 10);
        if (isNaN(key)) {
            try {
                key = parseInt(event.key.split("+")[1], 10);
            } catch (e) {
                return;
            }
        }
        let index: number;
        const tags = this.props.project.tags;
        if (key === 0 && tags.length >= 10) {
            index = 9;
        } else if (key < 10) {
            index = key - 1;
        }
        if (index < tags.length) {
            return tags[index];
        }
        return null;
    };

    /**
     * Raised when a child asset is selected on the Asset Preview
     * ex) When a video is paused/seeked to on a video
     */
    private onChildAssetSelected = async (childAsset: IAsset) => {
        if (this.state.selectedAsset && this.state.selectedAsset.asset.id !== childAsset.id) {
            await this.selectAsset(childAsset);
        }
    };

    /**
     * Returns a value indicating whether the current asset is taggable
     */
    private isTaggableAssetType = (asset: IAsset): boolean => {
        return asset.type !== AssetType.Unknown && asset.type !== AssetType.Video;
    };

    /**
     * Raised when the selected asset has been changed.
     * This can either be a parent or child asset
     */
    private onAssetMetadataChanged = async (assetMetadata: IAssetMetadata): Promise<void> => {
        // If the asset contains any regions without tags, don't proceed.
        const regionsWithoutTags = assetMetadata.regions.filter(region => region.tags.length === 0);

        if (regionsWithoutTags.length > 0) {
            this.setState({ isValid: false });
            return;
        }

        const initialState = assetMetadata.asset.state;

        // The root asset can either be the actual asset being edited (ex: VideoFrame) or the top level / root
        // asset selected from the side bar (image/video).
        const rootAsset = { ...(assetMetadata.asset.parent || assetMetadata.asset) };

        if (this.isTaggableAssetType(assetMetadata.asset)) {
            assetMetadata.asset.state = assetMetadata.regions.length > 0 ? AssetState.Tagged : AssetState.Visited;
        } else if (assetMetadata.asset.state === AssetState.NotVisited) {
            assetMetadata.asset.state = AssetState.Visited;
        }

        const tagsWithId = buildTagsWithId(this.state.litters, this.props.auth.platformMode);

        // Update root asset if not already in the "Tagged" state
        // This is primarily used in the case where a Video Frame is being edited.
        // We want to ensure that in this case the root video asset state is accurately
        // updated to match that state of the asset.
        if (rootAsset.id === assetMetadata.asset.id) {
            rootAsset.state = assetMetadata.asset.state;
        } else {
            const rootAssetMetadata = await this.props.actions.loadAssetMetadata(this.props.project, rootAsset);
            if (rootAssetMetadata.asset.state !== AssetState.Tagged) {
                rootAssetMetadata.asset.state = assetMetadata.asset.state;
                await this.props.actions.saveAssetMetadata(this.props.project, rootAssetMetadata, tagsWithId);
            }

            rootAsset.state = rootAssetMetadata.asset.state;
        }

        // Only update asset metadata if state changes or is different
        if (initialState !== assetMetadata.asset.state || this.state.selectedAsset !== assetMetadata) {
            await this.props.actions.saveAssetMetadata(this.props.project, assetMetadata, tagsWithId);
        }

        await this.props.actions.saveProject(this.props.project, false);

        const assetService = new AssetService(this.props.project);
        const childAssets = assetService.getChildAssets(rootAsset);

        // Find and update the root asset in the internal state
        // This forces the root assets that are displayed in the sidebar to
        // accurately show their correct state (not-visited, visited or tagged)
        const assets = [...this.state.assets];
        const assetIndex = assets.findIndex(asset => asset.id === rootAsset.id);
        if (assetIndex > -1) {
            assets[assetIndex] = {
                ...rootAsset
            };
        }

        this.setState({ childAssets, assets, isValid: true, selectedAsset: assetMetadata });
    };

    /**
     * Raised when the asset binary has been painted onto the canvas tools rendering canvas
     */
    private onCanvasRendered = async (canvas: HTMLCanvasElement) => {
        // When active learning auto-detect is enabled
        // run predictions when asset changes
        if (this.props.project.activeLearningSettings.autoDetect && !this.state.selectedAsset.asset.predicted) {
            await this.predictRegions(canvas);
        }
    };

    private onSelectedRegionsChanged = (selectedRegions: IRegion[]) => {
        this.setState({ selectedRegions });
    };

    private onTagsChanged = async tags => {
        const project = {
            ...this.props.project,
            tags
        };

        await this.props.actions.saveProject(project, false);
    };

    private onLockedTagsChanged = (lockedTags: string[]) => {
        this.setState({ lockedTags });
    };

    private onChangeImageNumber = (imageNumber: number) => {
        this.setState({ imageNumber });
    };

    private onToolbarItemSelected = async (toolbarItem: ToolbarItem): Promise<void> => {
        switch (toolbarItem.props.name) {
            case ToolbarItemName.DrawRectangle:
                this.setState({
                    selectionMode: SelectionMode.RECT,
                    editorMode: EditorMode.Rectangle
                });
                break;
            case ToolbarItemName.DrawPolygon:
                this.setState({
                    selectionMode: SelectionMode.POLYGON,
                    editorMode: EditorMode.Polygon
                });
                break;
            case ToolbarItemName.SelectCanvas:
                this.setState({
                    selectionMode: SelectionMode.NONE,
                    editorMode: EditorMode.Select
                });
                break;
            case ToolbarItemName.PreviousAsset:
                await this.goToRootAsset(-1);
                break;
            case ToolbarItemName.NextAsset:
                await this.goToRootAsset(1);
                break;
            case ToolbarItemName.CopyRegions:
                this.canvas.current.copyRegions();
                break;
            case ToolbarItemName.CutRegions:
                this.canvas.current.cutRegions();
                break;
            case ToolbarItemName.PasteRegions:
                this.canvas.current.pasteRegions();
                break;
            case ToolbarItemName.RemoveAllRegions:
                this.canvas.current.confirmRemoveAllRegions();
                break;
            case ToolbarItemName.Magnifier:
                this.showNativeMagnifierModal();
                break;
            case ToolbarItemName.DeletePicture:
                this.handleDeletePictureClick();
                break;
            case ToolbarItemName.ReloadImages:
                this.handleReloadImagesClick();
                break;
        }
    };

    private predictRegions = async (canvas?: HTMLCanvasElement) => {
        canvas = canvas || document.querySelector("canvas");
        if (!canvas) {
            return;
        }

        // Load the configured ML model
        if (!this.activeLearningService.isModelLoaded()) {
            let toastId: number = null;
            try {
                toastId = toast.info(strings.activeLearning.messages.loadingModel, { autoClose: false });
                await this.activeLearningService.ensureModelLoaded();
            } catch (e) {
                toast.error(strings.activeLearning.messages.errorLoadModel);
                return;
            } finally {
                toast.dismiss(toastId);
            }
        }

        // Predict and add regions to current asset
        try {
            const updatedAssetMetadata = await this.activeLearningService.predictRegions(
                canvas,
                this.state.selectedAsset
            );

            await this.onAssetMetadataChanged(updatedAssetMetadata);
            this.setState({ selectedAsset: updatedAssetMetadata });
        } catch (e) {
            throw new AppError(ErrorCode.ActiveLearningPredictionError, "Error predicting regions");
        }
    };

    /**
     * Navigates to the previous / next root asset on the sidebar
     * @param direction Number specifying asset navigation
     */
    private goToRootAsset = async (direction: number) => {
        const selectedRootAsset = this.state.selectedAsset.asset.parent || this.state.selectedAsset.asset;
        const currentIndex = this.state.assets.findIndex(asset => asset.id === selectedRootAsset.id);

        if (direction > 0) {
            await this.selectAsset(this.state.assets[Math.min(this.state.assets.length - 1, currentIndex + 1)]);
        } else {
            await this.selectAsset(this.state.assets[Math.max(0, currentIndex - 1)]);
        }
    };

    private onBeforeAssetSelected = (): boolean => {
        if (!this.state.isValid) {
            this.setState({ showInvalidRegionWarning: true });
        }
        return this.state.isValid;
    };

    private async deletePicture() {
        try {
            const { selectedAsset, assets } = this.state;
            const newAssets = [...assets];
            const indexAssetToRemove = newAssets.findIndex((asset: IAsset) => {
                return asset.id === selectedAsset.asset.id;
            });

            newAssets.splice(indexAssetToRemove, 1);
            if (newAssets.length) {
                const previousIndex = indexAssetToRemove - 1;
                const assetToSelect =
                    newAssets[previousIndex] !== undefined ? newAssets[previousIndex] : newAssets[indexAssetToRemove];
                if (assetToSelect !== undefined) {
                    this.selectAsset(assetToSelect);
                } else if (newAssets.length > 0) {
                    this.selectAsset(newAssets[0]);
                }
            }
            this.setState({
                assets: newAssets
            });
        } catch (error) {
            toast.error(strings.editorPage.deletePictureError);
        } finally {
            this.forceUpdate();
        }
    }

    /**
     * Calls validate image api and update image list
     */

    private onValidate = async (isValidated: boolean): Promise<void> => {
        const { selectedAsset } = this.state;
        if (selectedAsset && selectedAsset.asset) {
            const name = selectedAsset.asset.name;
            const image = await apiService.validateImage(isValidated, name);
            const images = [...this.state.images];
            const changedImages = images.map(item => {
                const object = { ...item };
                if (object.basename === name) {
                    return image.data;
                }
                return object;
            });
            this.setState({
                images: changedImages
            });
            this.saveImages(changedImages);
            this.forceUpdate();
        }
    };

    private updateMetadata = async (asset: IAsset) => {
        const { actions, project } = this.props;
        const assetMetadata = await actions.loadAssetMetadata(project, asset);

        try {
            if (!assetMetadata.asset.size) {
                const assetProps = await HtmlFileReader.readAssetAttributes(asset);
                assetMetadata.asset.size = { width: assetProps.width, height: assetProps.height };
            }
        } catch (err) {
            console.warn("Error computing asset size");
        }

        this.setState(
            {
                selectedAsset: assetMetadata,
                selectedAssetBase: assetMetadata
            },
            async () => {
                await this.onAssetMetadataChanged(assetMetadata);
            }
        );
    };

    private onSendButtonPressed = async () => {
        // if all regions have been tagged
        if (this.onBeforeAssetSelected()) {
            const { selectedAsset } = this.state;
            const { auth, trackingActions } = this.props;
            if (selectedAsset && selectedAsset.asset) {
                try {
                    await trackingActions.trackingImgValidate(
                        auth.userId,
                        selectedAsset.asset.name,
                        selectedAsset.regions,
                        this.isAssetModified()
                    );
                    // if admin we update the bagdes, else we juste remove the image
                    if (this.props.auth.isAdmin) {
                        await this.onValidate(true);
                        await this.onDelete(false);
                        this.updateMetadata(selectedAsset.asset);
                    } else {
                        this.deletePicture();
                    }
                } catch (e) {
                    console.warn(strings.consoleMessages.imgValidateFailed);
                }
            }
        }
    };

    private selectAsset = async (asset: IAsset): Promise<void> => {
        const { selectedAsset, isValid } = this.state;
        const { actions, auth, project } = this.props;
        // Nothing to do if we are already on the same asset.
        if (selectedAsset && selectedAsset.asset.id === asset.id) {
            return;
        }

        if (!isValid) {
            this.setState({ showInvalidRegionWarning: true });
            return;
        }

        /**
         * Saves the current regions in last action
         * Does not send any action
         */
        if (selectedAsset && selectedAsset.asset) {
            const imgValidate: IActionRequest = {
                user_id: auth.userId,
                image_basename: selectedAsset.asset.name,
                regions: selectedAsset.regions,
                is_modified: this.isAssetModified(),
                type: TrackingActionType.ImgValidate
            };

            const name = selectedAsset.asset.name;
            const images = [...this.state.images];
            const changedImages = images.map(item => {
                const object = { ...item };
                if (object.basename === name) {
                    object.last_action = imgValidate;
                }
                return object;
            });
            this.setState({
                images: changedImages
            });
            this.saveImages(changedImages);
        }

        this.updateMetadata(asset);
    };

    private isAssetModified = (): boolean => {
        const { selectedAssetBase, selectedAsset } = this.state;
        const modifiedAssets = selectedAsset.regions.filter((region: IRegion, index: number) => {
            const oldAssetRegion = selectedAssetBase.regions[index];
            if (!oldAssetRegion) {
                return true;
            }
            const oldBoundingBox = oldAssetRegion.boundingBox;
            const newBoundingBox = region.boundingBox;
            return (
                region.id !== oldAssetRegion.id ||
                JSON.stringify(region.points) !== JSON.stringify(oldAssetRegion.points) ||
                JSON.stringify(region.tags) !== JSON.stringify(oldAssetRegion.tags) ||
                region.type !== oldAssetRegion.type ||
                newBoundingBox.height !== oldBoundingBox.height ||
                newBoundingBox.left !== oldBoundingBox.left ||
                newBoundingBox.top !== oldBoundingBox.top ||
                newBoundingBox.width !== oldBoundingBox.width
            );
        });
        return selectedAssetBase.regions.length !== selectedAsset.regions.length || !!modifiedAssets.length;
    };

    private loadProjectAssets = async (
        forceLoad: boolean = false,
        hasEnpointTypeChanged: boolean = false
    ): Promise<void> => {
        if (this.loadingProjectAssets || (!forceLoad && this.state.assets.length > 0 && !hasEnpointTypeChanged)) {
            return;
        }

        this.loadingProjectAssets = true;
        let images;

        // Get all root assets from source asset provider
        if (this.state.endpointType === EnpointType.REGULAR) {
            images = await apiService.getImagesFromDispatcher(this.state.imageNumber);
        } else if (this.state.endpointType === EnpointType.ADMIN) {
            images = await apiService.getImagesForQualityControl(this.state.imageNumber);
        }
        this.saveImages(images.data);
        this.setState({ images: images.data });
        const sourceAssets = await this.props.actions.loadAssets(this.props.project);

        const lastVisited = sourceAssets.find(asset => asset.id === this.props.project.lastVisitedAssetId);

        this.setState(
            {
                assets: sourceAssets
            },
            async () => {
                if (sourceAssets.length > 0) {
                    await this.selectAsset(lastVisited && !forceLoad ? lastVisited : sourceAssets[0]);
                }
                this.loadingProjectAssets = false;
            }
        );
    };

    /**
     * Updates the root asset list from the project assets
     */
    private updateRootAssets = () => {
        const updatedAssets = [...this.state.assets];
        updatedAssets.forEach(asset => {
            const projectAsset = this.props.project.assets[asset.id];
            if (projectAsset) {
                asset.state = projectAsset.state;
            }
        });

        this.setState({ assets: updatedAssets });
    };

    private handleReloadImagesClick() {
        this.reloadImagesConfirm.current.open();
    }

    /**
     * Calls delete image api and update image list
     */

    private onDelete = async (isDeleted?: boolean) => {
        const { selectedAsset } = this.state;
        const image = await apiService.deleteImage(isDeleted, selectedAsset.asset.name);
        if (selectedAsset && selectedAsset.asset) {
            const name = selectedAsset.asset.name;
            const images = [...this.state.images];
            const changedImages = images.map(item => {
                const object = { ...item };
                if (object.basename === name) {
                    return image.data;
                }
                return object;
            });
            this.setState({
                images: changedImages
            });
            this.saveImages(changedImages);
            this.forceUpdate();
        }
    };

    /**
     * Called when user or admin click on trashbin in toolbar (not del button)
     */
    private handleDeletePictureClick = async () => {
        const { selectedAsset } = this.state;
        const { auth, trackingActions } = this.props;
        if (this.props.auth.isAdmin) {
            await this.onDelete(true);
            await this.onValidate(false);
        } else {
            await trackingActions.trackingImgDelete(auth.userId, selectedAsset.asset.name);
            this.deletePicture();
        }
    };
}

const styles = {
    assetLoading: {
        width: "100%"
    },
    assetLoadingSpinner: {
        height: "100%"
    },
    icon: {
        fontSize: "5em",
        position: "relative",
        top: "45%"
    }
} as any;

export default EditorPage;
