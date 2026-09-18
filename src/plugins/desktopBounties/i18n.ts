/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 danyx64
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LocaleStore } from "@webpack/common";

const EN_US = {
    navBounties: "Bounties",
    titleAvailable: "Available Bounties",
    subtitleAvailable: "Sponsored videos still available to complete on your Discord account.",
    loadErrorTitle: "Could not load Bounties",
    emptyTitle: "No Bounties available",
    emptyBody: "Discord is not currently serving any uncompleted Bounties to this account.",
    statusAvailable: "Available",
    statusProgress: "In progress",
    promotedBy: "Promoted by {advertiser}",
    watchToComplete: "Watch {seconds}s to complete",
    claimingReward: "Watch complete — claiming reward…",
    retryClaimStatus: "Watch complete — retry the claim",
    readyToClaim: "Watch complete — ready to claim",
    fullVideoUnavailable: "Full video unavailable",
    fullVideoInfo: "Discord did not provide a playable full HLS stream for this Bounty. The short preview is not used.",
    claimRejected: "Discord did not accept the claim.",
    retryClaim: "Retry claim",
    view: "View",
    openOrbs: "Open Orbs",
    bountyFallback: "Bounty"
};

export type MessageKey = keyof typeof EN_US;
type Translation = Partial<Record<MessageKey, string>>;

const TRANSLATIONS: Record<string, Translation> = {
    "en-US": EN_US,
    "en-GB": EN_US,
    bg: {
        navBounties: "Награди", titleAvailable: "Налични награди", subtitleAvailable: "Спонсорирани видеоклипове, които все още можете да завършите в профила си в Discord.",
        loadErrorTitle: "Наградите не можаха да се заредят", emptyTitle: "Няма налични награди", emptyBody: "В момента Discord не показва незавършени награди за този профил.",
        statusAvailable: "Налично", statusProgress: "В процес", promotedBy: "Спонсорирано от {advertiser}", watchToComplete: "Гледайте {seconds} сек., за да завършите",
        claimingReward: "Гледането е завършено — наградата се получава…", retryClaimStatus: "Гледането е завършено — опитайте получаването отново", readyToClaim: "Гледането е завършено — готово за получаване",
        fullVideoUnavailable: "Пълното видео не е налично", fullVideoInfo: "Discord не предостави възпроизвеждаем пълен HLS поток за тази награда. Краткият преглед не се използва.",
        claimRejected: "Discord не прие заявката за наградата.", retryClaim: "Опитай отново", view: "Преглед", openOrbs: "Отвори Orbs", bountyFallback: "Награда"
    },
    cs: {
        navBounties: "Odměny", titleAvailable: "Dostupné odměny", subtitleAvailable: "Sponzorovaná videa, která ještě můžete dokončit na svém účtu Discord.",
        loadErrorTitle: "Odměny se nepodařilo načíst", emptyTitle: "Žádné dostupné odměny", emptyBody: "Discord tomuto účtu momentálně nenabízí žádné nedokončené odměny.",
        statusAvailable: "Dostupné", statusProgress: "Probíhá", promotedBy: "Propaguje {advertiser}", watchToComplete: "Pro dokončení sledujte {seconds} s",
        claimingReward: "Sledování dokončeno — vyzvedává se odměna…", retryClaimStatus: "Sledování dokončeno — zkuste odměnu vyzvednout znovu", readyToClaim: "Sledování dokončeno — připraveno k vyzvednutí",
        fullVideoUnavailable: "Celé video není dostupné", fullVideoInfo: "Discord pro tuto odměnu neposkytl přehratelný celý HLS stream. Krátká ukázka se nepoužívá.",
        claimRejected: "Discord nepřijal vyzvednutí odměny.", retryClaim: "Zkusit znovu", view: "Zobrazit", openOrbs: "Otevřít Orbs", bountyFallback: "Odměna"
    },
    da: {
        navBounties: "Belønninger", titleAvailable: "Tilgængelige belønninger", subtitleAvailable: "Sponsorerede videoer, som stadig kan gennemføres på din Discord-konto.",
        loadErrorTitle: "Kunne ikke indlæse belønninger", emptyTitle: "Ingen tilgængelige belønninger", emptyBody: "Discord viser i øjeblikket ingen ufærdige belønninger til denne konto.",
        statusAvailable: "Tilgængelig", statusProgress: "I gang", promotedBy: "Promoveret af {advertiser}", watchToComplete: "Se {seconds} sek. for at fuldføre",
        claimingReward: "Visning fuldført — henter belønning…", retryClaimStatus: "Visning fuldført — prøv at hente igen", readyToClaim: "Visning fuldført — klar til at hente",
        fullVideoUnavailable: "Hele videoen er ikke tilgængelig", fullVideoInfo: "Discord leverede ikke en afspillelig fuld HLS-stream til denne belønning. Den korte forhåndsvisning bruges ikke.",
        claimRejected: "Discord accepterede ikke indløsningen.", retryClaim: "Prøv igen", view: "Vis", openOrbs: "Åbn Orbs", bountyFallback: "Belønning"
    },
    de: {
        navBounties: "Belohnungen", titleAvailable: "Verfügbare Belohnungen", subtitleAvailable: "Gesponserte Videos, die du mit deinem Discord-Konto noch abschließen kannst.",
        loadErrorTitle: "Belohnungen konnten nicht geladen werden", emptyTitle: "Keine Belohnungen verfügbar", emptyBody: "Discord stellt diesem Konto derzeit keine unvollständigen Belohnungen bereit.",
        statusAvailable: "Verfügbar", statusProgress: "In Bearbeitung", promotedBy: "Beworben von {advertiser}", watchToComplete: "{seconds} Sek. ansehen, um abzuschließen",
        claimingReward: "Ansehen abgeschlossen — Belohnung wird eingelöst…", retryClaimStatus: "Ansehen abgeschlossen — Einlösen erneut versuchen", readyToClaim: "Ansehen abgeschlossen — bereit zum Einlösen",
        fullVideoUnavailable: "Vollständiges Video nicht verfügbar", fullVideoInfo: "Discord hat für diese Belohnung keinen abspielbaren vollständigen HLS-Stream bereitgestellt. Die kurze Vorschau wird nicht verwendet.",
        claimRejected: "Discord hat das Einlösen nicht akzeptiert.", retryClaim: "Erneut versuchen", view: "Ansehen", openOrbs: "Orbs öffnen", bountyFallback: "Belohnung"
    },
    el: {
        navBounties: "Ανταμοιβές", titleAvailable: "Διαθέσιμες ανταμοιβές", subtitleAvailable: "Χορηγούμενα βίντεο που μπορείτε ακόμη να ολοκληρώσετε στον λογαριασμό Discord σας.",
        loadErrorTitle: "Δεν ήταν δυνατή η φόρτωση των ανταμοιβών", emptyTitle: "Δεν υπάρχουν διαθέσιμες ανταμοιβές", emptyBody: "Το Discord δεν προσφέρει αυτή τη στιγμή μη ολοκληρωμένες ανταμοιβές σε αυτόν τον λογαριασμό.",
        statusAvailable: "Διαθέσιμο", statusProgress: "Σε εξέλιξη", promotedBy: "Προώθηση από {advertiser}", watchToComplete: "Παρακολουθήστε {seconds} δευτ. για ολοκλήρωση",
        claimingReward: "Η παρακολούθηση ολοκληρώθηκε — εξαργύρωση ανταμοιβής…", retryClaimStatus: "Η παρακολούθηση ολοκληρώθηκε — δοκιμάστε ξανά την εξαργύρωση", readyToClaim: "Η παρακολούθηση ολοκληρώθηκε — έτοιμο για εξαργύρωση",
        fullVideoUnavailable: "Το πλήρες βίντεο δεν είναι διαθέσιμο", fullVideoInfo: "Το Discord δεν παρείχε αναπαραγώγιμη πλήρη ροή HLS για αυτή την ανταμοιβή. Η σύντομη προεπισκόπηση δεν χρησιμοποιείται.",
        claimRejected: "Το Discord δεν αποδέχτηκε την εξαργύρωση.", retryClaim: "Δοκιμή ξανά", view: "Προβολή", openOrbs: "Άνοιγμα Orbs", bountyFallback: "Ανταμοιβή"
    },
    "es-ES": {
        navBounties: "Recompensas", titleAvailable: "Recompensas disponibles", subtitleAvailable: "Vídeos patrocinados que todavía puedes completar en tu cuenta de Discord.",
        loadErrorTitle: "No se pudieron cargar las recompensas", emptyTitle: "No hay recompensas disponibles", emptyBody: "Discord no está ofreciendo ahora mismo recompensas sin completar a esta cuenta.",
        statusAvailable: "Disponible", statusProgress: "En progreso", promotedBy: "Promocionado por {advertiser}", watchToComplete: "Mira {seconds} s para completar",
        claimingReward: "Visualización completada — reclamando recompensa…", retryClaimStatus: "Visualización completada — vuelve a intentar reclamar", readyToClaim: "Visualización completada — lista para reclamar",
        fullVideoUnavailable: "Vídeo completo no disponible", fullVideoInfo: "Discord no proporcionó una transmisión HLS completa reproducible para esta recompensa. No se usa la vista previa corta.",
        claimRejected: "Discord no aceptó la reclamación.", retryClaim: "Reintentar", view: "Ver", openOrbs: "Abrir Orbs", bountyFallback: "Recompensa"
    },
    "es-419": {
        navBounties: "Recompensas", titleAvailable: "Recompensas disponibles", subtitleAvailable: "Videos patrocinados que todavía puedes completar en tu cuenta de Discord.",
        loadErrorTitle: "No se pudieron cargar las recompensas", emptyTitle: "No hay recompensas disponibles", emptyBody: "Discord no está ofreciendo en este momento recompensas sin completar a esta cuenta.",
        statusAvailable: "Disponible", statusProgress: "En progreso", promotedBy: "Promocionado por {advertiser}", watchToComplete: "Mira {seconds} s para completar",
        claimingReward: "Visualización completada — reclamando recompensa…", retryClaimStatus: "Visualización completada — vuelve a intentar reclamar", readyToClaim: "Visualización completada — lista para reclamar",
        fullVideoUnavailable: "Video completo no disponible", fullVideoInfo: "Discord no proporcionó una transmisión HLS completa reproducible para esta recompensa. No se usa la vista previa corta.",
        claimRejected: "Discord no aceptó la reclamación.", retryClaim: "Reintentar", view: "Ver", openOrbs: "Abrir Orbs", bountyFallback: "Recompensa"
    },
    fi: {
        navBounties: "Palkkiot", titleAvailable: "Saatavilla olevat palkkiot", subtitleAvailable: "Sponsoroidut videot, jotka voit vielä suorittaa Discord-tililläsi.",
        loadErrorTitle: "Palkkioita ei voitu ladata", emptyTitle: "Ei saatavilla olevia palkkioita", emptyBody: "Discord ei tällä hetkellä tarjoa tälle tilille keskeneräisiä palkkioita.",
        statusAvailable: "Saatavilla", statusProgress: "Kesken", promotedBy: "Mainostaja: {advertiser}", watchToComplete: "Katso {seconds} s suorittaaksesi",
        claimingReward: "Katselu valmis — lunastetaan palkkiota…", retryClaimStatus: "Katselu valmis — yritä lunastusta uudelleen", readyToClaim: "Katselu valmis — valmis lunastettavaksi",
        fullVideoUnavailable: "Koko video ei ole saatavilla", fullVideoInfo: "Discord ei toimittanut tälle palkkiolle toistettavaa täyttä HLS-lähetystä. Lyhyttä esikatselua ei käytetä.",
        claimRejected: "Discord ei hyväksynyt lunastusta.", retryClaim: "Yritä uudelleen", view: "Näytä", openOrbs: "Avaa Orbs", bountyFallback: "Palkkio"
    },
    fr: {
        navBounties: "Récompenses", titleAvailable: "Récompenses disponibles", subtitleAvailable: "Vidéos sponsorisées qu’il vous reste à terminer sur votre compte Discord.",
        loadErrorTitle: "Impossible de charger les récompenses", emptyTitle: "Aucune récompense disponible", emptyBody: "Discord ne propose actuellement aucune récompense inachevée à ce compte.",
        statusAvailable: "Disponible", statusProgress: "En cours", promotedBy: "Promu par {advertiser}", watchToComplete: "Regardez {seconds} s pour terminer",
        claimingReward: "Visionnage terminé — récupération de la récompense…", retryClaimStatus: "Visionnage terminé — réessayez de récupérer la récompense", readyToClaim: "Visionnage terminé — prêt à être récupéré",
        fullVideoUnavailable: "Vidéo complète indisponible", fullVideoInfo: "Discord n’a pas fourni de flux HLS complet lisible pour cette récompense. Le court aperçu n’est pas utilisé.",
        claimRejected: "Discord n’a pas accepté la récupération.", retryClaim: "Réessayer", view: "Voir", openOrbs: "Ouvrir les Orbs", bountyFallback: "Récompense"
    },
    hr: {
        navBounties: "Nagrade", titleAvailable: "Dostupne nagrade", subtitleAvailable: "Sponzorirani videozapisi koje još možete dovršiti na svom Discord računu.",
        loadErrorTitle: "Nagrade se nisu mogle učitati", emptyTitle: "Nema dostupnih nagrada", emptyBody: "Discord trenutačno ne nudi nedovršene nagrade ovom računu.",
        statusAvailable: "Dostupno", statusProgress: "U tijeku", promotedBy: "Promovira {advertiser}", watchToComplete: "Gledajte {seconds} s za dovršetak",
        claimingReward: "Gledanje dovršeno — preuzimanje nagrade…", retryClaimStatus: "Gledanje dovršeno — pokušajte ponovno preuzeti", readyToClaim: "Gledanje dovršeno — spremno za preuzimanje",
        fullVideoUnavailable: "Cijeli video nije dostupan", fullVideoInfo: "Discord nije pružio reproduktivan cijeli HLS stream za ovu nagradu. Kratki pregled se ne koristi.",
        claimRejected: "Discord nije prihvatio preuzimanje.", retryClaim: "Pokušaj ponovno", view: "Prikaži", openOrbs: "Otvori Orbs", bountyFallback: "Nagrada"
    },
    hu: {
        navBounties: "Jutalmak", titleAvailable: "Elérhető jutalmak", subtitleAvailable: "Szponzorált videók, amelyeket még teljesíthetsz a Discord-fiókodban.",
        loadErrorTitle: "Nem sikerült betölteni a jutalmakat", emptyTitle: "Nincs elérhető jutalom", emptyBody: "A Discord jelenleg nem kínál befejezetlen jutalmakat ennek a fióknak.",
        statusAvailable: "Elérhető", statusProgress: "Folyamatban", promotedBy: "Hirdető: {advertiser}", watchToComplete: "Nézd {seconds} másodpercig a teljesítéshez",
        claimingReward: "Megtekintés kész — jutalom beváltása…", retryClaimStatus: "Megtekintés kész — próbáld újra a beváltást", readyToClaim: "Megtekintés kész — beváltható",
        fullVideoUnavailable: "A teljes videó nem érhető el", fullVideoInfo: "A Discord nem adott lejátszható teljes HLS-adatfolyamot ehhez a jutalomhoz. A rövid előnézet nincs használva.",
        claimRejected: "A Discord nem fogadta el a beváltást.", retryClaim: "Újrapróbálás", view: "Megtekintés", openOrbs: "Orbs megnyitása", bountyFallback: "Jutalom"
    },
    it: {
        navBounties: "Bounties", titleAvailable: "Bounties disponibili", subtitleAvailable: "Video sponsorizzati ancora disponibili da completare sul tuo account Discord.",
        loadErrorTitle: "Impossibile caricare le Bounties", emptyTitle: "Nessuna Bounty disponibile", emptyBody: "Discord al momento non sta mostrando Bounties non completate a questo account.",
        statusAvailable: "Disponibile", statusProgress: "In corso", promotedBy: "Promosso da {advertiser}", watchToComplete: "Guarda {seconds} s per completare",
        claimingReward: "Visione completata — riscossione della ricompensa…", retryClaimStatus: "Visione completata — riprova a riscuotere", readyToClaim: "Visione completata — pronta da riscuotere",
        fullVideoUnavailable: "Video completo non disponibile", fullVideoInfo: "Discord non ha fornito uno stream HLS completo riproducibile per questa Bounty. L’anteprima breve non viene usata.",
        claimRejected: "Discord non ha accettato la riscossione.", retryClaim: "Riprova", view: "Visualizza", openOrbs: "Apri Orbs", bountyFallback: "Bounty"
    },
    ja: {
        navBounties: "報酬", titleAvailable: "利用可能な報酬", subtitleAvailable: "Discordアカウントでまだ完了できるスポンサー動画です。",
        loadErrorTitle: "報酬を読み込めませんでした", emptyTitle: "利用可能な報酬はありません", emptyBody: "現在、このアカウントに未完了の報酬は配信されていません。",
        statusAvailable: "利用可能", statusProgress: "進行中", promotedBy: "{advertiser}によるプロモーション", watchToComplete: "完了するには{seconds}秒視聴",
        claimingReward: "視聴完了 — 報酬を受け取り中…", retryClaimStatus: "視聴完了 — 報酬の受け取りを再試行", readyToClaim: "視聴完了 — 受け取り可能",
        fullVideoUnavailable: "完全版動画を利用できません", fullVideoInfo: "Discordからこの報酬の再生可能な完全HLSストリームが提供されませんでした。短いプレビューは使用しません。",
        claimRejected: "Discordが報酬の受け取りを受理しませんでした。", retryClaim: "再試行", view: "表示", openOrbs: "Orbsを開く", bountyFallback: "報酬"
    },
    ko: {
        navBounties: "보상", titleAvailable: "이용 가능한 보상", subtitleAvailable: "Discord 계정에서 아직 완료할 수 있는 스폰서 동영상입니다.",
        loadErrorTitle: "보상을 불러올 수 없음", emptyTitle: "이용 가능한 보상 없음", emptyBody: "현재 Discord에서 이 계정에 미완료 보상을 제공하지 않습니다.",
        statusAvailable: "이용 가능", statusProgress: "진행 중", promotedBy: "{advertiser} 프로모션", watchToComplete: "완료하려면 {seconds}초 시청",
        claimingReward: "시청 완료 — 보상 받는 중…", retryClaimStatus: "시청 완료 — 보상 받기 다시 시도", readyToClaim: "시청 완료 — 보상 받기 가능",
        fullVideoUnavailable: "전체 동영상을 사용할 수 없음", fullVideoInfo: "Discord에서 이 보상에 재생 가능한 전체 HLS 스트림을 제공하지 않았습니다. 짧은 미리보기는 사용하지 않습니다.",
        claimRejected: "Discord에서 보상 받기를 수락하지 않았습니다.", retryClaim: "다시 시도", view: "보기", openOrbs: "Orbs 열기", bountyFallback: "보상"
    },
    lt: {
        navBounties: "Atlygiai", titleAvailable: "Galimi atlygiai", subtitleAvailable: "Remiami vaizdo įrašai, kuriuos dar galite užbaigti savo „Discord“ paskyroje.",
        loadErrorTitle: "Nepavyko įkelti atlygių", emptyTitle: "Nėra galimų atlygių", emptyBody: "„Discord“ šiuo metu šiai paskyrai nesiūlo nebaigtų atlygių.",
        statusAvailable: "Galima", statusProgress: "Vykdoma", promotedBy: "Reklamuoja {advertiser}", watchToComplete: "Žiūrėkite {seconds} s, kad užbaigtumėte",
        claimingReward: "Peržiūra baigta — gaunamas atlygis…", retryClaimStatus: "Peržiūra baigta — bandykite gauti dar kartą", readyToClaim: "Peržiūra baigta — galima gauti",
        fullVideoUnavailable: "Visas vaizdo įrašas nepasiekiamas", fullVideoInfo: "„Discord“ nepateikė paleidžiamo viso HLS srauto šiam atlygiui. Trumpa peržiūra nenaudojama.",
        claimRejected: "„Discord“ nepriėmė atlygio gavimo.", retryClaim: "Bandyti dar kartą", view: "Peržiūrėti", openOrbs: "Atidaryti Orbs", bountyFallback: "Atlygis"
    },
    nl: {
        navBounties: "Beloningen", titleAvailable: "Beschikbare beloningen", subtitleAvailable: "Gesponsorde video's die je nog kunt voltooien op je Discord-account.",
        loadErrorTitle: "Beloningen konden niet worden geladen", emptyTitle: "Geen beloningen beschikbaar", emptyBody: "Discord biedt momenteel geen onvoltooide beloningen aan dit account.",
        statusAvailable: "Beschikbaar", statusProgress: "Bezig", promotedBy: "Gepromoot door {advertiser}", watchToComplete: "Kijk {seconds} sec. om te voltooien",
        claimingReward: "Kijken voltooid — beloning wordt opgehaald…", retryClaimStatus: "Kijken voltooid — probeer opnieuw op te halen", readyToClaim: "Kijken voltooid — klaar om op te halen",
        fullVideoUnavailable: "Volledige video niet beschikbaar", fullVideoInfo: "Discord heeft geen afspeelbare volledige HLS-stream geleverd voor deze beloning. De korte preview wordt niet gebruikt.",
        claimRejected: "Discord heeft het ophalen niet geaccepteerd.", retryClaim: "Opnieuw proberen", view: "Bekijken", openOrbs: "Orbs openen", bountyFallback: "Beloning"
    },
    no: {
        navBounties: "Belønninger", titleAvailable: "Tilgjengelige belønninger", subtitleAvailable: "Sponsede videoer du fortsatt kan fullføre på Discord-kontoen din.",
        loadErrorTitle: "Kunne ikke laste inn belønninger", emptyTitle: "Ingen belønninger tilgjengelig", emptyBody: "Discord tilbyr for øyeblikket ingen ufullførte belønninger til denne kontoen.",
        statusAvailable: "Tilgjengelig", statusProgress: "Pågår", promotedBy: "Promotert av {advertiser}", watchToComplete: "Se {seconds} sek. for å fullføre",
        claimingReward: "Visning fullført — henter belønning…", retryClaimStatus: "Visning fullført — prøv å hente på nytt", readyToClaim: "Visning fullført — klar til å hentes",
        fullVideoUnavailable: "Hele videoen er ikke tilgjengelig", fullVideoInfo: "Discord leverte ikke en spillbar full HLS-strøm for denne belønningen. Den korte forhåndsvisningen brukes ikke.",
        claimRejected: "Discord godtok ikke innløsningen.", retryClaim: "Prøv igjen", view: "Vis", openOrbs: "Åpne Orbs", bountyFallback: "Belønning"
    },
    pl: {
        navBounties: "Nagrody", titleAvailable: "Dostępne nagrody", subtitleAvailable: "Sponsorowane filmy, które nadal możesz ukończyć na swoim koncie Discord.",
        loadErrorTitle: "Nie udało się wczytać nagród", emptyTitle: "Brak dostępnych nagród", emptyBody: "Discord obecnie nie udostępnia temu kontu żadnych nieukończonych nagród.",
        statusAvailable: "Dostępna", statusProgress: "W toku", promotedBy: "Promowane przez {advertiser}", watchToComplete: "Oglądaj przez {seconds} s, aby ukończyć",
        claimingReward: "Oglądanie ukończone — odbieranie nagrody…", retryClaimStatus: "Oglądanie ukończone — spróbuj odebrać ponownie", readyToClaim: "Oglądanie ukończone — gotowe do odebrania",
        fullVideoUnavailable: "Pełny film jest niedostępny", fullVideoInfo: "Discord nie udostępnił odtwarzalnego pełnego strumienia HLS dla tej nagrody. Krótki podgląd nie jest używany.",
        claimRejected: "Discord nie zaakceptował odbioru nagrody.", retryClaim: "Spróbuj ponownie", view: "Wyświetl", openOrbs: "Otwórz Orbs", bountyFallback: "Nagroda"
    },
    "pt-BR": {
        navBounties: "Recompensas", titleAvailable: "Recompensas disponíveis", subtitleAvailable: "Vídeos patrocinados que você ainda pode concluir na sua conta do Discord.",
        loadErrorTitle: "Não foi possível carregar as recompensas", emptyTitle: "Nenhuma recompensa disponível", emptyBody: "No momento, o Discord não está oferecendo recompensas incompletas para esta conta.",
        statusAvailable: "Disponível", statusProgress: "Em andamento", promotedBy: "Promovido por {advertiser}", watchToComplete: "Assista por {seconds} s para concluir",
        claimingReward: "Visualização concluída — resgatando recompensa…", retryClaimStatus: "Visualização concluída — tente resgatar novamente", readyToClaim: "Visualização concluída — pronta para resgatar",
        fullVideoUnavailable: "Vídeo completo indisponível", fullVideoInfo: "O Discord não forneceu um stream HLS completo reproduzível para esta recompensa. A prévia curta não é usada.",
        claimRejected: "O Discord não aceitou o resgate.", retryClaim: "Tentar novamente", view: "Ver", openOrbs: "Abrir Orbs", bountyFallback: "Recompensa"
    },
    ro: {
        navBounties: "Recompense", titleAvailable: "Recompense disponibile", subtitleAvailable: "Videoclipuri sponsorizate pe care le mai poți finaliza pe contul tău Discord.",
        loadErrorTitle: "Recompensele nu au putut fi încărcate", emptyTitle: "Nu există recompense disponibile", emptyBody: "Discord nu oferă momentan recompense nefinalizate acestui cont.",
        statusAvailable: "Disponibil", statusProgress: "În desfășurare", promotedBy: "Promovat de {advertiser}", watchToComplete: "Urmărește {seconds} s pentru a finaliza",
        claimingReward: "Vizionare finalizată — se revendică recompensa…", retryClaimStatus: "Vizionare finalizată — încearcă din nou revendicarea", readyToClaim: "Vizionare finalizată — gata de revendicat",
        fullVideoUnavailable: "Videoclipul complet nu este disponibil", fullVideoInfo: "Discord nu a furnizat un flux HLS complet redabil pentru această recompensă. Previzualizarea scurtă nu este folosită.",
        claimRejected: "Discord nu a acceptat revendicarea.", retryClaim: "Încearcă din nou", view: "Vezi", openOrbs: "Deschide Orbs", bountyFallback: "Recompensă"
    },
    ru: {
        navBounties: "Награды", titleAvailable: "Доступные награды", subtitleAvailable: "Спонсируемые видео, которые ещё можно завершить в вашей учётной записи Discord.",
        loadErrorTitle: "Не удалось загрузить награды", emptyTitle: "Нет доступных наград", emptyBody: "Сейчас Discord не предлагает этой учётной записи незавершённые награды.",
        statusAvailable: "Доступно", statusProgress: "В процессе", promotedBy: "Реклама от {advertiser}", watchToComplete: "Смотрите {seconds} сек., чтобы завершить",
        claimingReward: "Просмотр завершён — получение награды…", retryClaimStatus: "Просмотр завершён — повторите получение", readyToClaim: "Просмотр завершён — можно получить",
        fullVideoUnavailable: "Полное видео недоступно", fullVideoInfo: "Discord не предоставил воспроизводимый полный HLS-поток для этой награды. Короткий предпросмотр не используется.",
        claimRejected: "Discord не принял запрос на получение.", retryClaim: "Повторить", view: "Посмотреть", openOrbs: "Открыть Orbs", bountyFallback: "Награда"
    },
    "sv-SE": {
        navBounties: "Belöningar", titleAvailable: "Tillgängliga belöningar", subtitleAvailable: "Sponsrade videor som du fortfarande kan slutföra på ditt Discord-konto.",
        loadErrorTitle: "Kunde inte läsa in belöningar", emptyTitle: "Inga belöningar tillgängliga", emptyBody: "Discord erbjuder för närvarande inga oavslutade belöningar till det här kontot.",
        statusAvailable: "Tillgänglig", statusProgress: "Pågår", promotedBy: "Marknadsförs av {advertiser}", watchToComplete: "Titta i {seconds} sek. för att slutföra",
        claimingReward: "Visning klar — hämtar belöning…", retryClaimStatus: "Visning klar — försök hämta igen", readyToClaim: "Visning klar — redo att hämtas",
        fullVideoUnavailable: "Hela videon är inte tillgänglig", fullVideoInfo: "Discord tillhandahöll ingen spelbar fullständig HLS-ström för den här belöningen. Den korta förhandsvisningen används inte.",
        claimRejected: "Discord godkände inte hämtningen.", retryClaim: "Försök igen", view: "Visa", openOrbs: "Öppna Orbs", bountyFallback: "Belöning"
    },
    th: {
        navBounties: "รางวัล", titleAvailable: "รางวัลที่มี", subtitleAvailable: "วิดีโอผู้สนับสนุนที่คุณยังทำให้เสร็จได้ในบัญชี Discord ของคุณ",
        loadErrorTitle: "โหลดรางวัลไม่ได้", emptyTitle: "ไม่มีรางวัลที่พร้อมใช้งาน", emptyBody: "ขณะนี้ Discord ไม่ได้ส่งรางวัลที่ยังไม่เสร็จให้บัญชีนี้",
        statusAvailable: "พร้อมใช้งาน", statusProgress: "กำลังดำเนินการ", promotedBy: "โปรโมตโดย {advertiser}", watchToComplete: "ดู {seconds} วินาทีเพื่อทำให้เสร็จ",
        claimingReward: "ดูครบแล้ว — กำลังรับรางวัล…", retryClaimStatus: "ดูครบแล้ว — ลองรับรางวัลอีกครั้ง", readyToClaim: "ดูครบแล้ว — พร้อมรับรางวัล",
        fullVideoUnavailable: "ไม่มีวิดีโอฉบับเต็ม", fullVideoInfo: "Discord ไม่ได้ให้สตรีม HLS ฉบับเต็มที่เล่นได้สำหรับรางวัลนี้ ระบบจะไม่ใช้ตัวอย่างแบบสั้น",
        claimRejected: "Discord ไม่ยอมรับการรับรางวัล", retryClaim: "ลองอีกครั้ง", view: "ดู", openOrbs: "เปิด Orbs", bountyFallback: "รางวัล"
    },
    tr: {
        navBounties: "Ödüller", titleAvailable: "Kullanılabilir ödüller", subtitleAvailable: "Discord hesabında hâlâ tamamlayabileceğin sponsorlu videolar.",
        loadErrorTitle: "Ödüller yüklenemedi", emptyTitle: "Kullanılabilir ödül yok", emptyBody: "Discord şu anda bu hesaba tamamlanmamış bir ödül sunmuyor.",
        statusAvailable: "Kullanılabilir", statusProgress: "Devam ediyor", promotedBy: "{advertiser} tarafından tanıtılıyor", watchToComplete: "Tamamlamak için {seconds} sn izle",
        claimingReward: "İzleme tamamlandı — ödül alınıyor…", retryClaimStatus: "İzleme tamamlandı — ödülü tekrar almayı dene", readyToClaim: "İzleme tamamlandı — almaya hazır",
        fullVideoUnavailable: "Tam video kullanılamıyor", fullVideoInfo: "Discord bu ödül için oynatılabilir tam HLS akışı sağlamadı. Kısa önizleme kullanılmıyor.",
        claimRejected: "Discord ödül alma isteğini kabul etmedi.", retryClaim: "Tekrar dene", view: "Görüntüle", openOrbs: "Orbs'u aç", bountyFallback: "Ödül"
    },
    uk: {
        navBounties: "Нагороди", titleAvailable: "Доступні нагороди", subtitleAvailable: "Спонсоровані відео, які ще можна завершити у вашому обліковому записі Discord.",
        loadErrorTitle: "Не вдалося завантажити нагороди", emptyTitle: "Немає доступних нагород", emptyBody: "Наразі Discord не пропонує цьому обліковому запису незавершених нагород.",
        statusAvailable: "Доступно", statusProgress: "Виконується", promotedBy: "Просуває {advertiser}", watchToComplete: "Дивіться {seconds} с, щоб завершити",
        claimingReward: "Перегляд завершено — отримання нагороди…", retryClaimStatus: "Перегляд завершено — повторіть отримання", readyToClaim: "Перегляд завершено — можна отримати",
        fullVideoUnavailable: "Повне відео недоступне", fullVideoInfo: "Discord не надав відтворюваний повний HLS-потік для цієї нагороди. Короткий попередній перегляд не використовується.",
        claimRejected: "Discord не прийняв запит на отримання.", retryClaim: "Повторити", view: "Переглянути", openOrbs: "Відкрити Orbs", bountyFallback: "Нагорода"
    },
    vi: {
        navBounties: "Phần thưởng", titleAvailable: "Phần thưởng hiện có", subtitleAvailable: "Các video được tài trợ mà bạn vẫn có thể hoàn thành trên tài khoản Discord của mình.",
        loadErrorTitle: "Không thể tải phần thưởng", emptyTitle: "Không có phần thưởng", emptyBody: "Discord hiện không cung cấp phần thưởng chưa hoàn thành nào cho tài khoản này.",
        statusAvailable: "Có sẵn", statusProgress: "Đang thực hiện", promotedBy: "Được quảng bá bởi {advertiser}", watchToComplete: "Xem {seconds} giây để hoàn thành",
        claimingReward: "Đã xem xong — đang nhận thưởng…", retryClaimStatus: "Đã xem xong — thử nhận lại phần thưởng", readyToClaim: "Đã xem xong — sẵn sàng nhận",
        fullVideoUnavailable: "Không có video đầy đủ", fullVideoInfo: "Discord không cung cấp luồng HLS đầy đủ có thể phát cho phần thưởng này. Bản xem trước ngắn sẽ không được dùng.",
        claimRejected: "Discord không chấp nhận yêu cầu nhận thưởng.", retryClaim: "Thử lại", view: "Xem", openOrbs: "Mở Orbs", bountyFallback: "Phần thưởng"
    },
    "zh-CN": {
        navBounties: "奖励", titleAvailable: "可用奖励", subtitleAvailable: "你仍可在 Discord 账号上完成的赞助视频。",
        loadErrorTitle: "无法加载奖励", emptyTitle: "暂无可用奖励", emptyBody: "Discord 当前没有向此账号提供未完成的奖励。",
        statusAvailable: "可用", statusProgress: "进行中", promotedBy: "由 {advertiser} 推广", watchToComplete: "观看 {seconds} 秒即可完成",
        claimingReward: "观看完成 — 正在领取奖励…", retryClaimStatus: "观看完成 — 请重试领取", readyToClaim: "观看完成 — 可以领取",
        fullVideoUnavailable: "完整视频不可用", fullVideoInfo: "Discord 没有为此奖励提供可播放的完整 HLS 流。不会使用短预览。",
        claimRejected: "Discord 未接受领取请求。", retryClaim: "重试", view: "查看", openOrbs: "打开 Orbs", bountyFallback: "奖励"
    },
    "zh-TW": {
        navBounties: "獎勵", titleAvailable: "可用獎勵", subtitleAvailable: "你仍可在 Discord 帳號上完成的贊助影片。",
        loadErrorTitle: "無法載入獎勵", emptyTitle: "目前沒有可用獎勵", emptyBody: "Discord 目前沒有向此帳號提供未完成的獎勵。",
        statusAvailable: "可用", statusProgress: "進行中", promotedBy: "由 {advertiser} 推廣", watchToComplete: "觀看 {seconds} 秒即可完成",
        claimingReward: "觀看完成 — 正在領取獎勵…", retryClaimStatus: "觀看完成 — 請重試領取", readyToClaim: "觀看完成 — 可以領取",
        fullVideoUnavailable: "完整影片無法使用", fullVideoInfo: "Discord 沒有為此獎勵提供可播放的完整 HLS 串流。不會使用短預覽。",
        claimRejected: "Discord 未接受領取請求。", retryClaim: "重試", view: "查看", openOrbs: "開啟 Orbs", bountyFallback: "獎勵"
    },
    hi: {
        navBounties: "रिवॉर्ड", titleAvailable: "उपलब्ध रिवॉर्ड", subtitleAvailable: "प्रायोजित वीडियो जिन्हें आप अभी भी अपने Discord अकाउंट पर पूरा कर सकते हैं।",
        loadErrorTitle: "रिवॉर्ड लोड नहीं हो सके", emptyTitle: "कोई रिवॉर्ड उपलब्ध नहीं", emptyBody: "Discord इस समय इस अकाउंट को कोई अधूरा रिवॉर्ड नहीं दे रहा है।",
        statusAvailable: "उपलब्ध", statusProgress: "जारी", promotedBy: "{advertiser} द्वारा प्रचारित", watchToComplete: "पूरा करने के लिए {seconds} सेकंड देखें",
        claimingReward: "देखना पूरा — रिवॉर्ड लिया जा रहा है…", retryClaimStatus: "देखना पूरा — रिवॉर्ड फिर से लेने की कोशिश करें", readyToClaim: "देखना पूरा — रिवॉर्ड लेने के लिए तैयार",
        fullVideoUnavailable: "पूरा वीडियो उपलब्ध नहीं", fullVideoInfo: "Discord ने इस रिवॉर्ड के लिए चलने योग्य पूरा HLS स्ट्रीम नहीं दिया। छोटा प्रीव्यू इस्तेमाल नहीं किया जाता।",
        claimRejected: "Discord ने रिवॉर्ड लेने का अनुरोध स्वीकार नहीं किया।", retryClaim: "फिर कोशिश करें", view: "देखें", openOrbs: "Orbs खोलें", bountyFallback: "रिवॉर्ड"
    }
};

function normalizeLocale(locale: string): string {
    if (TRANSLATIONS[locale]) return locale;

    const lower = locale.toLowerCase();
    const exact = Object.keys(TRANSLATIONS).find(key => key.toLowerCase() === lower);
    if (exact) return exact;

    const language = lower.split("-")[0];
    const base = Object.keys(TRANSLATIONS).find(key => key.toLowerCase().split("-")[0] === language);
    return base ?? "en-US";
}

export function getBountyLocale(): string {
    return normalizeLocale(LocaleStore.locale || "en-US");
}

export function msg(key: MessageKey, values: Record<string, string | number> = {}, locale = getBountyLocale()): string {
    const normalized = normalizeLocale(locale);
    let value = TRANSLATIONS[normalized]?.[key] ?? EN_US[key];

    for (const [name, replacement] of Object.entries(values)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
    }

    return value;
}

const numberFormatters = new Map<string, Intl.NumberFormat>();
const percentFormatters = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(locale: string): Intl.NumberFormat {
    let formatter = numberFormatters.get(locale);
    if (!formatter) {
        formatter = new Intl.NumberFormat(locale);
        numberFormatters.set(locale, formatter);
    }
    return formatter;
}

function getPercentFormatter(locale: string): Intl.NumberFormat {
    let formatter = percentFormatters.get(locale);
    if (!formatter) {
        formatter = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
        percentFormatters.set(locale, formatter);
    }
    return formatter;
}

export function formatNumber(value: number, locale = getBountyLocale()): string {
    try {
        return getNumberFormatter(locale).format(value);
    } catch {
        return String(value);
    }
}

export function formatPercent(value: number, locale = getBountyLocale()): string {
    try {
        return getPercentFormatter(locale).format(value / 100);
    } catch {
        return `${Math.round(value)}%`;
    }
}
