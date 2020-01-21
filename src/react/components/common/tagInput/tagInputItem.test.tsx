import React from "react";
import TagInputItem, { ITagInputItemProps } from "./tagInputItem";
import MockFactory from "../../../../common/mockFactory";
import { mount } from "enzyme";
import ApiService from "../../../../services/apiService";
jest.mock("../../../../services/apiService");

describe("Tag Input Item", () => {
    function createProps(): ITagInputItemProps {
        return {
            tag: MockFactory.createTestTag(),
            index: 0,
            isBeingEdited: false,
            isLocked: false,
            isSelected: false,
            appliedToSelectedRegions: false,
            onClick: jest.fn(),
            onChange: jest.fn()
        };
    }

    beforeEach(() => {
        jest.spyOn(ApiService, "getLitters").mockImplementation(() =>
            Promise.resolve({
                data: [MockFactory.createTestLitter()]
            })
        );
    });

    function createComponent(props?: ITagInputItemProps) {
        if (!props) {
            props = createProps();
        }
        return mount(<TagInputItem {...props} />);
    }

    it("Renders correctly", () => {
        const wrapper = createComponent();
        expect(wrapper.exists(".tag-item-block"));
        expect(wrapper.exists(".tag-color"));
        expect(wrapper.exists(".tag-content"));
    });
});
