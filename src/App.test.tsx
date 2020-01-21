import React from "react";
import App from "./App";
import { Provider } from "react-redux";
import createReduxStore from "./redux/store/store";
import initialState from "./redux/store/initialState";
import { IApplicationState } from "./models//applicationState";
import { mount } from "enzyme";
import { Router } from "react-router-dom";
import { KeyboardManager } from "./react/components/common/keyboardManager/keyboardManager";
import { ErrorHandler } from "./react/components/common/errorHandler/errorHandler";
import ITrackingActions, * as trackingActions from "./redux/actions/trackingActions";

describe("App Component", () => {
    const defaultState: IApplicationState = initialState;
    const store = createReduxStore(defaultState);

    function createComponent(props = createProps()) {
        return mount(
            <Provider store={store}>
                <App {...props} />
            </Provider>
        );
    }

    function createProps() {
        return {
            trackingActions: (trackingActions as any) as ITrackingActions
        };
    }

    it("renders without crashing", () => {
        createComponent();
    });

    it("renders required top level components", () => {
        const wrapper = createComponent();
        expect(wrapper.find(Router).exists()).toBe(true);
        expect(wrapper.find(KeyboardManager).exists()).toEqual(true);
        expect(wrapper.find(ErrorHandler).exists()).toEqual(true);
    });

    it("dispatch tracking sing out action when beforeunload event is dispatched", () => {
        const props = createProps();
        const trackingSignOutAction = jest.spyOn(props.trackingActions, "trackingSignOut");
        createComponent(props);
        spyOn(window, "addEventListener");
        window.dispatchEvent(new Event("beforeunload"));
        expect(trackingSignOutAction).toHaveBeenCalled();
    });
});
