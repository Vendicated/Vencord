import definePlugin from '../utils/types';
import { Devs } from '../utils/constants';

export default definePlugin({
    name: "SilentTyping",
    authors: [Devs.Ven],
    description: "Hide that you are typing",
    patches: [{
        find: "startTyping:",
        replacement: {
            match: /startTyping:.+?,stop/,
            replace: "startTyping:()=>{},stop"
        }
    }]
});
