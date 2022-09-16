import definePlugin from '../utils/types';

export default definePlugin({
    name: "Experiments",
    author: "Vendicated",
    description: "Enable Experiments",
    patches: [{
        find: "Object.defineProperties(this,{isDeveloper",
        replacement: {
            match: /(?<={isDeveloper:\{[^}]+,get:function\(\)\{return )\w/,
            replace: "true"
        }
    }, {
        find: "canUseOverrides",
        replacement: {
            match: /(\w)\|\|"CONNECTION_OPEN".+?;/g,
            replace: "$1=!0;"
        }
    }]
});
