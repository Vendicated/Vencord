import definePlugin from "@utils/types";

export default definePlugin({
    name: "Plugin test",
    description: "Plugin test",
    authors: [
        {
            id: 570717618323980321n,
            name: "Riham",
        },
    ],
    patches: [],
    // Delete these two below if you are only using code patches
    start() {},
    stop() {},
});
