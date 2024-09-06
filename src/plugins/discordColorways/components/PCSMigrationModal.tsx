import { DataStore, useEffect, useState } from "..";
import { ModalProps } from "../types";

export default function ({ modalProps }: { modalProps: ModalProps; }) {
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);
    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
        <h2 className="colorwaysModalHeader">
            Project Colorway has moved
        </h2>
        <div className="colorwaysModalContent">
            <span style={{ maxWidth: "600px", color: "var(--text-normal)" }}>
                In the process of creating a more solid foundation
                for Project Colorway, the main Project Colorway repository has been
                moved from <a role="link" target="_blank" href="https://github.com/DaBluLite/ProjectColorway">https://github.com/DaBluLite/ProjectColorway</a> to{" "}
                <a role="link" target="_blank" href="https://github.com/ProjectColorway/ProjectColorway">https://github.com/ProjectColorway/ProjectColorway</a>
            </span>
            <br />
            <span style={{ textAlign: "center", color: "var(--text-normal)" }}>The default Project Colorway source has been automatically updated/re-added.</span>
            <br />
        </div>
    </div>;
}
