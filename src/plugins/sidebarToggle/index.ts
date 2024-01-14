import definePlugin from "@utils/types";

function toggleView(el) {
    if (el.style.display === "" || el.style.display === "flex") {
        el.style.display = "none";
    } else {
        el.style.display = "flex";
    }
}

function handler(event) {
    if (event.altKey && event.key.toLowerCase() === "s") {
        // WARN: not sure how to safely select classNames since these may change often
        toggleView(document.querySelector('[aria-label="Servers sidebar"]'));
    } else if (event.altKey && event.key.toLowerCase() === "c") {
        // WARN: not sure how to safely select classNames since these may change often
        toggleView(document.querySelector('.sidebar_ded4b5'));
    }
}

export default definePlugin({
    name: "sidebar toggle",
    description: "Adds hotkeys to toggle the channels or server sidebar",
    authors: [
        {
            id: 0n,
            name: "CodaBool",
        },
    ],
    patches: [],
    start() {
        document.addEventListener("keydown", handler);
    },
    stop() {
        document.removeEventListener("keydown", handler);
    }
});
