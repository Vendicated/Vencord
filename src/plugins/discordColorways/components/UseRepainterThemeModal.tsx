import { DataStore, useEffect, useState } from "..";
import { ModalProps } from "../types";
import { getRepainterTheme } from "../utils";

export default function ({ modalProps, onFinish }: { modalProps: ModalProps, onFinish: ({ id, colors }: { id: string, colors: string[]; }) => void; }) {
    const [colorwaySourceURL, setColorwaySourceURL] = useState<string>("");
    const [URLError, setURLError] = useState<string>("");
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);

    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
        <h2 className="colorwaysModalHeader">Use Repainter theme</h2>
        <div className="colorwaysModalContent">
            <span className="colorwaysModalSectionHeader">URL: {URLError ? <span className="colorwaysModalSectionError">{URLError}</span> : <></>}</span>
            <input
                type="text"
                placeholder="Enter a valid URL..."
                onInput={e => {
                    setColorwaySourceURL(e.currentTarget.value);
                }}
                value={colorwaySourceURL}
                className="colorwaySelector-search"
            />
        </div>
        <div className="colorwaysModalFooter">
            <button
                className="colorwaysPillButton colorwaysPillButton-onSurface"
                onClick={async () => {
                    getRepainterTheme(colorwaySourceURL).then(data => {
                        onFinish({ id: data.id as any, colors: data.colors as any });
                        modalProps.onClose();
                    }).catch(e => setURLError("Error: " + e));
                }}
            >
                Finish
            </button>
            <button
                className="colorwaysPillButton"
                onClick={() => modalProps.onClose()}
            >
                Cancel
            </button>
        </div>
    </div>;
}
