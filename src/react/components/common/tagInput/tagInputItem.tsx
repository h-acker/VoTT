import React, { MouseEvent } from "react";
import { ITag } from "../../../../models/applicationState";

export enum TagEditMode {
    Color = "color",
    Name = "name"
}

export interface ITagClickProps {
    ctrlKey?: boolean;
    altKey?: boolean;
    clickedColor?: boolean;
}

/**
 * Properties for tag input item
 */
export interface ITagInputItemProps {
    /** Tag represented by item */
    tag: ITag;
    /** Index of tag within tags array */
    index: number;
    /** Tag is currently being edited */
    isBeingEdited: boolean;
    /** Tag is currently locked for application */
    isLocked: boolean;
    /** Tag is currently selected */
    isSelected: boolean;
    /** Tag is currently applied to one of the selected regions */
    appliedToSelectedRegions: boolean;
    /** Function to call upon clicking item */
    onClick: (tag: ITag, props: ITagClickProps) => void;
    /** Apply updates to tag */
    onChange: (oldTag: ITag, newTag: ITag) => void;
}

export interface ITagInputItemState {
    /** Tag is currently being edited */
    isBeingEdited: boolean;
    /** Tag is currently locked for application */
    isLocked: boolean;
    /** Mode of tag editing (text or color) */
    tagEditMode: TagEditMode;
}

export default class TagInputItem extends React.Component<ITagInputItemProps, ITagInputItemState> {
    public state: ITagInputItemState = {
        isBeingEdited: false,
        isLocked: false,
        tagEditMode: null
    };

    public render() {
        const style: any = {
            background: this.props.tag.color
        };
        return (
            <div className={"tag-item-block"}>
                {this.props.tag && (
                    <li className={this.getItemClassName()} style={style}>
                        <div className={`tag-color`}></div>
                        <div className={"tag-content"}>{this.getTagContent()}</div>
                        {this.state.isLocked && <div></div>}
                    </li>
                )}
            </div>
        );
    }

    public componentDidUpdate(prevProps: ITagInputItemProps) {
        if (prevProps.isBeingEdited !== this.props.isBeingEdited) {
            this.setState({
                isBeingEdited: this.props.isBeingEdited
            });
        }

        if (prevProps.isLocked !== this.props.isLocked) {
            this.setState({
                isLocked: this.props.isLocked
            });
        }
    }

    private getItemClassName = () => {
        const classNames = ["tag-item"];
        if (this.props.isSelected) {
            classNames.push("tag-item-selected");
        }
        if (this.props.appliedToSelectedRegions) {
            classNames.push("tag-item-applied");
        }
        return classNames.join(" ");
    };

    private getTagContent = () => {
        const displayIndex = this.getDisplayIndex();
        return (
            <div className={"tag-name-container"}>
                <div className="tag-name-body">
                    <span title={this.props.tag.name} className={this.getContentClassName()}>
                        {this.props.tag.name}
                    </span>
                </div>
                <div className="tag-lock-icon">{this.props.isLocked && <i className="fas fa-lock" />}</div>
                <div className={"tag-index"}>{displayIndex !== null && <span>[{displayIndex}]</span>}</div>
            </div>
        );
    };

    private getContentClassName = () => {
        const classNames = ["tag-name-text px-2"];
        if (this.state.isBeingEdited && this.state.tagEditMode === TagEditMode.Color) {
            classNames.push(" tag-color-edit");
        }
        return classNames.join(" ");
    };

    private getDisplayIndex = () => {
        const index = this.props.index;
        const displayIndex = index === 9 ? 0 : index + 1;
        return displayIndex < 10 ? displayIndex : null;
    };
}
