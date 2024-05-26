/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore, Notifications } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { useEffect,useState } from "@webpack/common";


export const settings = definePluginSettings({
    customJs: {
        description: "Custom JS",
        type: OptionType.COMPONENT,
        component: () => {
            const [customJs, setCustomJs] = useState("");

            useEffect(() => {
                (async () => {
                    const storedJs = await DataStore.get("CustomJS_js");
                    setCustomJs(storedJs ?? "");
                })();
            }, []);


            const handleChange = async e => {
                const { value } = e.target;
                await DataStore.set("CustomJS_js", value);
                setCustomJs(value);
            };

            const compileCode = async () => {
                try {
                    const js = await DataStore.get("CustomJS_js");
                    eval(js);
                    Notifications.showNotification({
                        title: "Custom JS",
                        body: "No errors found!",
                    });
                } catch (err) {
                    Notifications.showNotification({
                        title: "Custom JS",
                        body: (err as Error).toString(),
                    });
                }
            };

            return (
                <div>
                    <h3 className="h3__1f119 title__1b7e8 defaultColor_e04945 defaultMarginh3_a8638d">Custom JS:</h3>
                    <div className="inputWrapper_ecb776">
                        <textarea
                            className="inputDefault__22335 input_f27786"
                            placeholder="console.log('Hello World!');"
                            style={{ minHeight: "100px", width: "100%", resize: "vertical" }}
                            onChange={handleChange}
                            onKeyUp={handleChange}
                            defaultValue={customJs}
                        />
                    </div>
                    <button type="button" className="button__581d0 lookFilled__950dd colorBrand__27d57 sizeSmall_da7d10 grow__4c8a4" onClick={compileCode} style={{ marginTop: "10px" }}>
                        <div className="contents__322f4">Execute & Check Errors </div>
                    </button>
                </div>
            );
        },
        restartNeeded: true
    },
});
export default definePlugin({
    name: "Custom JS",
    description: "Loads custom Javascript on start.",
    authors: [Devs.JokerJosh],
    settings,

    async start() {
        try {
            const js = await DataStore.get("CustomJS_js");
            eval(js);
        } catch (err) {
            Notifications.showNotification({
                title: "Custom JS",
                body: (err as Error).toString(),
            });
        }
    },
    stop() {

    }
});
