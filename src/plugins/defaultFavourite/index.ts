import definePlugin from "@utils/types";
export default definePlugin({
    name: "DefaultFavourite",
    description: "Makes the gifs button default to favourites.",
    authors: [
        {
            id: 1045027228150419580n,
            name: "Samwich",
        },
    ],
    patches: [
        {
            find: ".GIFPickerResultTypes.SEARCH",
            replacement: [{
                match: "this.state={resultType:null}",
                replace: 'this.state={resultType:"Favorites"}'
            }]
        }
    ]
});