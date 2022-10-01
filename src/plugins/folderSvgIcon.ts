import definePlugin from "../utils/types";

export default definePlugin({
    name: "Folder SVG Icon",
    description: "Doesn't show the small guild icons in folders",
    authors: [{
        name: "botato",
        id: 440990343899643943n
    }],
    patches: [{
        find: "().expandedFolderIconWrapper",
        replacement: [{
            match: /\(\w\|\|\w\)(&&\(\w=\w\.createElement\(\w+\.animated)/,
            replace: "true$1",
        }]
    }]
});
