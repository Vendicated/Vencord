import definePlugin from "../utils/types";

export default definePlugin({
    name: "Folder SVG Icon",
    description: "Doesn't show the small guild icons in folders",
    author: "botato",
    patches: [{
        find: "().expandedFolderIconWrapper",
        replacement: [{
            match: /\(\w\|\|\w\)(&&\(\w=\w\.createElement\(\w+\.animated)/,
            replace: "true$1",
        }]
    }]
});
