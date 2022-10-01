import { Devs } from "../utils/constants";
import definePlugin from '../utils/types';

export default definePlugin({
    name: "Experiments",
    authors: [Devs.Ven, Devs.Megu],
    description: "Enable Experiments",
    patches: [{
        find: "Object.defineProperties(this,{isDeveloper",
        replacement: {
            match: /(?<={isDeveloper:\{[^}]+,get:function\(\)\{return )\w/,
            replace: "true"
        }
    }, {
        find: 'type:"user",revision',
        replacement: {
            match: /(\w)\|\|"CONNECTION_OPEN".+?;/g,
            replace: "$1=!0;"
        }
    }]
});
