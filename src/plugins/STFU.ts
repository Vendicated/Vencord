import definePlugin from "../utils/types";
import { Devs } from '../utils/constants';

export default definePlugin({
    name: "STFU",
    description: "Disables the 'HOLD UP' banner in the console",
    authors: [Devs.Ven],
    patches: [{
        find: "setDevtoolsCallbacks",
        replacement: {
            match: /\.setDevtoolsCallbacks\(.+?else/,
            replace: ".setDevtoolsCallbacks(null,null);else"
        }
    }]
});
