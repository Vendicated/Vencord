import definePlugin from "../utils/types";

export default definePlugin({
    name: "foo",
    description: "Just to test",
    author: ["Vendicated"],
    start() {
        console.log("foo");
    }
});