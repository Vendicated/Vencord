import definePlugin from '../utils/types';

export default definePlugin({
    name: "bar",
    description: "Just to test",
    author: ["Vendicated"],
    start() {
        console.log("bar");
    }
});