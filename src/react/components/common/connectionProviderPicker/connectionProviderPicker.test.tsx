import React from "react";
import { mount, ReactWrapper } from "enzyme";
import _ from "lodash";
import ConnectionProviderPicker, { IConnectionProviderPickerProps } from "./connectionProviderPicker";
import MockFactory from "../../../../common/mockFactory";

jest.mock("../../../../providers/storage/storageProviderFactory");
import { StorageProviderFactory } from "../../../../providers/storage/storageProviderFactory";
jest.mock("../../../../providers/storage/assetProviderFactory");
import { AssetProviderFactory } from "../../../../providers/storage/assetProviderFactory";

describe("Connection Provider Picker", () => {
    const storageProviderRegistrations = MockFactory.createStorageProviderRegistrations();
    const assetProviderRegistrations = MockFactory.createAssetProviderRegistrations();

    let wrapper: ReactWrapper;

    const onChangeHandler = jest.fn();
    const defaultProps: IConnectionProviderPickerProps = {
        id: "test-connection-provider-picker",
        value: "",
        onChange: onChangeHandler,
    };

    function createComponent(props: IConnectionProviderPickerProps) {
        return mount(<ConnectionProviderPicker {...props} />);
    }

    beforeAll(() => {
        Object.defineProperty(StorageProviderFactory, "providers", {
            get: jest.fn(() => storageProviderRegistrations),
        });

        Object.defineProperty(AssetProviderFactory, "providers", {
            get: jest.fn(() => assetProviderRegistrations),
        });
    });

    describe("With default properties", () => {
        beforeEach(() => {
            wrapper = createComponent(defaultProps);
        });

        it("Renders a dropdown with cortexia providers", () => {
            const picker = wrapper.find("select");
            const htmlNode = picker.getDOMNode() as HTMLSelectElement;

            // Count of unique providers + the "Select" option
            expect(htmlNode.id).toEqual(defaultProps.id);
            expect(htmlNode.value).toEqual(defaultProps.value);
            expect(picker.find("option").length).toEqual(1);
        });

        it("Calls registred onChange handler when value changes", async () => {
            await MockFactory.flushUi(() => {
                wrapper.find("select").simulate("change", { target: { value: assetProviderRegistrations[1].name } });
            });

            expect(onChangeHandler).toBeCalledWith(assetProviderRegistrations[1].name);
        });
    });
});
