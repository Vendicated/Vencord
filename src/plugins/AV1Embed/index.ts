import { findOption, RequiredMessageOption, Option } from "../../api/Commands";
import definePlugin from "../../utils/types";

const Video: Option = {
    name: "Video",
    displayName: "Video",
    description: "",
    type: 3,
    required: true,
};

const Poster: Option = {
    name: "Poster",
    displayName: "Poster",
    description: "",
    type: 3,
    required: true,
};


export default definePlugin({
    name: "AV1 Embed",
    description: "Creates a link to embed AV1 encoded content",
    authors: [
        {
            id: 217379673519161345n,
            name: "The Nut",
        }
    ],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "av1embed",
            description: "Embeds AV1 video urls using stolenshoes",
            options: [Video, Poster],
            execute: opts => ({
                content: linkify(findOption(opts, "Video", ""), findOption(opts, "Poster", ""))
            }),
        }
    ],
    patches: [],
    start() {},
    stop() {},
});

/*
const Video: Option = {
    name: "Video",
    displayName: "Video",
    description: "",
    type: 3,
    required: true,
};

const Poster: Option = {
    name: "Poster",
    displayName: "Poster",
    description: "",
    type: 3,
    required: true,
};
*/

function linkify(video: string, poster: string): string { return `https://stolen.shoes/embedVideo?video=${video}&image=${poster}`; }
