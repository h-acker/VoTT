import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import { bindActionCreators } from "redux";
import { strings, interpolate } from "../../../../common/strings";
import IProjectActions, * as projectActions from "../../../../redux/actions/projectActions";
import IApplicationActions, * as applicationActions from "../../../../redux/actions/applicationActions";
import CondensedList from "../../common/condensedList/condensedList";
import Confirm from "../../common/confirm/confirm";
import "./homePage.scss";
import RecentProjectItem from "./recentProjectItem";
import {
    IApplicationState,
    IConnection,
    IProject,
    IFileInfo,
    ErrorCode,
    AppError,
    IAppSettings,
    ModelPathType
} from "../../../../models/applicationState";
import ImportService from "../../../../services/importService";
import { IAssetMetadata } from "../../../../models/applicationState";
import { toast } from "react-toastify";
import IConnectionActions, * as connectionActions from "../../../../redux/actions/connectionActions";

export interface IHomePageProps extends RouteComponentProps {
    recentProjects: IProject[];
    connections: IConnection[];
    actions: IProjectActions;
    applicationActions: IApplicationActions;
    appSettings: IAppSettings;
    project: IProject;
    connectionActions: IConnectionActions;
}

export interface IHomePageState {
    cloudPickerOpen: boolean;
}

function mapStateToProps(state: IApplicationState) {
    return {
        recentProjects: state.recentProjects,
        connections: state.connections,
        appSettings: state.appSettings,
        project: state.currentProject
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(projectActions, dispatch),
        applicationActions: bindActionCreators(applicationActions, dispatch),
        connectionActions: bindActionCreators(connectionActions, dispatch)
    };
}

@connect(
    mapStateToProps,
    mapDispatchToProps
)
export default class HomePage extends React.Component<IHomePageProps, IHomePageState> {
    private deleteConfirm: React.RefObject<Confirm> = React.createRef();
    private importConfirm: React.RefObject<Confirm> = React.createRef();

    public componentDidMount() {
        this.startupProject();
    }

    public render() {
        return (
            <div className="app-homepage">
                {this.props.recentProjects && this.props.recentProjects.length > 0 && (
                    <div className="app-homepage-recent bg-lighter-1">
                        <CondensedList
                            title={strings.homePage.recentProjects}
                            Component={RecentProjectItem}
                            items={this.props.recentProjects}
                            onClick={this.loadSelectedProject}
                            onDelete={project => this.deleteConfirm.current.open(project)}
                        />
                    </div>
                )}
                <Confirm
                    title="Delete Project"
                    ref={this.deleteConfirm as any}
                    message={(project: IProject) => `${strings.homePage.deleteProject.confirmation} ${project.name}?`}
                    confirmButtonColor="danger"
                    onConfirm={this.deleteProject}
                />
                <Confirm
                    title="Import Project"
                    ref={this.importConfirm as any}
                    message={(project: IFileInfo) =>
                        interpolate(strings.homePage.importProject.confirmation, { project })
                    }
                    confirmButtonColor="danger"
                    onConfirm={this.convertProject}
                />
            </div>
        );
    }

    private startupProject = async () => {
        let project = this.props.recentProjects.filter(item => item.name === "Cortexia")[0];
        if (!project) {
            const connectionName = "cortexiaApi";
            const cortexiaConnection = this.props.connections.filter(item => item.name === connectionName)[0];
            const connection = cortexiaConnection
                ? cortexiaConnection
                : {
                      providerType: connectionName,
                      providerOptions: [],
                      name: connectionName,
                      id: connectionName
                  };
            await this.props.connectionActions.saveConnection(connection);

            project = {
                name: "project",
                id: "Cortexia",
                version: "Version",
                securityToken: "security token",
                tags: [],
                sourceConnection: connection,
                targetConnection: connection,
                exportFormat: { providerType: "vottJson", providerOptions: { encrypted: "" } },
                videoSettings: { frameExtractionRate: 15 },
                activeLearningSettings: {
                    autoDetect: false,
                    predictTag: true,
                    modelPathType: ModelPathType.Coco
                },
                autoSave: true,
                assets: {}
            };

            await this.props.applicationActions.ensureSecurityToken(project);
            await this.props.actions.saveProject(project);
        }
        this.loadSelectedProject(project);
    };

    private loadSelectedProject = async (project: IProject) => {
        await this.props.actions.loadProject(project);
        this.props.history.push(`/projects/${project.id}/edit`);
    };

    private deleteProject = async (project: IProject) => {
        try {
            await this.props.actions.deleteProject(project);
            toast.info(
                interpolate(strings.homePage.messages.deleteSuccess, {
                    project
                })
            );
        } catch (error) {
            throw new AppError(ErrorCode.ProjectDeleteError, "Error deleting project file");
        }
    };

    private convertProject = async (projectInfo: IFileInfo) => {
        const importService = new ImportService();
        let generatedAssetMetadata: IAssetMetadata[];
        let project: IProject;

        try {
            project = await importService.convertProject(projectInfo);
        } catch (e) {
            throw new AppError(ErrorCode.V1ImportError, "Error converting v1 project file");
        }

        this.props.applicationActions.ensureSecurityToken(project);

        try {
            generatedAssetMetadata = await importService.generateAssets(projectInfo, project);
            await this.props.actions.saveProject(project);
            await this.props.actions.loadProject(project);
            await generatedAssetMetadata.mapAsync(assetMetadata => {
                return this.props.actions.saveAssetMetadata(this.props.project, assetMetadata);
            });
        } catch (e) {
            throw new Error(`Error importing project information - ${e.message}`);
        }

        await this.props.actions.saveProject(this.props.project);
        await this.loadSelectedProject(this.props.project);
    };
}
