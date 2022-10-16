import type { Channel, Message } from "discord-types/general";
import { ModalSize, openModal } from "../utils/modal";
import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";
import { lazyWebpack } from "../utils";
import { filters } from "../webpack";

const parser = lazyWebpack(filters.byProps(["codeBlock"]));

export default definePlugin({
    name: "ViewRaw",
    description: "",
    authors: [Devs.Arjix],
    getIcon: () => (
        // source: "Gregor Cresnar" https://www.flaticon.com/free-icon/eye_159604
        <svg
            version="1.0"
            xmlns="http://www.w3.org/2000/svg"
            width="512pt"
            height="512pt"
            viewBox="0 0 512 512"
            preserveAspectRatio="xMidYMid meet"
            fill="currentColor"
        >
            <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)">
                <path d="M2404 4080 c-846 -49 -1644 -502 -2280 -1294 -166 -207 -166 -244 1 -453 635 -793 1436 -1245 2286 -1292 961 -52 1870 402 2585 1293 166 207 166 244 -1 453 -464 579 -1016 977 -1626 1172 -190 61 -419 105 -599 116 -196 11 -238 12 -366 5z m368 -466 c287 -54 563 -250 713 -505 180 -308 199 -680 51 -995 -58 -123 -114 -203 -209 -301 -535 -551 -1446 -383 -1756 324 -112 255 -114 567 -5 833 105 259 334 485 595 588 198 78 396 96 611 56z" />
                <path d="M2455 3130 c-163 -35 -307 -136 -389 -274 -61 -101 -81 -176 -80 -296 0 -116 11 -163 57 -260 43 -89 167 -213 258 -257 321 -155 694 3 810 342 33 97 34 249 2 350 -73 231 -285 392 -528 401 -49 2 -108 -1 -130 -6z" />
            </g>
        </svg>
    ),
    viewRaw: function (
        channel: Channel,
        message: Message,
        clickEvent: MouseEvent
    ) {
        openModal(
            () => {
                return (
                    <div style={{ overflow: "scroll" }}>
                        {parser.codeBlock.react(
                            {
                                lang: "json",
                                content: JSON.stringify(message, null, 3),
                            },
                            null,
                            { key: "viewRawMarkdown" }
                        )}
                    </div>
                );
            },
            { size: ModalSize.LARGE }
        );

        // i don't fucking know why discord does this, but oh well, it's easy to fix.
        document.body.style.userSelect = "auto";
    },
    patches: [
        // prettier-ignore
        {
            find: 'key:"configure",',
            replacement: [{
                match: /(\w{1,2})\((\{key:"copy-link",.+?})\)/,
                replace: (m, Zn, menuItem) => {
                    const items = menuItem.matchAll(
                        /(\w+):((?:["'].+?["'])|(?:[^,}]+))/g
                    );

                    let duplicate = "{";

                    for (const item of items) {
                        switch (item[1]) {
                            case "key":
                                item[2] = '"view-raw"';
                                break;
                            case "label":
                                item[2] = '"View Raw"';
                                break;
                            case "onClick":
                                item[2] = "Vencord.Plugins.plugins.ViewRaw.viewRaw";
                                break;
                            case "icon":
                                item[2] = "Vencord.Plugins.plugins.ViewRaw.getIcon";
                                break;
                        }

                        duplicate += `${item[1]}:${item[2]},`;
                    }
                    duplicate = duplicate.replace(/,$/, "}");

                    return `${Zn}(${duplicate}),${m}`;
                },
            }],
        },
    ],
});
