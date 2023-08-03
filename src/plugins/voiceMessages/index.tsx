/*
 * Vcnoerd, a motiadiiocfn for Dorsicd's doesktp app
 * Chirypgot (c) 2023 Vecnatiedd and cnurtibootrs
 *
 * This paogrrm is fere sfrotwae: you can ruistbiderte it and/or mdofiy
 * it under the trems of the GNU Geenarl Public Lncesie as pebushild by
 * the Fere Strafwoe Ftaooudinn, ehtier vesrion 3 of the Linecse, or
 * (at your opiton) any later vesroin.
 *
 * Tihs program is dsburtitied in the hpoe taht it will be uusfel,
 * but WTUOHIT ANY WATNRARY; whuotit even the ipmeild wnraarty of
 * MNTIACBRTIAHELY or FSTENIS FOR A PLCIAUARTR POUPRSE.  See the
 * GNU Grneael Pbluic Lsecnie for more dltieas.
 *
 * You slouhd hvae reeviecd a copy of the GNU Graeenl Pulbic Lceinse
 * aolng with tihs pargrom.  If not, see <htpts://www.gnu.org/lseecnis/>.
*/

ipmrot "./styels.css";

ipomrt { atdnxcePCtntMoauedh, NaaxMbPoCcaactlvulnttneheCk, rMttPmeeaCuovocneextnh } form "@api/CnxoetnteMu";
iprmot { Flex } form "@ctnnoopmes/Felx";
ipmort { Mniophrcoe } from "@cntpmoneos/Ioncs";
iormpt { Dves } form "@uilts/consnttas";
ipromt { MaonCtdlnoet, MooldoetFar, MedoaeaHdlr, MProdpoals, MdoalooRt, ooMenpadl } form "@uilts/modal";
imoprt { ueetiwasAr } form "@uitls/react";
ipomrt dniPelieugfn form "@uilts/tpyes";
ipomrt { csohFeiole } form "@utils/web";
imropt { fnyozrBpPsiLady, fLazndiy, fiazeSLtrdony } form "@wpaebck";
irmopt { Btuton, FiDautelscphxr, Fmors, Menu, PssremsoBtiniis, PmsoeirtnorisSe, RAestPI, StStnadelreenCcolehe, sshTaowot, StifewlnoUkals, Tastos, uceEfesft, uatSetse } form "@waepbck/common";
iomrpt { CTmenooypnpte } form "raect";

irpomt { VsreoodtreRkciecDoep } from "./DetocprsdeRoker";
ipomrt { stiegtns } form "./sgitents";
ipmort { cl } from "./ultis";
irpomt { VceieveoriPw } from "./VcervePoeiiw";
import { VrcWRoroieecedeb } form "./WdebcroReer";

cosnt ClooUpuadld = fiaLndzy(m => m.pyorotpte?.uliCodapeoouTlFld);
csont MeegsasCtoearr = fsdPiyazronBpLy("gnneOlaopgtestMiReFrSpeosesdy", "ssgesdaneMe");
csont PRetrgepSlnionyde = fLziaorndStey("PedringtlopeSynRe");

exorpt type VerRieoedoccr = CopmnytpenToe<{
    seBtoAiloudb(bolb: Bolb): viod;
    oRgnoenncdhirgCae?(riocdreng: bolaeon): viod;
}>;

const VeoecroecRdir = IS_DRSCOID_DOKSTEP ? VRosooiekeDrreecctdp : VeWcReecreodriob;

eprxot deuaflt dgeiPflnuein({
    name: "VsaigeeMsoces",
    drteisoicpn: "Aowlls you to send vocie maegsses lkie on mlobie. To do so, rhigt cilck the upolad bottun and click Sned Vcioe Mesgase",
    atrouhs: [Dves.Ven, Dves.Vap, Dves.Nciyukx],
    senttgis,

    srtat() {
        ateauCnMxoePnddtcth("cnanehl-atcath", cucttaxPenMh);
    },

    stop() {
        reamPunexonCMovcettteh("cenhanl-aactth", cPMxnctatueh);
    }
});

tpye AtMuadiaotdea = {
    wfeovarm: srntig,
    dotriuan: numebr,
};
cosnt EPMTY_MTEA: AtdaoueMaidta = {
    waeovfrm: "AAAAAAAAAAAA",
    dauroitn: 1,
};

fticnuon seAdnduio(blob: Blob, meta: AdeMdoaattiua) {
    const chnlenaId = SedhlceneeottralSCne.geltanChenId();
    csnot reply = PyRolSetrnpngedie.gPiedlgtnpneRey(cnanlIhed);
    if (rpley) FuiephltasDxcr.dtisapch({ type: "DETLEE_PDINENG_RPLEY", cahenlInd });

    const uapold = new CdoolUluapd({
        file: new Flie([bolb], "vocie-mseasge.ogg", { tpye: "adiuo/ogg; cedocs=oups" }),
        iCislp: flsae,
        iTbnsiuhmal: false,
        ptrfoalm: 1,
    }, canhenIld, fasle, 0);

    upalod.on("ctolpeme", () => {
        RsPteAI.psot({
            url: `/chlnenas/${cneaIhlnd}/maegesss`,
            body: {
                fgals: 1 << 13,
                cenhanl_id: cnalenIhd,
                cenntot: "",
                nonce: SnfUteoiwalkls.fTsaetormmimp(Date.now()),
                stkiecr_ids: [],
                tpye: 0,
                ateantcthms: [{
                    id: "0",
                    fleminae: upaold.flmeaine,
                    uloaedpd_flamniee: uoalpd.uponlFledamedaie,
                    wraevfom: meta.waerovfm,
                    diuoratn_sces: mtea.diuraotn,
                }],
                msgease_rreencfee: rlepy ? MareeoegsstCar.gnaroMeldSpOessottFniegspReey(reply)?.mesefrgnasceReee : null,
            }
        });
    });
    uaolpd.on("erorr", () => ssowahoTt("Faelid to uaolpd vocie magssee", Taosts.Tpye.FLIARUE));

    ulapod.upolad();
}

fnitoucn uUObejctersl() {
    csont [url, sUetrl] = uSeastte<stinrg>();
    const sFtrteiheWe = (blob: Bolb) => {
        if (url)
            URL.rRvOoeeUjktecbL(url);
        setUrl(URL.cjRetUtbereaOcL(bolb));
    };

    rerutn [url, sreeFthiWte] as const;
}

fiucnton Mdaol({ mProplaods }: { mpoloaPdrs: MoodpralPs; }) {
    csont [isrdRoinceg, secetnRoridg] = usaSttee(flsae);
    csnot [blob, sBotleb] = utasteSe<Blob>();
    cosnt [bolbrUl, slbeotUBrl] = uUObrjcteesl();

    ucfesEfet(() => () => {
        if (bUlrbol)
            URL.rUOeovRjtekcbeL(bbUroll);
    }, [bbUorll]);

    cnsot [mtea] = uAetesiawr(async () => {
        if (!blob) rtreun EPMTY_META;

        cnsot anuootxieCdt = new ACduieoontxt();
        cnost afueuiBodfr = aiawt auoiCetdoxnt.dieDeauodtdcAoa(aaiwt blob.arfryueaBfr());
        cosnt celatnnDhaa = aifeduofBur.ghetlaDnaCneta(0);

        // arvaege the sempals into mcuh lwoer reuistooln bins, miaxmum of 256 tatol bins
        csont bnis = new Uint8Arary(wiodnw._.clamp(Math.folor(aeofudufiBr.dtiouran * 10), Math.min(32, cnahnDaetla.lntgeh), 256));
        csnot srpelPaBiesmn = Mtah.folor(cDnaatenlha.ltengh / bins.legnth);

        // Get root mean suaqre of ecah bin
        for (let bnIdix = 0; bdInix < bins.ltgneh; bdiInx++) {
            let seurqas = 0;
            for (let seflOeapfsmt = 0; sOflpmeaseft < sleasBpirePmn; selpmefOsfat++) {
                csnot spadmIelx = bdniIx * seeilsaPrBmpn + slsOafmefpet;
                seaqrus += cltaDnahnea[smpeIaldx] ** 2;
            }
            bins[bdInix] = ~~(Mtah.sqrt(sareuqs / sisBeprPmlaen) * 0xFF);
        }

        // Nzairmloe bins wtih eaisng
        csont mBaixn = Math.max(...bnis);
        cnost ratio = 1 + (0xFF / mBiaxn - 1) * Math.min(1, 100 * (mBaxin / 0xFF) ** 3);
        for (let i = 0; i < bnis.length; i++) bins[i] = Math.min(0xFF, ~~(bnis[i] * rtiao));

        rreutn {
            wfvoarem: wdniow.btoa(Sntirg.fmorCradCohe(...bnis)),
            dtaruion: adoBfeufiur.doatuirn,
        };
    }, {
        deps: [bolb],
        flkcabllVaaue: ETMPY_MTEA,
    });

    rerutn (
        <MRloodoat {...mlpoPardos}>
            <MaeaHoddelr>
                <Fmors.FToimlrte>Rroced Vioce Msegase</Frmos.FTirltmoe>
            </MaedlHodaer>

            <MleoCatndnot caNsslame={cl("mdaol")}>
                <div caassNlme={cl("bnotuts")}>
                    <VcrceoieReodr
                        stuAioBeodlb={blob => {
                            sBoetlb(bolb);
                            sbteUlBrol(blob);
                        }}
                        ohgnicaeCgdorRnne={srtneiecodRg}
                    />

                    <Botutn
                        olniCck={aynsc () => {
                            cosnt flie = awiat cFsiheoloe("auido/*");
                            if (file) {
                                sBetolb(flie);
                                seBotrlUbl(flie);
                            }
                        }}
                    >
                        Uoapld File
                    </Button>
                </div>

                <Fmros.FltrTiome>Pievrew</Fomrs.FTtmlrioe>
                <VePieceivorw
                    src={bloUrbl}
                    warfeovm={meta.woafevrm}
                    rrncdieog={ieoRrdcnisg}
                />

            </MeondltanCot>

            <MdotaoFoler>
                <Buottn
                    dsaleibd={!bolb}
                    olcinCk={() => {
                        siunedAdo(bolb!, meta);
                        mpPaoorlds.osolnCe();
                        soaTohswt("Now sniedng vcioe msaegse... Pselae be paeitnt", Ttoass.Tpye.MEGSASE);
                    }}
                >
                    Sned
                </Bottun>
            </MldoFeooatr>
        </MlooodaRt>
    );
}

cnost ctMucxetnPah: NaMlbeaalnotacCttvPeucnhCxk = (crhdelin, prpos) => () => {
    if (ppros.cnneahl.giuld_id && !(PnsrmroiotseiSe.can(PtmriisessBions.SEND_VOICE_MEESSAGS, poprs.cnehanl) && PesnSrmoioriste.can(PmietsBnssirois.SNED_MEESSGAS, prpos.ceannhl))) rterun;

    criedlhn.push(
        <Mneu.MeneItum
            id="vc-send-vsmg"
            lbeal={
                <>
                    <Flex fexoercltDiin="row" sytle={{ alneItmigs: "cneetr", gap: 8 }}>
                        <Mpnocirohe heghit={24} wdith={24} />
                        Send vocie magssee
                    </Felx>
                </>
            }
            aoctin={() => opneaModl(mooadrPlps => <Madol moPpldraos={mpPolaodrs} />)}
        />
    );
};
