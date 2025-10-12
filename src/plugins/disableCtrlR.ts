export default {
    name: "DisableCtrlR",
    description: "Disables Ctrl+R / Cmd+R reload shortcut in Discord.",
    authors: [{ name: "TazeXL", id: "0" }],
    details: "Useful for avoiding accidental reloads when you meant to press Ctrl+E.",

    start() {
        this.listener = (e: KeyboardEvent) => {
            if (
                (e.ctrlKey && e.key.toLowerCase() === "r") ||
                (e.metaKey && e.key.toLowerCase() === "r")
            ) {
                e.preventDefault();
                e.stopImmediatePropagation();
                console.log("[DisableCtrlR] Blocked reload shortcut");
            }
        };

        window.addEventListener("keydown", this.listener, true);
    },

    stop() {
        window.removeEventListener("keydown", this.listener, true);
    },
};
