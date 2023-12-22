/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const detect = {
    detect: function (link) {
      var detected = false;
      var allowed = false;

      settings.allow.split(", ").forEach(function (e) {
        if (link.includes(e)) {
          allowed = true;
        }
      });

      if (allowed) {
        return false;
      }

      settings.match.youtube.split(", ").forEach(function (e) {
        if (link.includes(e)) {
          detected = true;
        }
      });
      settings.match.gifs.split(",").forEach(function (e) {
        if (link.includes(e)) {
          detected = true;
        }
      });
      settings.match.links.forEach(function (e) {
        if (link.includes(e)) {
          detected = true;
        }
      });

      if (detected) {
        return true;
      }
      return false;
    },
    links: function () {
       document.querySelectorAll("[class*='messagesWrapper'] a[href]").forEach((link) => {
        if (detect.detect(link.href)) {
          link.style.backgroundColor = "#ea4335";
          link.style.color = "white";
          link.style.backgroundImage =
            'url("data:image/png;base64,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")';
          link.style.backgroundSize = "auto 100%";
          link.style.backgroundPosition = "right center";
          link.style.backgroundRepeat = "no-repeat";
          link.style.paddingRight = "20px";
          link.style.borderTopRightRadius = "100px";
          link.style.borderBottomRightRadius = "100px";
        }
      });
    },
    media: function () {
      document.querySelectorAll("[class*='messagesWrapper'] img[src]").forEach((img) => {
        if (detect.detect(img.src)) {
          img.src =
            "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2tibDBoZndmZ3lnZnd6OThuY3FoeTgyMDhvZ2VyYXQzY3RkejFkeiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/0A7TaeTWGNsMn3AiJc/giphy.gif";
        }
      });
      document.querySelectorAll("[class*='messagesWrapper'] video").forEach((vid) => {
        if (detect.detect(vid.currentSrc || vid.src)) {
          vid.innerHTML = "";
          vid.setAttribute(
            "src",
            "https://cdn.glitch.global/5602d221-012f-4755-addd-fe0ec13ed024/ezgif-2-2a9edb3674.mp4"
          );
          vid.setAttribute("loop", "true");
        }
      });
    },
  };

async function findRickroll (link) {
    const list = {
        allow:
          "rickastley.co.uk, rblock.glitch.me, anti-rickroll.glitch.me, rickastley.tmstor.es, duckduckgo.com, wikipedia.org, google.com, bing.com, brave.com, microsoft.com, windows.com, insider.com, washingtonpost.com, knowyourmeme.com, dictionary.com, oque-e.com, grunge.com, yourtango.com, wired.com, nytimes.com, bbc.com, cnn.com, npr.org, usatoday.com, theonion.com, economist.com, forbes.com, nationalgeographic.com, time.com, cnet.com, techcrunch.com, amazon.com, ebay.com, github.com, stackoverflow.com, spotify.com, netflix.com, reddit.com, linkedin.com, instagram.com, facebook.com, twitter.com, pinterest.com, reuters.com, apnews.com, abcnews.go.com, theguardian.com, bloomberg.com, cnbc.com, aljazeera.com, newsweek.com, huffpost.com, politico.com, foxnews.com, msnbc.com, latimes.com, chicagotribune.com, thedailybeast.com, axios.com, businessinsider.com, vice.com, w3schools.com, tiagorangel.com, independent.co.uk, guardian.co.uk, cbc.ca, nasa.gov, ted.com, britannica.com, weather.com, quora.com, mentalfloss.com, howstuffworks.com, webmd.com, pbs.org, history.com, sciencedaily.com, lifehacker.com, wired.co.uk, atlasobscura.com, nationalpost.com, theverge.com, apartments.com, cbsnews.com, newyorker.com, billboard.com, rollingstone.com, arstechnica.com, pitchfork.com, espn.com, sciencealert.com, historyextra.com, vox.com, newscientist.com, avclub.com, glitch.com, youtube.com/@Beluga1, cloudflare.com, recaptcha.net, archive.org/search, youtube.com/results?search_query, lemmy.world, tvtropes.org/pmwiki/pmwiki.php, glitch.com/edit, amie.so, cron.com, openai.com, rickblock.glitch.me",
    
        match: {
          youtube:
            "dQw4w9WgXc, LLFhKaqnWwk, p7YXXieghto, oHg5SJYRHA0, 2C9MK0moz8A, 6_b7RDuLwcI, G8iEMVr7GFg, AyOqGRjVtls, 6mhmcwmgWbA, SpZ2FsEfwP4, H01BwSD9eyQ, nrsnN23tmUA, 8mkofgRW1II, rAx5LIul1N8, sO4wVSA9UPs, rrs0B_LM898, doEqUhFiQS4, epyRUp0BhrA, uK5WDo_3s7s, wzSVOcgKq04, 7B--1KArxow, rbsPu1z3ugQ, ptw2FLKXDQE, E50L-JYWm3w, 8leAAwMIigI, ByqFY-Boq5Y, E4ihJMQUmUQ, cjBHXvBYw5s, xaazUgEKuVA, TzXXHVhGXTQ, Uj1ykZWtPYI, EE-xtCF3T94, V-_O7nl0Ii0, cqF6M25kqq4, 0SoNH07Slj0, xfr64zoBTAQ, j5a0jTc9S10, dPmZqsQNzGA, nHRbZW097Uk, BjDebmqFRuc, Gc2u6AFImn8, 8VFzHYtOARw, cSAp9sBzPbc, Dx5i1t0mN78, Oo0twK2ZbLU, cvh0nX08nRw, lXMskKTw3Bc, 7z_1E8VGJOw, VgojnNgmgVs, 5wOXc03RwVA, r8tXjJL3xcM, gvGyS5j9aFY, 6-HUgzYPm9g, hVzINKRbekY, xfr64zoBTAQ, fZi4JxbTwPo, 2bfNgekJG4M, xvFZjo5PgG0, j7gKwxRe7MQ, iik25wqIuFo, pKskW7wJ0v0, LWErcuHm_C4, dRV6NaciZVk, ll-mQPDCn-U, a6pbjksYUHY, MCjlo7PtXMQ, mrThFRR3n8A, QB7ACr7pUuE, HnfkEVtetuE, bIwVIx5pp88, AACOcpA8i-U, j8PxqgliIno, 3HrSN7176XI, E4WlUXrJgy4, HIcSWuKMwOw, eBGIQ7ZuuiU, doEqUhFiQS4, Yb6dZ1IFlKc, 42OleX0HR4E, Rtqkxkt7Hyg, 4dss4Ax9v80, xHEgHjJvR94, SXHMnicI6Pg, 1_RzoIN4CRU, abrWRaoGZ6Q, beh_SP52TaQ, 7_pRiUfp938, 0lZKx-c623E, Bu3B0KaKGng, AS0ZsYTVxcw, H8ZH_mkfPUY, ctr9ZfeyvXg, N1OqUOCF0tY, oJlnI14Nwxg, nsCIeklgp1M, SFXBotRnd7M, OBLOxQu6s_s, WhUMCBb_tAU, 2KQLXav4ZY0, uIkZ7ke0QxM, I5Vu5d_tXOo, yEh_4GqXqFc, fcZXfoB2f70, gMA1FUpuELo, HPk-VhRjNI8, Uj1ykZWtPYI, EE-xtCF3T94, V-_O7nl0Ii0, vkbQmH5MPME, 8O_ifyIIrN4, ikFZLI4HLpQ, 0SoNH07Slj0, xfr64zoBTAQ, cqF6M25kqq4, j5a0jTc9S10, sXwaRjU7Tj0, j5a0jTc9S10, 1WyqFQuWrFg, vkbQmH5MPME, VSa2IqDwnQ8, -ioFOx_pE6w, nQGsT44rVjk, fMnIpIMuBJI, nHRbZW097Uk, fZi4JxbTwPo, 8O_ifyIIrN4, MLWUSH-YNUk, V-_O7nl0Ii0, Y5zbaF097lQ, _sWG4uhLiWo, cqF6M25kqq4, _h0kLUU-Gxs",
    
          gifs: "tenor.com/ywGcakuIXTMAAAAM/unrickrollreversecard,tenor.com/s7dLt8kL4zcAAAAM/unrickrollbytominouyt,tenor.com/ZTqwW0sOvYsAAAAM/unrickroll-cool,tenor.com/plVyagQRVhoAAAAM/rick-roll,tenor.com/1V-2t7coAQQAAAAM/rickroll-rick-roll-rick-astley-rick-roll-rick-rick-rickroll,tenor.com/wf3j_kMSeYAAAAAM/rick-roll-rick,tenor.com/8bcxeq0FRkoAAAAM/funny,tenor.com/Ost-XwRQhXoAAAAM/rick-roll,tenor.com/OioDKdRUjWEAAAAM/rick-roll,tenor.com/m0bPHVGPgFsAAAAM/unrickroll-card,tenor.com/4HVBtKGyOcUAAAAM/the-darkest-mode-je-tlir-tdmjt,tenor.com/ftyw4WkOtVoAAAAM/rickroll,tenor.com/N1FZyOXW4VEAAAAM/rickroll,tenor.com/YZmaj_qzJrsAAAAM/rickroll,tenor.com/6WPve7lwPbkAAAAM/un-rick-roll-rick-roll,tenor.com/bGNRCRLPHOUAAAAM/rickroll,tenor.com/_PXSxg3VteoAAAAM/ashgivingnitro,tenor.com/Rq9Xv-s-kksAAAAM/rick-roll,tenor.com/80vfPW3pcBcAAAAM/rick-roll,tenor.com/FDHjsCasOdAAAAAM/rickroll,tenor.com/uNn3MNOhW-UAAAAM/rick-astley,tenor.com/wiwQvdYH7IQAAAAM/rick-roll,tenor.com/acLHyusK_RkAAAAM/rick-roll,tenor.com/RwuTTaB2_KsAAAAM/rickroll,tenor.com/H7UVoBUN4bgAAAAM/rick-astley,tenor.com/Z-_ubVAThX0AAAAM/hehe-boy,tenor.com/oOjnFj7aJSYAAAAM/rickastley,tenor.com/xG5FhcJXf6IAAAAM/leclerc-deepfake,tenor.com/NHwoER87SUcAAAAM/str%C3%B6vt%C3%A5g-i-hembygden,tenor.com/AsK9t0hQLWIAAAAM/rick-roll,tenor.com/ZnuljWZAxfMAAAAM/pop-cat,tenor.com/WoC0nV8hmwUAAAAM/rickroll,tenor.com/Rwu8lyL-M8wAAAAM/never-gonna-give-you-up,tenor.com/M2mJZAHtcv4AAAAM/smoke-x,tenor.com/Sab8pdx919cAAAAM/rick-roll,tenor.com/QxXp3AcYLY0AAAAM/rickroll-wolfbloxs-gif,tenor.com/I7dJY4Q6lgIAAAAM/abcrickroll,tenor.com/U9ljWWvJ6z8AAAAM/rick-roll,tenor.com/molZu5QCv_cAAAAM/pjsk-rickroll,tenor.com/7ai8wCP8fBAAAAAM/rickroll,tenor.com/A9DTi-gUGMkAAAAM/discord-notice,tenor.com/CjjH_kzaTGMAAAAM/discord-notice,tenor.com/VLK9vLnzSHQAAAAM/rihanna,tenor.com/vc686HlCe5gAAAAM/rickroll,tenor.com/YxxPv2vPlg0AAAAM/among-us-meme,tenor.com/AJnLCDMnMIkAAAAM/rickroll,tenor.com/sy3upAhNyOMAAAAM/rickroll-rick,tenor.com/zdM8qjvu72AAAAAM/rick-roll-gif,tenor.com/3sMo5H2JQw0AAAAM/rick-roll,tenor.com/9MZ3iUCMj_wAAAAM/rick-roll,tenor.com/q0Ejci9EQhcAAAAj/rick-astley-rick-roll,tenor.com/nBt6RZkFJh8AAAAj/never-gonna,tenor.com/gNv3O0hRDrcAAAAj/rickroll-rick,tenor.com/Cj3sLJg6mo0AAAAj/rickroll,tenor.com/JKqs7cUyi9gAAAAj/rick-astley-dance,tenor.com/jo3Dz7gL5LkAAAAj/never-gonna-give-you-up-rick,tenor.com/FZQVvhCw66kAAAAj/rick-astley-rick-roll,tenor.com/CHc0B6gKHqUAAAAj/deadserver,tenor.com/Ru81f5Z4K-YAAAAj/baldi-rickroll,tenor.com/yFDsWmwc0gkAAAAj/rick-roll-rick-astley,tenor.com/7jOYGdsyu1QAAAAj/rick-roll-rick-astley,tenor.com/xo0jvr4bbTMAAAAj/rick-astley-rickroll,tenor.com/ULJn9_2K17UAAAAj/wazatoz-rick-roll,tenor.com/V4D-3LyhfLcAAAAj/benjammins-jamming,tenor.com/-95pYCtFE-IAAAAj/piano-sheep-rick-roll,tenor.com/PM7ih8AUCfUAAAAj/rickroll,tenor.com/MplpM4-ljFsAAAAj/hololive-momosuzu-nene,tenor.com/J3256XF1DFcAAAAj/rick-roll,tenor.com/dQw-UGON9l4AAAAj/rickroll,tenor.com/NNW7RmMMB3gAAAAj/rick-roll-discord,tenor.com/4PW7GRgoz5IAAAAj/rick-roll-rick-astley,tenor.com/yzQj6APQvAQAAAAj/jones-beagle,tenor.com/KVZX-Jjkv0cAAAAj/invisible-rick-roll,tenor.com/Vtqq4_mr2V0AAAAj/rick-astley-crying-rickroll-crying,tenor.com/WfQR-n3TclUAAAAj/lol,tenor.com/EC7hjOwcc28AAAAj/strike-dex-wendex-wen-dex,tenor.com/Kd_JeEiMW1MAAAAj/rick-rolled,tenor.com/d2HOV8OO7h8AAAAj/rickroll-gif,tenor.com/zmLdNkNRMcwAAAAj/rickroll-rick-astley,tenor.com/U8LxQxSfWWIAAAAj/rickroll,tenor.com/v50sh2He1AAAAAAj/rickroll-rick,tenor.com/JgzL2EiiuBwAAAAj/rickroll,tenor.com/zuWiNsNjKPYAAAAj/rick-astley-together-forever,tenor.com/osgmrWdZJ9EAAAAj/rick-roll,tenor.com/5w48Grc-7MwAAAAj/scatman-shbar,tenor.com/CiHdQjW_doYAAAAj/rickroll-discord-background,tenor.com/d17LauhEsucAAAAj/euj-challenge-euj-doge,tenor.com/kwimECIRYeAAAAAj/rick-astley-fighter,tenor.com/tkhBN6TlHkoAAAAj/bttv-rolling-cat,tenor.com/8xGcAUS6GYoAAAAj/never-gonna-give-you-up,tenor.com/wUo2J1-yfF8AAAAj/meme-rickroll,tenor.com/XqxCXnSAd4QAAAAj/dance-parrot,tenor.com/YAUMFOCgUu4AAAAj/think,tenor.com/p7eYyrx85QgAAAAj/dreary-rickroll,tenor.com/du2PvIMeYAEAAAAj/he-roll,tenor.com/Q-wp004xiLgAAAAj/omegalul-omegaluliguess,tenor.com/hQYqVV4aPjkAAAAj/roy-rick-roll,tenor.com/3czDyFK_eoQAAAAM/rickroll,tenor.com/PIeaEOt0PygAAAAj/carltriggered-carl,tenor.com/KAkwFSnWP7MAAAAj/rock,tenor.com/WW5cV8oKlXYAAAAj/primate-primates,tenor.com/yeKQyZZ9-OAAAAAM/rick-astley-dancing,tenor.com/xWaa0fllYu0AAAAM/mancake-mancakepancake,tenor.com/xu1Dj2mzPiQAAAAM/rick-roll-rick-astley,tenor.com/kgTmr-O84QMAAAAM/one,tenor.com/lOWUNmaKBIoAAAAM/bobux-roblox,tenor.com/lQxToHbuUNwAAAAM/rick-roll,tenor.com/zCYhfl6TQ_kAAAAM/hidden-rickroll-rickroll,tenor.com/PZzJzerf_t0AAAAM/izbandut-i%CC%87zbandut,tenor.com/Mwj3XGXRc-4AAAAM/rickrol-dancingl,tenor.com/6a_rjaVOCioAAAAM/rickroll-happy-birthday-rickroll,tenor.com/zwBJBN8vSyIAAAAM/rick,tenor.com/aLaWpv8oVeMAAAAM/rick-roll-birthday-card,tenor.com/YEyhybcl584AAAAM/rickroll-rick-astley,tenor.com/VmRGag4XRKsAAAAM/custom-rick-roll-profile,tenor.com/6-ZJXQy2EX8AAAAM/rick-astley-rick-roll,tenor.com/zR_Zvk1g4IEAAAAM/famousseamus51-freddo,tenor.com/BSrfFHrFstQAAAAM/xeli-xeli-rick,tenor.com/1Zuvs6wsvEsAAAAM/rickroll-hidden-rickroll,tenor.com/3vParT-JxWsAAAAM/jono-dance,tenor.com/D8SsXBJvBskAAAAM/sumsar-gato,tenor.com/PIveZx1VZm8AAAAM/gotggame-gotgthegame,tenor.com/_Lwz3Yvl_KgAAAAM/ava-love,tenor.com/M8K4xOgrJ0UAAAAM/when-it-bruh-moment,tenor.com/0rrEPmFf9GwAAAAM/rickroll-women-kissing,https://media1.giphy.com/media/gfv0mlAow94QmIoZLX/200w.gif,https://media3.giphy.com/media/XLhLFIv4dCgf1tMeqd/200w.gif,https://media3.giphy.com/media/YdhIGSfonAgQDmqFeA/200w.gif,https://media1.giphy.com/media/vKkLFT2ETub2NFfSvo/200w.gif,https://media0.giphy.com/media/Vuw9m5wXviFIQ/200.gif,https://media0.giphy.com/media/Ju7l5y9osyymQ/200.gif,https://media2.giphy.com/media/Wrh8aL75aj4uZwuqta/200w.gif,https://media4.giphy.com/avatars/default3/80h.gif,https://media0.giphy.com/media/LXONhtCmN32YU/200.gif,https://media2.giphy.com/media/10kABVanhwykJW/200.gif,https://media2.giphy.com/media/a6OnFHzHgCU1O/200.gif,https://media2.giphy.com/media/fRB9j0KCRe0KY/200.gif,https://media3.giphy.com/media/qrgLASJKfY08PcrxcJ/200w.gif,/search/rick-astly-gifs,/search/rick-rolled-gifs,/never-gonna-give-you-up-gifs,/view/rick-astly-rick-rolled-gif-22755440,rickroll-roll-rick-never-gonna-give-you-up-never-gonna-gif-22954713,drink-water-drink-water-meme-rickroll-drink-water-rickroll-gif-26472664,view/rickroll-eyetest-amogus-gif-26059483,view/hugs-rickroll-gif-24588121,IvQAHsw0ivsAAAAM/suffer-rickroll,kGekz062mwgAAAAM/hugs-rickroll,CWgfFh7ozHkAAAAM/rick-astly-rick-rolled,GLJyB8cqzQoAAAAM/rickroll-eyetest,ximuwFitO98AAAAM/drink-water-drink-water-meme,5bhEB3UYIC4AAAAM/rickroll,x8v1oNUOmg4AAAAd/rickroll-roll,wTKt4BjN7TsAAAAd/zant-just-got-rick-rolled-zant,LUbHxj8HBgYAAAAM/simple-hack-simple-trick,5fbVmtFJsrAAAAAM/hahahahahaah-lol,H4uuiyocI0QAAAAM/rickroll-discord,seWSyfIpUCAAAAAM/rickroll,onTlUVMtWy4AAAAM/rickroll-rick,c3JHQwpnnbcAAAAM/get-rick-rolled-hacker,sl_sSCM8w1sAAAAM/alan-walker-logo,wTKt4BjN7TsAAAAd/zant-just-got-rick-rolled-zant,WWTo92qOBaIAAAAM/max-maxim,Tc-TUkHTki4AAAAM/rick-roll,kGekz062mwgAAAAM/hugs-rickroll,x8v1oNUOmg4AAAAM/rickroll-roll,?size=64&name=starroll,?size=64&name=rickroll2,?size=64&name=rickroll%7E1,?size=64&name=rickroll1",
    
          links: [
            "rr.noordstar.me",
            "chickenroad.org",
            "rroll.to",
            "boulderbugle.com",
            "rick.amigocraft.net",
            "my-names-not-rick.vercel.app",
            "bringvictory.com",
            "d.iscord.gq",
            "galeonn.org",
            "tinyurl.eu.aldryn.io",
            "the-circle-illusion.netlify.app",
            "therickroll.com",
    
            // URLS
            "archive.org/download/Rick_Astley_Never_Gonna_Give_You_Up/Rick_Astley_Never_Gonna_Give_You_Up",
    
            // MTDV mirrors
            "r.mtdv.me",
            "blogs.mtdv.me",
            "myshop.rocks",
            "newskit.social",
            "blogs.motiondevelopment.top",
    
            // The Great Rickroller links
            "0quizz.glitch.me",
            "1use-msg.glitch.me",
            "2day-project.glitch.me",
            "2vscode.glitch.me",
            "3blog.glitch.me",
            "alpinejs-blog.glitch.me",
            "ancient-ambitious-viscount.glitch.me",
            "chatgpt-web.glitch.me",
            "codingar.glitch.me",
            "ddg-win.glitch.me",
            "easyform.glitch.me",
            "echo-it.glitch.me",
            "email-redirect.glitch.me",
            "foobar-loader.glitch.me",
            "fragrant-sweet-hyssop.glitch.me",
            "free-shorten.glitch.me",
            "freecord.glitch.me",
            "freedevblog.glitch.me",
            "freelink.glitch.me",
            "freemix.glitch.me",
            "freepng.glitch.me",
            "freetechdocs.glitch.me",
            "gdframework-docs.glitch.me",
            "get-freerobux.glitch.me",
            "get-thingy.glitch.me",
            "getshortn.glitch.me",
            "gnu2.glitch.me",
            "gomix-redirect.glitch.me",
            "gpt4bot.glitch.me",
            "har-framework.glitch.me",
            "horn-zinc-echinodon.glitch.me",
            "instantloader.glitch.me",
            "jhon-codingblog.glitch.me",
            "linkanalytics.glitch.me",
            "linknail.glitch.me",
            "linkshortner.glitch.me",
            "msg-road.glitch.me",
            "mu-read.glitch.me",
            "openai-api.glitch.me",
            "project-webring.glitch.me",
            "readmsg.glitch.me",
            "shorter-stage.glitch.me",
            "shortnr.glitch.me",
            "sidewaysragdoll.glitch.me",
            "smallyoutube.glitch.me",
            "tgc-starter.glitch.me",
            "tgc2.glitch.me",
            "the-ia-blog.glitch.me",
            "thedevfreeblog.glitch.me",
            "thisisit-blog.glitch.me",
            "tiagorangel-links.glitch.me",
            "tinyurl-remix.glitch.me",
            "unofficial-community-discord.glitch.me",
            "webcomic3.glitch.me",
            "website-staging.glitch.me",
            "winterberry-jokes.glitch.me",
            "worser.glitch.me",
            "xkcd-api2.glitch.me",
            "xn--ds8h.glitch.me",
            "xn--n28h.glitch.me",
            "💡.glitch.me",
            "😉.glitch.me",
          ],
        },
      };

      if (detect.detect(link)) {
        return true;
      } else {
        return false;
      }
}

var inter;

export default definePlugin({
    name: "RickrollBlocker",
    description: "Detects and blocks most rickrolls.",
    authors: [Devs.TiagoRangel],
    dependencies: ["CommandsAPI", "MessageEventsAPI"],
    commands: [
        {
            name: "check link",
            description: "Checks a link for potential rickrolls.",
            inputType: ApplicationCommandInputType.BOT,
            options: [{
                type: ApplicationCommandOptionType.STRING,
                name: "link",
                description: "The URL to check",
                required: true
            }],

            execute: async (args, ctx) => {
                const url = args[0].value;

                if (findRickroll(url)) {
                    sendBotMessage(ctx.channel.id, {
                    content: `
                        ⚠️ A rickroll was detected on that link.
                    `.trim().replace(/\s+/g, " ")
                });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: `
                            ☑️ No rickrolls found
                        `.trim().replace(/\s+/g, " ")
                    });
                }
                
            }
        }
    ],
    async start() {
        inter = setInterval(function () {
          detect.links();
          detect.media();
        }, 1400)
    },

    stop() {
        clearInterval(inter)
    }
});

