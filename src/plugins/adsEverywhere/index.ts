/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Inspired by [Kaboodle](https://github.com/ptsteadman/kaboodle) by Patrick Steadman

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

function addAds() {
    const ads = [
        { title: "Is Donald Trump The Best Candidate for 2016?  Vote Here.", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/trump.jpg" },
        { title: "These Photos From The Past Are Bitter Sweet", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/rifle.jpg" },
        { title: "Most Satisfied People Don't Wait For What They Want, They Go Get It", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/satisfied.jpg" },
        { title: "10 Tips To Learn Any Language From The Genius Who Speaks 9", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/genius.jpg" },
        { title: "A Lioness Captures A Baby Baboon And Does The LAST Thing You'd Expect", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/lioness.jpg" },
        { title: "Why 'Who Is This?' Is Literally The Most Insulting Test Ever (Video)", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/whois.jpg" },
        { title: "The Six Worst Types of Coworkers: And How To Deal With Them", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/coworker.jpg" },
        { title: "4 in 5 Americans Are Ignoring Buffet's Warning", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/buffet.jpg" },
        { title: "Warren Buffet Just Gave Americans A Big Warning", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/buffet.jpg" },
        { title: "Americans Urged To Search Their Name On New Site", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/american.jpg" },
        { title: "The Most Addicted Shopping Site For Women", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/addicted.jpg" },
        { title: "Power Companies Fear This Chicago Family", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/solar.jpg" },
        { title: "Six Reasons Your Wifi Is Your Most Important Relationship", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/wif.jpg" },
        { title: "7 Overhyped Games That Ended Up Being Terrible", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/terrible.jpg" },
        { title: "Games That Punish You Seriously For Dying", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/dying.jpg" },
        { title: "Find Out How This Shitty Dude Met A Girl", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/shittydudemale.jpg" },
        { title: "But She Likes It...10 Women Who Dig Shitty Dudes", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/shittydudefemale.jpg" },
        { title: "5 Weiner Dogs Compete In Adorable Water Race", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/weinerrace.jpg" },
        { title: "Healthy Morning Drinks to Start Your Day Off", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/morningdrinks.png" },
        { title: "Best Ways to Scare Your Girlfriend", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/scaregirlfriend.png" },
        { title: "Movies That Ruined the Book", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/booksmovies.png" },
        { title: "The 10 Most Disturbing Pokemon Facts", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/pokemon-facts.png" },
        { title: "How To Impress Employers at Info Sessions", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/infosessions.png" },
        { title: "So You Want to Date an Artist", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/saveartist.png" },
        { title: "Weight-lifting Kangaroo has Neighborhod on High Alert", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/buffkang.png" },
        { title: "Are Lentils a Low-Calorie Food?", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/lents.png" },
        { title: "10 Small Dogs and What They're Like", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/pug.jpg" },
        { title: "15 Hot Female Athletes Who Are Only Famous For Their Looks", image: "https://s3-us-west-2.amazonaws.com/kaboodle/creatives/fathletes.jpg" },
        { title: "Why Everyone is Talking About This New Diet Trend", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZ3PofwCsbzwZ0s7igEHTT6sh4Fx6nLBNQirJAYgP7Lkf7JdSz0pJnjkmfbWvmg66iGOw&usqp=CAU" },
        { title: "10 Insane Facts About the Deep Ocean", image: "https://miro.medium.com/v2/resize:fit:1400/1*zqLjq7hwrduAoTJGeDqgag.jpeg" },
        { title: "This Hack Will Change the Way You Use Your Phone", image: "https://ifixscreens.com/storage/2023/08/How-To-Protect-Your-Phone-From-Hackers-Smartphone-Hacking-Prevention.webp" },
        { title: "The Best Movies You’ve Never Heard Of", image: "https://ecwpress.com/cdn/shop/products/9781550225907_1024x1024.jpeg?v=1479931324" },
        { title: "How This Small Town Turned Into a Tourist Hotspot", image: "https://blog.sheswanderful.com/wp-content/uploads/2020/09/pexels-photo-4473398.jpeg" },
        { title: "The Secret Lives of Billionaires", image: "https://i.ytimg.com/vi/f_loexi83Mg/maxresdefault.jpg" },
        { title: "This Ancient Technique is Helping People Sleep Better", image: "https://physioentrust.com/wp-content/uploads/2021/09/maxresdefault-1024x688.jpg" },
        { title: "DougDoug MugMug", image: "https://gist.github.com/user-attachments/assets/f51072fc-18df-48cb-8b00-ab76232a1b59", href: "https://dougdoug.shop" }
    ];

    function randomize(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const swapIndex = Math.floor(Math.random() * (i + 1));
            [array[i], array[swapIndex]] = [array[swapIndex], array[i]];
        }
    }

    document.querySelectorAll("nav:not([data-adified]), img:not([data-adified])").forEach(target => {
        target.setAttribute("data-adified", "true");
        randomize(ads);
        const wrapper = document.createElement("div");
        if (target instanceof HTMLImageElement) {
            target.parentElement?.replaceChild(wrapper, target);
        } else {
            target.parentNode?.append(wrapper);
        }
        const numRows = (wrapper.offsetHeight / 250);
        const numCols = (wrapper.offsetWidth / 250);
        for (let i = 0; i < (numRows > 0 ? numRows : 1); i++) {
            const row = document.createElement("div");
            wrapper.className = "vc-ads-wrapper";
            wrapper.append(row);
            for (let j = 0; j < (numCols > 0 ? numCols : 1); j++) {
                const ad = ads[i + j];
                const link = document.createElement("a");
                link.href = ad.href ?? "#";

                link.className = "vc-ads-item";

                const img = document.createElement("img");
                img.src = ad.image;
                img.setAttribute("data-adified", "true");

                const caption = document.createElement("p");
                caption.textContent = ad.title;

                link.append(img, caption);
                row.append(link);
            }
        }
    });
    setTimeout(addAds, 1000);
}

export default definePlugin({
    name: "AdsEverywhere",
    description: "See ads everywhere, so Discord feels like a real website.",
    authors: [Devs.Inbestigator],
    start: addAds
});
