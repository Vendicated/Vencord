import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
export default definePlugin({
    name: "DefaultFavouriteGifPicker",
    description: "Makes the gifs button default to favourites.",
    authors: 
    [
        Devs.Samwich
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