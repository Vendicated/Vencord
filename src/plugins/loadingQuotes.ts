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
import definePlugin from "@utils/types";

// These are Xor encrypted to prevent you from spoiling yourself when you read the source code.
// 100 Quotes
const quotes = [
    'Eyrokac',
    "Rdcg$l`'k|~n",
    'H`tf$d&iajo+d`{"',
    'Sucqplh`(Eclhualva()&',
    "Lncgmka'8KNMDC,shpanf'`x./,",
    'Ioqweijnfn*IeuvfvAotkfxo./,',
    'Hd{#cp\x7Ft$)nbd!{lq%mig~*\x7Fh`v#mk&sm{gx nd#idjb(a\x7Ffao"bja&amdkge!Rloìkhf)hyedfjjb*\'^hzdrdmm$lu\'|ao+mnqw$fijxh~bbmg#Tjmîefd+fnp#lpkffz5',
    'h',
    `sijklm&cam*rot"hjjq'|ak\x7F xmv#wc'ep*mawmvvlrb(|ynr>"Aqq&cgg-\x7F ugoh%rom)e\x7Fhdpp%$`,
    'Tnfb}"u\'~`nno!kp$vvhfzeyee"a}%Tfam*Xh`fls%Jboldos-"lj`&hn)~ce!`jcbct|)gdbhnf$wikm$zgaxkmc%afely+og"144?\'ign+iu%p$qisiefr gpfa$',
    "Ndtfv%ahfgk+ghtf$|ir(|z' Oguaw&`ggdj mgw$|ir(me|n",
    "(!ͣ³$͙ʐ'ͩ¹#",
    '(ﾈ◗ロ◑,ﾏ-2ｬﾕ✬',
    'Ynw#hjil(ze+psgwp|&sgmkr!',
    "Tikmolh`(fl+a!dvjk\x7F'y|e\x7Fe/,-",
    '3/3750?5><9>885:7',
    'mdmt',
    'Wdn`khc+(oxbeof',
    'Ig"zkp*\'g{*xolglj`&~g|*gowg/$mgt(Eclm`.#ticf{l*xed"wl`&Kangj igbhqn\'d`dn `v#lqrw{3%$bhv-h|)kangj_imwhlhb',
    'Tscmw%Tnoa~x',
    'I‘f#npus(ec`e!vl$lhsm{`ncu"ekw&f(defeov-$Rnf|)sdu‘pf$wcam{ceg!vl$du\'D`d~x-"jw%oi(okht-"DJP)Kag\x7Fs,!mq$du\'A‐|n sg`akrkq)~jkdl#pj&diefbnf"jp)&@F\\*{ltq#Hlhrp\'',
    'Ynw$v`&cg`dl fml`%rhlhs*',
    "Dnl$p%qhz{s' hv$w%hh|aceg!;#gpvt(fl+cndea`&dg|fon&v#wjjqm(",
    '\ud83d)pft`gs(ec`e!13$qojmz#',
    `a!njcmr'ide~nu"lb%rheoedldpz$lu'gbkr`,
    'dn"zkp&kg\x7Fo4',
    'hnpqkw',
    'sn"fau\x7F',
    'Sn"tmqnh}}*musvkaw&flf&+ldv$w%lr{}*aulr#vlao|)cetn"jp$',
    "Dxkmc%ot(hhxomwwai\x7F'{hln",
    `hd{#}js&(pe~'sg#gprb(3#"`,
    'hd{b${',
    '<;vqkijbq33271:56<3799?24944:',
    'Thof$lu\'ofdn,!qsefc\'az*bnrcma+&Om{o+iu"`khct$)bnrd"bcdoi&',
    'snofplkb{)c\x7F\'r"lod\x7F\'|f*aurv#cpno`abchijklmno',
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
    'nuvp$rgt(aoye',
    'Ynw$v`&T}yoyinp',
    "P`vjakeb(`y+a!tjvqsb&)H~t!jf})&p`f*eedfp$lr'\x7Faoe xmv#sc'of~+mdofw%rh(ykxs!vka%rnel5",
    `Lncgmka)&'*Gijg#e%ukg}b+oo"fwutb{ze%`,
    'Rdvjgpjf|`dl rromkct(hdo cpfslh`(jemfdg-$Djjgz~+tigqa$',
    'Jtqw$rgn|`dl gmq$qnb(ycsem"eeltnmz*\x7Fo!rbmkr\'|ao+lncgmka\'{jxneo,',
    'Lncgmka)&\'*Rot"hjjq\'a}-x rgqmjst(~bnn!guak&s`l*iiuq#j`cc(h*hogdfa%dumha%',
    'Rnqfw%gum)xnd-"umjjb|z*jrd"ahpc+(@-f mmb`lh`(hdo rm#wmirdm*rot,',
    "Dhf#}js'cge| mmb`lh`(ziyedlp$dtb(lrhemnfjq&hxyeyttljplct(oey ecg$oilmz5",
    'Lncgmka)&\'*Hauakmka\'}y*dn!nbwq&ianb\x7F\'r"gv`gj{\'',
    'Tikp$Qc\x7F|)cx Rrljviumm*iy!AkeqAW\\',
    'Hnng$jh\'|`mct-"wl`&jmdox `pf$gcnfn*\x7Femgskwrbl)~d xmvv%udzloe.',
    'Ioqfvq&pa}~r mmb`lh`(}ost!jfv`(\'Dfkoioe-*+&/|ao+ismm}%ot(ge\x7F mmpp%ii(|y".',
    `Lncgmka)&'*\\e!rqkhotm)c\x7F'r"tkwro(}bn vcjp+&Pmef' lmpp%ia(}bn ukna+`,
    "W`kwmka'nfx+tig#upgi||g+psm`avuhz)~d gkmmvn'xfdoeskmc%rom)gnaokmc%ia(ecme/",
    'Lncgmka)&\'*Gijg#sdosagm+fnp#pmc\'x`pqa!ffhlpbzp*lux"lj%g\'N{coax"mmbns&',
    'I&f#idmb(h*go`fjjb&mgbo\' cww$L!j(z~blm"aqc`bz`dl l{#w`htm)em iwnkw(',
    'Bd"seqobf}*|hhnf$qnb(jeoe!oljnc~{)znrgmqi%rom`x+dhejpdj\'ehmbc/',
    "Lncgmka)&'*Bt&q#hlmb(h*cifj.p`eo(\x7Foyshmm$j`'\x7Fh~hhhld$ugnf}*orx,",
    "W`kwmka'nfx+tig#wph'|f*yirg#kk&s`l*oifkwei&og{cqoo,",
    `Lncgmka)&'*_hd"kehusm{y+asg#vphiagm+ar"eevr'iz*\x7Fhd{#gdh)`,
    "Pmgbw`&pi`~+wikoa%rom)ynrwgqw%bh(}bn Lc`ewcii'",
    "Lncgmka)&'*Gijg#sdosagm+fnp#}jsu(ok}oskwa%ubz`ox um#`wiw(go| drjwjbb{'",
    "P`vjakeb$)sduoe#tdbf\x7Fhd' ujf$ciukl*df!vka%ubz\x7Foy hq#wqthfn$",
    'Lncgmka)&\'*_hd"gmbosie*nqtkueici|)em `"gvpkugef%',
    "W`kwmka'nfx+tig#gjbb(}e+cnosmic+(ecee!`z$ioim%*{iygo$g\x7F'x`rnl/",
    "Lncgmka)&'*Gijg#sdrd``dl ujf$utho{oxs!`bv%`nde*~p!kp$dh'Gesfpha#wuiu|'",
    "Rnof$rgtf.~+btkop%oi(h*oax.#ekb'flc\x7Fhdp#sdu'|acx rgqr`t)",
    'Jtqw$d&jgdoet-"ta"tb(bdbtukmc%iimz*jne"yawib{)~dgdvkaw(',
    'P`vjakeb$)gr gpjakb+(`~,s!llp%jncl*|e&pf$igrfjbbnf"b$widcl~%./"Ll%qfa}$',
    "Lncgmka)&'*Bt&q#jjr'x{ehr`qwmkgsafd0 hv$w%bno`~jl!of`lrf|`ee.",
    "W`kwmka'nfx+tig#ldkw{}oyz!km$qnb(~bnemx#pj&u}g*marvfv+",
    "Lncgmka)&'*Ieuvfv%roig*|auakmka'imy' skdlq9",
    'Hnng$jh\'|`mct-"ta"tb(yxdcdqpmka\'j`~x mkha%os/z*j smoh`tdghy\x7Fes"qmac)',
    "Tig#sdos(`y+amolwq&h~lx' cww$|ir/ef+h`tf$qi'clo{ vcjplh`(h*giuvoa%jhfnoy.",
    "Lncgmka)&'*Gijg#upcragm+fnp#e%vhx|fjr!ebi`&ki|dhh/",
    `Lncgmka)&'*_hd"bjqodayk\x7Finl#mv&laefbnf"vw%rhg(`,
    `Rnqfw%gum)xnd-"umjjb|z*jrd"ahpc+(}bbs!nleaoio)yhrdgm$lu'dfdles"wldh'i)bjijw-`,
    "Thof$cjnmz*|hdl#}js zl*go`fjjb*'{hco om#kkc'm\x7Foy.",
    'H`tf$|ir(}xbee"wqwhnfn*bt!meb%gil)ee `ebmk9\'Ga&+w`kw(%os/z*aurv#hjgcagm%',
    'Lncgmka)&\'*_hd"umwrrie*|osng$lu\'jlceg!aljvru}j~nd-"lj`&waqog `v#e%rnel$'
];


// 50 Quotes
const famous_quotes = [
    '"Cg#}jsu{lfm;!guaw\x7Fhfl*nlrg#mv&fd{ojdx"wenci&+*& Nq`ew&Paenn',
    `"Ujf$jhkq)}jy!vl$ai'o{ojt!ulvn&n{)~d mmua%qoi}*rot"gk+$'%)Y\x7Fewg#Njdt`,
    '"Hl#pmtbm)}dreq#M%eff)y~m!ws$`pbzp~cioe#m%nf~l*ge`pmaa&fjf\x7F\x7F mkea?&n|)mder"lj+$\'%)Xdbdpw$Cth{}',
    '"Ujf$css}{o+bdnljbu\'|f*\x7Fhnqf$rnh(kogidtf$lh\'|ao+bdcvp|&hn)~cehp#`wcfez$) ,"Fh`gig{*Yonqfr`js',
    '"Rw`g`ut(`y+nnv#blhfd%*mahnvv`&n{)ddt!dbpdj=(@~+ir"wl`&dg|xjgd"wk%ehf}ceud"wldr\'kf\x7Fetr,!$(&Pagy\x7Foo"@lptd``fg',
    '"Ujf$jhkq)~cioe#s`&oi\x7Fo+tn"eadt\'az*me`p#mqubdo$) ,"Evdhld`d+D/"Qkjub~lf\x7F',
    '"Ujf$jhkq)~cioe#wqgil`dl cgws`ci(pe~ `lg$|irz)mdam"jw%rom)y\x7Fos{#}js\'clo{ ugohlh`(pe~rrgob%gt(}e+wi{#}js\'khd\x7F `akm`pb(`~%"!/#Njtcig*Iemdlvq',
    '"Hd#}js\'\x7Fhd\x7F um#hlpb(h*caqrz$ioam%*\x7Fid"jp%rh(h*lo`n/$kis(}e+pdmsh`&hz)~cioep*\'&*(Hfiesv#Alht|lce',
    `"Xmv$hot{);;0$"lb%rom)ycouq#}js'lfd\x7F ucha+$'%)]jyog#Cwcsrbs`,
    '"Hv#`jct(ge\x7F lcwp`t\'`f}+smmth|&~g|*lo!cp$iiio)kx xmv$ai\'ff~+sums*\'&*(Jeeftajqv',
    '"Ujf$gct|)}jy!vl$utbl`i\x7F ujf$css}{o+ir"wk%eumh~n hv-&%+\'Xl~nr!Fqqfmbz',
    '"Ujf$jhkq)~cioe#pmgs(z~jneq#f`rpmld+ynw#ekb\'qf\x7Fy epfeh&n{)~ce!ujhi&sg)~yy!cm`%rom)hnlhge$qnf|)c\x7F hq#efrriefr qmpwldkm\'(+-!Hlai&Ezf}e',
    '"Emmp%euq)hnc`wpa%os{)e}es.#whokm)hnc`wpa%os(ak{pdlf`+$\'%)Ny.!Qfqvu',
    '"Ujf$jhkq)znrrmm$|ir(hxn egpplhbl)~d cg`khc\'az*\x7Fhd"sawuhf)sdu!ffglbb(}e+bd,!$(&Uiezc Vco`j&Belxxoo',
    '"Mkea%ot(8:. vjbp%nfxyoes!vl$pu\'ign+91\'#ljq\'\x7Fl*ye`aw$qi\'a}$) ,"@ldtkmz*Y.!Qtmkbhde',
    '"Xmv$dtb(go}es"wkj&hdm*\x7Fo!qfp%gig}bnr!elei&hz)~d epfeh&f(go| epfeh(%($*H.R,#H`qn{',
    '"Ujf$btbi}oxt!eokw\x7F\'ag*giwkmc%jnmz*eou"jj%hb~lx+f`nomka+(k\x7F\x7F hl#vlunfn*nvdpz$qojm)}n gcoh+$\'%)Dnlrmm$Hgillfj',
    '"H"kesc\'ff~+f`koaa(\'A\x7Fo+jtqw$cirfm*:0-234%qfqz*\x7Fh`v#sjhs(~eyk/ #)%Rogdkx Dfjwjh',
    '"Ujf$jhkq)~yud"tmvbhe)cx hl#okipagm+ynw#okip(ge\x7Fhhld*\'&*(Zehr`vfw',
    '"Icstlhb{z*bs!llp%uhel~cioe#v`gcq$gjdd,#Mq&dgdox gpli%\x7Fh}{*dwo"bgqohfz$) ,"Geign(Ekfa',
    '"Rw`g`ut(`y+nnv#mk&p`h~+ynw#ldpb$)h~t!ukk%\x7Fh})kye/ #)%Dh(Koendvw',
    '"Ujf$css}{o+sucqpv&sgmkr,!llp%rhefxyov,!$(&Wgyo+Jnjm$Ugrd)CB',
    '"Xmv$fgi|)\x7Fxe!ws$ftbi}c}iu{-$Qnb(deye!{lq%stm%*\x7Fhd"nkwc\'qf\x7F+h`tf*\'&*(Dkra!Cmc`jh}',
    '"Cgom`pb(pe~ bcm$dhc(pe~ `pf$mgkn~kr ujfv`(%($*_hdmgkwc\'Zfexewgop',
    '"Mkea%ot(lc\x7Fhdp#e%bfz`dl `fuakrrzl*dr!llpmoio)k\x7F `no*\'&*(Aogeo"Haijbz',
    '"Xmv$hg~(ak}e!vl$co``}*j ccwpic\'efxn ujbj%iikl*\x7Fo!ujj%os&+*& Lcqcdtb|)^cauakaw',
    '"Ujf$jhkq)fbmhv#pj&h}{*ye`nj~drngg*df!vlijtug~*|imn#f`&h}{*oot`ww%ia(}eoax,!$(&Azhd`lhl#@+&Ugfynvdnw',
    '"Hl#pmc\'mgn\' hvp$kis(}bn xgbvv&nf)sdus"omcc\'|ak\x7F bmvjq(\'A}y+tig#hl`b(`d+ynwq$|cfzz$) ,"Bfwgoid*Gioalhk',
    '"Ujf$jhkq)~yud"te|&sg)ljim"jw%rh(x\x7Fbt/ #)%Duahd+Tsc`}',
    '"Xmv$mgqm)~d mgbvk&s`l*yumgp$j`\'|ao+g`of*%Gil)~ceo"zkp&oi\x7Fo+tn"shd\x7F\'jl~\x7Fes"wldh\'igsdnd"fhvc)*)\'+Am`fvq&Bagy\x7Fehl',
    '"Emmp%db(hlyahf#pj&`a\x7Fo+uq"wl`&`gfn+tn"dk%`hz)~ce!eqadr)*)\'+Jnjm$A(\'Zfi`eggoh`t',
    '"Hd#}js\'\x7Fhd\x7F um#efnnm\x7Fo+gsgbpkct{)y\x7Foq"bwnoio)ldr!rfvhot{`ee.#".$Dhhfpgdur',
    '"Hv#mv&c}{ceg!mvv%bfzboxt!oli`hs{)~cau"ta%kr{}*mobwp$qi\'{lo+tig#hlao|\'(+-!Cqmvrh|eo+Oocpwlu',
    `"Xmvv%rnel*bs!njilrbl%*ooov#sdusm)c\x7F mkumka'{fgnoog#aiub{)fbfd,!$(&T|l|n Kmaw`,
    '"Ujf$jhkq)~cioe#wqgil`dl cgws`ci(pe~ `lg$|irz)mdam"jw%rom)y\x7Fos{#}js\'clo{ ugohlh`(pe~rrgob%gt(}e+wi{#}js\'khd\x7F `akm`pb(`~%"!/#Njtcig*Iemdlvq',
    '"Ujf$jhkq)~cioe#s`&oi\x7Fo+tn"eadt\'az*me`p#mqubdo$) ,"Evdhld`d+D/"Qkjub~lf\x7F',
    `"Ujf$jhkq)}jy!vl$ai'o{ojt!ulvn&n{)~d mmua%qoi}*rot"gk+$'%)Y\x7Fewg#Njdt`,
    '"Emmp%euq)hnc`wpa%os{)e}es.#whokm)hnc`wpa%os(ak{pdlf`+$\'%)Ny.!Qfqvu',
    '"Ujf$jhkq)znrrmm$|ir(hxn egpplhbl)~d cg`khc\'az*\x7Fhd"sawuhf)sdu!ffglbb(}e+bd,!$(&Uiezc Vco`j&Belxxoo',
    '"Mkea%ot(8:. vjbp%nfxyoes!vl$pu\'ign+91\'#ljq\'\x7Fl*ye`aw$qi\'a}$) ,"@ldtkmz*Y.!Qtmkbhde',
    '"Xmv$dtb(go}es"wkj&hdm*\x7Fo!qfp%gig}bnr!elei&hz)~d epfeh&f(go| epfeh(%($*H.R,#H`qn{',
    '"Ujf$btbi}oxt!eokw\x7F\'ag*giwkmc%jnmz*eou"jj%hb~lx+f`nomka+(k\x7F\x7F hl#vlunfn*nvdpz$qojm)}n gcoh+$\'%)Dnlrmm$Hgillfj',
    '"H"kesc\'ff~+f`koaa(\'A)bjvd"iqvr\'nf\x7Fed!33(567(~krs!vkeq&pgg~+wnph*\'&*(]bdm`q#Aaotgg',
    '"Ujf$jhkq)~yud"tmvbhe)cx hl#okipagm+ynw#okip(ge\x7Fhhld*\'&*(Zehr`vfw',
    '"Icstlhb{z*bs!llp%uhel~cioe#v`gcq$gjdd,#Mq&dgdox gpli%\x7Fh}{*dwo"bgqohfz$) ,"Geign(Ekfa',
    '"Ujf$gct|)}jy!vl$utbl`i\x7F ujf$css}{o+ir"wk%eumh~n hv-&%+\'Xl~nr!Fqqfmbz',
    '"Ujf$jhkq)~cioe#pmgs(z~jneq#f`rpmld+ynw#ekb\'qf\x7Fy epfeh&n{)~ce!ujhi&sg)~yy!cm`%rom)hnlhge$qnf|)c\x7F hq#efrriefr qmpwldkm\'(+-!Hlai&Ezf}e',
    '"Emmp%db(hlyahf#kc&ai`f~rd,#Pmot(`y+tig#sd\x7F\'|f*xubafaa(%($*GeCplj%Lfely',
    '"Hv#`jct(ge\x7F lcwp`t\'`f}+smmth|&~g|*lo!cp$iiio)kx xmv$ai\'ff~+sums*\'&*(Jeeftajqv',
    '"Dtfv|&t|{c`e!`qmkat(do+cmmpaw&sg)~ce!lf|q&ogdo+rtl-&%+\'Jhhn Swwl'
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