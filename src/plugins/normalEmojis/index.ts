import definePlugin from "@utils/types";
import style from "./style.css";

let interval: NodeJS.Timeout;
let styleElement: HTMLStyleElement;
export default definePlugin({
    name: "Normal Emojis",
    description: "Automatically remove src attributes from emojis.",
    authors: [{ name: "Tijme", id: 331821337586827265n }],
    start() {
        interval = setInterval(
            () =>
                document
                    .querySelectorAll(
                        "img.emoji:not([data-id]):not(.primaryEmoji_e58351)",
                    )
                    .forEach((e) => e.setAttribute("src", "")),
            100,
        );

        // Inject CSS (style.css)
        styleElement = injectCSS(style);
    },
    stop() {
        clearInterval(interval);
        styleElement.remove();
    },
});

const injectCSS = (css: string) => {
    let el = document.createElement("style");
    el.innerText = css;
    document.head.appendChild(el);
    return el;
};
