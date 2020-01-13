import React from "react";
import { AssetProviderFactory } from "../../../../providers/storage/assetProviderFactory";

/**
 * Properties for Connection Provider Picker
 * @member onChange - Function to call on change of selected value
 * @member id - ID of HTML select element
 * @member value - Selected value of picker
 */
export interface IConnectionProviderPickerProps {
    onChange: (value: string) => void;
    id: string;
    value: string;
}

/**
 * Creates HTML select object for selecting an asset or storage provider
 * @param props Properties for picker
 */
export default function ConnectionProviderPicker(props: IConnectionProviderPickerProps) {
    const cortexiaApi = AssetProviderFactory.providers.cortexiaApi;

    function onChange(e) {
        props.onChange(e.target.value);
    }

    return (
        <select id={props.id}
            className="form-control"
            value={props.value}
            onChange={onChange}>
            <option value="">Select Provider</option>
            {cortexiaApi && <option key={cortexiaApi.name} value={cortexiaApi.name}>
                {cortexiaApi.displayName}
            </option>}
        </select>
    );
}
