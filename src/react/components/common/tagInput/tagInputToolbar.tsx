import React, { SyntheticEvent } from "react";
import { strings } from "../../../../common/strings";
import { ITag } from "../../../../models/applicationState";
import "./tagInput.scss";

/** Properties for tag input toolbar */
export interface ITagInputToolbarProps {
    /** Currently selected tag */
    selectedTag: ITag;
    /** Function to call when search tags button is clicked */
    onSearchTags: () => void;
    /** Function to call when one of the re-order buttons is clicked */
    onReorder: (tag: ITag, displacement: number) => void;
}

interface ITagInputToolbarItemProps {
    displayName: string;
    className: string;
    icon: string;
    handler: () => void;
    accelerators?: string[];
}

export default class TagInputToolbar extends React.Component<ITagInputToolbarProps> {
    public render() {
        return (
            <div className="tag-input-toolbar">
                {this.getToolbarItems().map(itemConfig => (
                    <div
                        key={itemConfig.displayName}
                        className={`tag-input-toolbar-item ${itemConfig.className}`}
                        onClick={e => this.onToolbarItemClick(e, itemConfig)}
                    >
                        <i className={`tag-input-toolbar-icon fas ${itemConfig.icon}`} />
                    </div>
                ))}
            </div>
        );
    }

    private onToolbarItemClick = (e: SyntheticEvent, itemConfig: ITagInputToolbarItemProps): void => {
        e.stopPropagation();
        itemConfig.handler();
    };

    private getToolbarItems = (): ITagInputToolbarItemProps[] => {
        return [
            {
                displayName: strings.tags.toolbar.search,
                className: "search",
                icon: "fa-search",
                handler: this.handleSearch
            },
            {
                displayName: strings.tags.toolbar.moveUp,
                className: "up",
                icon: "fa-arrow-circle-up",
                handler: this.handleArrowUp
            },
            {
                displayName: strings.tags.toolbar.moveDown,
                className: "down",
                icon: "fa-arrow-circle-down",
                handler: this.handleArrowDown
            }
        ];
    };

    private handleSearch = () => {
        this.props.onSearchTags();
    };

    private handleArrowUp = () => {
        this.props.onReorder(this.props.selectedTag, -1);
    };

    private handleArrowDown = () => {
        this.props.onReorder(this.props.selectedTag, 1);
    };
}
