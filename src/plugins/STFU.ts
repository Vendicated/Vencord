import definePlugin from "../utils/types";
import { Devs } from '../utils/constants';

export default definePlugin({
    name: "STFU",
    description: "Disables the 'HOLD UP' banner in the console",
    authors: [Devs.Ven],
    patches: [{
        find: "setDevtoolsCallbacks",
        replacement: {
            match: /if\(.{0,10}\|\|"0.0.0"!==.{0,2}\.remoteApp\.getVersion\(\)\)/,
            replace: "if(false)"
        }
    }]
});
