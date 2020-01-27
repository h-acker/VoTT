import { mount, ReactWrapper } from "enzyme";
import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter as Router } from "react-router-dom";
import { AnyAction, Store } from "redux";
import MockFactory from "../../../../common/mockFactory";
import { StorageProviderFactory } from "../../../../providers/storage/storageProviderFactory";
import { IApplicationState, IProject, AppError, ErrorCode } from "../../../../models/applicationState";
import IProjectActions, * as projectActions from "../../../../redux/actions/projectActions";
import IApplicationActions, * as applicationActions from "../../../../redux/actions/applicationActions";
import createReduxStore from "../../../../redux/store/store";
import CondensedList from "../../common/condensedList/condensedList";
import HomePage, { IHomePageProps } from "./homePage";
import IConnectionActions, * as connectionActions from "../../../../redux/actions/connectionActions";

jest.mock("../../../../services/projectService");
import ProjectService from "../../../../services/projectService";

import { toast } from "react-toastify";
import registerMixins from "../../../../registerMixins";

describe("Homepage Component", () => {
    let store: Store<IApplicationState> = null;
    let props: IHomePageProps = null;
    let wrapper: ReactWrapper = null;
    let saveConnectionSpy: jest.SpyInstance = null;
    const recentProjects = MockFactory.createTestProjects(2);
    const storageProviderMock = {
        writeText: jest.fn(project => Promise.resolve(project)),
        deleteFile: jest.fn(() => Promise.resolve())
    };
    StorageProviderFactory.create = jest.fn(() => storageProviderMock);

    function createComponent(store, props: IHomePageProps): ReactWrapper {
        return mount(
            <Provider store={store}>
                <Router>
                    <HomePage {...props} />
                </Router>
            </Provider>
        );
    }

    beforeAll(() => {
        registerMixins();
        toast.success = jest.fn(() => 2);
        toast.info = jest.fn(() => 2);
    });

    beforeEach(() => {
        const projectServiceMock = ProjectService as jest.Mocked<typeof ProjectService>;
        projectServiceMock.prototype.load = jest.fn(project => Promise.resolve(project));
        projectServiceMock.prototype.delete = jest.fn(() => Promise.resolve());

        store = createStore(recentProjects);
        props = createProps();
        saveConnectionSpy = jest.spyOn(props.connectionActions, "saveConnection");

        wrapper = createComponent(store, props);
    });

    it("should render a list of recent projects", () => {
        expect(wrapper).not.toBeNull();
        const homePage = wrapper.find(HomePage).childAt(0) as ReactWrapper<IHomePageProps>;
        if (homePage.props().recentProjects && homePage.props().recentProjects.length > 0) {
            expect(wrapper.find(CondensedList).exists()).toBeTruthy();
        }
    });

    it("startups the initial project", () => {
        expect(saveConnectionSpy).toBeCalledWith({
            id: "cortexiaApi",
            name: "cortexiaApi",
            providerOptions: [],
            providerType: "cortexiaApi"
        });
    });

    function createProps(): IHomePageProps {
        return {
            recentProjects: [],
            project: MockFactory.createTestProject(),
            connections: MockFactory.createTestConnections(),
            history: {
                length: 0,
                action: null,
                location: null,
                push: jest.fn(),
                replace: jest.fn(),
                go: jest.fn(),
                goBack: jest.fn(),
                goForward: jest.fn(),
                block: jest.fn(),
                listen: jest.fn(),
                createHref: jest.fn()
            },
            location: {
                hash: null,
                pathname: null,
                search: null,
                state: null
            },
            actions: (projectActions as any) as IProjectActions,
            applicationActions: (applicationActions as any) as IApplicationActions,
            appSettings: {
                devToolsEnabled: false,
                securityTokens: []
            },
            match: {
                params: {},
                isExact: true,
                path: `https://localhost:3000/`,
                url: `https://localhost:3000/`
            },
            connectionActions: (connectionActions as any) as IConnectionActions
        };
    }

    function createStore(recentProjects: IProject[]): Store<IApplicationState, AnyAction> {
        const initialState: IApplicationState = {
            currentProject: null,
            appSettings: MockFactory.appSettings(),
            connections: [],
            recentProjects,
            appError: null,
            auth: null
        };

        return createReduxStore(initialState);
    }
});
