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

import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

// These are Xor encrypted to prevent you from spoiling yourself when you read the source code.
const quotes = [
    "Eyrokac",
    "Rdcg$l`'k|~n",
    'H`tf$d&iajo+d`{"',
    "Sucqplh`(Eclhualva()&",
    "Lncgmka'8KNMDC,shpanf'`x./,",
    "Ioqweijnfn*IeuvfvAotkfxo./,",
    'Hd{#cp\x7Ft$)nbd!{lq%mig~*\x7Fh`v#mk&sm{gx nd#idjb(a\x7Ffao"bja&amdkge!Rloìkhf)hyedfjjb*\'^hzdrdmm$lu\'|ao+mnqw$fijxh~bbmg#Tjmîefd+fnp#lpkffz5',
    "h",
    "sijklm&cam*rot\"hjjq'|ak\x7F xmv#wc'ep*mawmvvlrb(|ynr>\"Aqq&cgg-\x7F ugoh%rom)e\x7Fhdpp%$",
    'Tnfb}"u\'~`nno!kp$vvhfzeyee"a}%Tfam*Xh`fls%Jboldos-"lj`&hn)~ce!`jcbct|)gdbhnf$wikm$zgaxkmc%afely+og"144?\'ign+iu%p$qisiefr gpfa$',
    "Ndtfv%ahfgk+ghtf$|ir(|z' Oguaw&`ggdj mgw$|ir(me|n",
    "(!ͣ³$͙ʐ'ͩ¹#",
    "(ﾈ◗ロ◑,ﾏ-2ｬﾕ✬",
    "Ynw#hjil(ze+psgwp|&sgmkr!",
    "Tikmolh`(fl+a!dvjk\x7F'y|e\x7Fe/,-",
    "3/3750?5><9>885:7",
    "mdmt",
    "Wdn`khc+(oxbeof",
    'Ig"zkp*\'g{*xolglj`&~g|*gowg/$mgt(Eclm`.#ticf{l*xed"wl`&Kangj igbhqn\'d`dn `v#lqrw{3%$bhv-h|)kangj_imwhlhb',
    "Tscmw%Tnoa~x",
    "I‘f#npus(ec`e!vl$lhsm{`ncu\"ekw&f(defeov-$Rnf|)sdu‘pf$wcam{ceg!vl$du'D`d~x-\"jw%oi(okht-\"DJP)Kags,!mq$du'A‐|n sg`akrkq)~jkdl#pj&diefbnf\"jp)&@F\\*{ltq#Hlhrp'",
    "Ynw$v`&cg`dl fml`%rhlhs*",
    "Dnl$p%qhz{s' hv$w%hh|aceg!;#gpvt(fl+cndea`&dg|fon&v#wjjqm(",
    "\ud83d)pft`gs(ec`e!13$qojmz#",
    "a!njcmr'ide~nu\"lb%rheoedldpz$lu'gbkr",
    "dn\"zkp&kgo4",
    "hnpqkw",
    "sn\"fau",
    "Sn\"tmqnh}}*musvkaw&flf&+ldv$w%lr{}*aulr#vlao|)cetn\"jp$",
    "Dxkmc%ot(hhxomwwai'{hln",
    "hd{#}js&(pe~'sg#gprb(3#\"",
    "hd{b${",
    "<;vqkijbq33271:56<3799?24944:",
    "Thof$lu'ofdn,!qsefc'az*bnrcma+&Om{o+iu\"`khct$)bnrd\"bcdoi&",
    "snofplkb{)c'r\"lod'|f*aurv#cpno`abchijklmno",
    "Stonkkoio)zbxdnp$j`'xf}nr/,-",
    'Sqkmjlh`(|z+tig#ldkt|lx+wigfhv()&',
    "Lncgmka'i~oxolgmavu+(yfnarg#sdos&",
    "Rdvjgpjf|`dl rromkct&'$",
    "Bsgtmka'i)|bruwbh%vh|`ee./,",
    `Sdlgmka'mdeair"wk%rom)ynrwgq*+(`,
    'W`pnmka\'}y*\x7Fhd"pawpbzz*gijg#e%dh{z+',
    'Vdlwqwoio)cetn"wl`&canc\x7Fam"bf|ut&\'$',
    'Lncgmka)&\'*iebcvw`&pi`~bnf"aqljc{)icasc`p`t&',
    "Hnngmka'{ykhe!cm`%rnel*\x7Fofgwl`t)&'",
    `Ptvwmka'gg*j ekpgj&ag{*\x7Fhd"amqu'ign+bxvfw+()`,
    'Thahhlh`(}bn bmga%oi|f*jcuklj+()',
    'Sqpfeaoio)nbghvbh%usi{n~su,-*',
    "Lncgmka'd`an hv$w%rom)Gjtsk{*+(",
    "Psguakrnfn*bnugqj`r'|{kmfha#ndkt&'$",
    "Rhfjjb&s`l*go`fjjb&ei{*gijg#e%thdeoy bmbwqcu&'$",
    "Btdeawoio)k|ermnakct{'$%",
    `Cnlumkenfn*\x7Fhd"pawpbz)c\x7F'r"mkq&Jggnjy/,-`,
    "M`ijjb&s`l*xestfv%trf)ljsugq$qnff)_xahl#Fjjs&'$",
    'Eovbjbjnfn*zu`lwqh&ea}y+fnp#bdusm{*go`fjjb()&',
    "Cicpmka'lf}e ujf$igt|)zbxdn-*+",
    'Bskmclh`(dofer"wk%jnnl$%.',
    "Hnngmka'|ao+dnmq$ciu(eejdhld$utho{oxs/,-",
    'Oog#whgkd)y\x7Feq"ekw&kghnbnf.#kkc\'o`ket!nfeu&ag{*Oiralva(',
    'nuvp$rgt(aoye>',
    'Ynw$v`&T}yoyinp#>,'
];

const famous_quotes = [
    '"Cg#}jsu{lfm;!guaw\x7Fhfl*nlrg#mv&fd{ojdx"wenci&+*& Nq`ew&Paenn"',
    `"Ujf$jhkq)}jy!vl$ai'o{ojt!ulvn&n{)~d mmua%qoi}*rot"gk+$'%)Y\x7Fewg#Njdt`
];

const settings = definePluginSettings({
    famousQuotesOnly: {
        type: OptionType.BOOLEAN,
        description: "Only shows you quotes of famous People",
        default: false,
    },
});

export default definePlugin({
    name: "LoadingQuotes",
    description: "Replace Discords loading quotes with random quotes",
    authors: [Devs.Ven, Devs.KraXen72, Devs.notderpaul],
    settings,

    patches: [
        {
            find: ".LOADING_DID_YOU_KNOW",
            replacement: {
                match: /\._loadingText=.+?random\(.+?;/s,
                replace: "._loadingText=$self.quote;",
            },
        }
    ],

    xor(quote: string) {
        const key = "read if cute";
        const codes = Array.from(quote, (s, i) => s.charCodeAt(0) ^ (i % key.length));
        return String.fromCharCode(...codes);
    },

    get quote() {
        const quotesArray = Vencord.Settings.plugins.LoadingQuotes.famousQuotesOnly ? famous_quotes : quotes;
        return this.xor(quotesArray[Math.floor(Math.random() * quotesArray.length)]);
    }
});