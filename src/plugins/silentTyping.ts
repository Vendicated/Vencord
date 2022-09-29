import definePlugin from '../utils/types';

export default definePlugin({
    name: "SilentTyping",
    author: "Vendicated",
    description: "Hide that you are typing",
    patches: [{
        find: "startTyping:",
        replacement: {
            match: /startTyping:.+?,stop/,
            replace: "startTyping:()=>{},stop"
        }
    }]
});
