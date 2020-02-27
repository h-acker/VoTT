import React from "react";
import _ from "lodash";
import { IToolbarItemRegistration } from "../../../../providers/toolbar/toolbarItemFactory";
import IProjectActions from "../../../../redux/actions/projectActions";
import { IProject } from "../../../../models/applicationState";
import { IToolbarItemProps, ToolbarItem, ToolbarItemType } from "../../toolbar/toolbarItem";
import "./editorToolbar.scss";
import { ToolbarItemName } from "../../../../registerToolbar";

/**
 * Properties for Editor Toolbar
 * @member project - Current project being edited
 * @member actions - Actions to be performed on project
 * @member items - Registered Toolbar items
 */
export interface IEditorToolbarProps {
    project: IProject;
    actions: IProjectActions;
    items: IToolbarItemRegistration[];
    onToolbarItemSelected: (toolbarItem: ToolbarItem) => void;
    setImageNumber: (imageNumber: number) => void;
}

/**
 * State of IEditorToolbar
 * @member selectedItem - Item selected from toolbar
 */
export interface IEditorToolbarState {
    selectedItem: ToolbarItemName;
    imageNumber: number;
}

/**
 * @name - Editor Toolbar
 * @description - Collection of buttons that perform actions in toolbar on editor page
 */
export class EditorToolbar extends React.Component<IEditorToolbarProps, IEditorToolbarState> {
    public state = {
        selectedItem: ToolbarItemName.SelectCanvas,
        imageNumber: 20
    };

    public render() {
        const groups = _(this.props.items)
            .groupBy("config.group")
            .values()
            .value();

        return (
            <div className="btn-toolbar" role="toolbar">
                {groups.map((items, idx) => (
                    <div key={idx} className="btn-group mr-2" role="group">
                        {items.map(registration => {
                            const toolbarItemProps: IToolbarItemProps = {
                                ...registration.config,
                                actions: this.props.actions,
                                project: this.props.project,
                                active: this.isComponentActive(this.state.selectedItem, registration),
                                onClick: this.onToolbarItemSelected
                            };
                            const ToolbarItem = registration.component;

                            return <ToolbarItem key={toolbarItemProps.name} {...toolbarItemProps} />;
                        })}
                    </div>
                ))}
                <div style={{ marginTop: 4 }}>
                    <p style={{ fontSize: 11, marginBottom: 2 }}>Images number</p>
                    <select
                        style={{ marginLeft: 10, marginBottom: 10 }}
                        value={this.state.imageNumber}
                        onChange={this.handleImageNumberChange}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>
        );
    }

    private onToolbarItemSelected = (toolbarItem: ToolbarItem) => {
        this.setState(
            {
                selectedItem: toolbarItem.props.name
            },
            () => {
                this.props.onToolbarItemSelected(toolbarItem);
            }
        );
    };

    private handleImageNumberChange = (event: any) => {
        const imageNumber: number = Number(event.target.value);
        this.setState({ imageNumber });
        this.props.setImageNumber(imageNumber);
    };

    private isComponentActive(selected: ToolbarItemName, componentRegistration: IToolbarItemRegistration) {
        return selected
            ? selected === componentRegistration.config.name &&
                  componentRegistration.config.type === ToolbarItemType.State
            : false;
    }
}
