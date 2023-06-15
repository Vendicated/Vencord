import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";


export default definePlugin({
    name: "Vencordo",
    description: "replace the \"discordo\" sound on startup with something a bit more interesting",
    authors: [
        {
            id: 239809113125552129,
            name: "Snupai",
        },
    ],
    patches: [{
        find: "ae7d16bb2eea76b9b9977db0fad66658.mp3",
        replacement: {
            match: /e\.exports=n\.p\+\"[a-zA-Z0-9]+\.mp3\"/,
            replace: 'e.exports="https://github.com/Snupai/snupai-site/raw/master/sound/nya.mp3"'
        }
    }]
});
