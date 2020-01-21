import React from "react";
import { ReactWrapper, mount } from "enzyme";
import { TagInput, ITagInputProps, ITagInputState } from "./tagInput";
import MockFactory from "../../../../common/mockFactory";
import { ITag } from "../../../../models/applicationState";
import TagInputItem, { ITagInputItemProps } from "./tagInputItem";
import ApiService from "../../../../services/apiService";
jest.mock("../../../../services/apiService");

describe("Tag Input Component", () => {
    function createComponent(props?: ITagInputProps): ReactWrapper<ITagInputProps, ITagInputState> {
        return mount(<TagInput {...(props || createProps())} />);
    }

    function createProps(tags?: ITag[], onChange?): ITagInputProps {
        return {
            tags: tags || MockFactory.createTestTags(),
            lockedTags: [],
            selectedRegions: [MockFactory.createTestRegion()],
            onChange: onChange || jest.fn(),
            onLockedTagsChange: jest.fn(),
            onTagClick: jest.fn(),
            onCtrlTagClick: jest.fn()
        };
    }

    beforeEach(() => {
        jest.spyOn(ApiService, "getLitters").mockImplementation(() =>
            Promise.resolve({
                data: MockFactory.createTestLitters()
            })
        );
    });

    it("Renders correctly", () => {
        const tags = MockFactory.createTestTags();
        const wrapper = createComponent(createProps(tags));
        expect(wrapper.exists(".tag-input-toolbar")).toBe(true);
        expect(wrapper.find(".tag-item-block").length).toBe(tags.length);
    });

    describe("Toolbar", () => {
        it("Tag search box can be shown on click of search button", () => {
            const wrapper = createComponent();
            expect(wrapper.exists(".search-input")).toBe(false);
            expect(wrapper.state().searchTags).toBeFalsy();
            wrapper.find("div.tag-input-toolbar-item.search").simulate("click");
            expect(wrapper.exists(".search-input")).toBe(true);
            expect(wrapper.state().searchTags).toBe(true);
        });

        it("Tag search box closed with escape key", async () => {
            const wrapper = createComponent();
            expect(wrapper.exists(".tag-search-box")).toBe(false);
            expect(wrapper.state().searchTags).toBeFalsy();
            wrapper.find("div.tag-input-toolbar-item.search").simulate("click");
            expect(wrapper.exists(".tag-search-box")).toBe(true);
            expect(wrapper.state().searchTags).toBe(true);

            wrapper.find(".tag-search-box").simulate("keydown", { key: "Escape" });
            await MockFactory.flushUi();
            expect(wrapper.state().searchTags).toBe(false);

            expect(wrapper.exists(".tag-search-box")).toBe(false);
        });
    });

    it("Selects a tag", () => {
        const wrapper = createComponent();
        const firstTag = wrapper.state().tags[0];
        wrapper
            .find(".tag-content")
            .first()
            .simulate("click");
        expect(wrapper.state().tags.indexOf(firstTag)).toEqual(0);
    });

    it("Searches for a tag", () => {
        const props: ITagInputProps = {
            ...createProps(),
            showSearchBox: true
        };
        const wrapper = createComponent(props);
        expect(wrapper.find(".tag-item-block").length).toBeGreaterThan(1);
        wrapper.find(".tag-search-box").simulate("change", { target: { value: "1" } });
        expect(wrapper.state().searchQuery).toEqual("1");
        expect(wrapper.find(".tag-item-block")).toHaveLength(1);
        expect(
            wrapper
                .find(".tag-name-body")
                .first()
                .text()
        ).toEqual("Tag 1");
    });

    it("sets applied tags when selected regions are available", () => {
        const tags = MockFactory.createTestTags();
        const onChange = jest.fn();
        const props = createProps(tags, onChange);
        const wrapper = createComponent(props);

        const selectedRegion = MockFactory.createTestRegion();
        selectedRegion.tags = [tags[0].name, tags[1].name];

        wrapper.setProps({
            selectedRegions: [selectedRegion]
        });

        const selectedTags = wrapper.findWhere((el: ReactWrapper<ITagInputItemProps>) => {
            return el.type() === TagInputItem && el.props().appliedToSelectedRegions;
        });

        expect(wrapper.state().selectedTag).toBeNull();
        expect(selectedTags).toHaveLength(2);
        expect(selectedTags.at(0).props().tag).toEqual(tags[0]);
        expect(selectedTags.at(1).props().tag).toEqual(tags[1]);
    });
});
