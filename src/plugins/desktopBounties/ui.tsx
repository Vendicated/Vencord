/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 danyx64
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { filters, findComponentByCodeLazy, findCssClassesLazy, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher, LocaleStore, NavigationRouter, React, UserStore, useStateFromStores } from "@webpack/common";

import {
    AdDecision,
    BOUNTIES_ROUTE,
    claimBounty,
    fetchBounties,
    getBountyContent,
    getErrorMessage,
    getSavedProgress,
    isBountiesRoute,
    LoadResult,
    mediaUrl,
    openBountiesPage,
    openExternal,
    safeExternalUrl,
    saveProgress
} from "./core";
import { formatNumber, formatPercent, msg } from "./i18n";

type ClaimState = "idle" | "claiming" | "error";

const HlsRuntime = mapMangledModuleLazy("ManagedMediaSource", {
    loadHls: filters.byCode(".then(", ".default"),
    canUseHls: filters.byCode("isTypeSupported")
}) as {
    loadHls: () => Promise<any>;
    canUseHls: () => boolean;
};

function BountyIcon({ className = "" }: { className?: string; }) {
    return (
        <svg className={className} aria-hidden="true" role="img" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="6.25" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="2.25" fill="currentColor" />
            <path
                d="M12 2.5V5M12 19V21.5M2.5 12H5M19 12H21.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

const NavWrapperClasses = findCssClassesLazy("wrapper", "withGradient", "badge");
const ShortcutClasses = findCssClassesLazy(
    "channel",
    "interactive",
    "interactiveSelected",
    "link",
    "linkButton",
    "linkButtonIcon",
    "avatarWithText"
);
const InteractionClasses = findCssClassesLazy("interactive", "selected");
const LayoutClasses = findCssClassesLazy("layout", "avatar", "content", "nameAndDecorators", "name");

const NativeOrbBalanceMenu = findComponentByCodeLazy<any>(
    "BalanceWidgetMenu",
    "showNotificationBadge",
    "balanceWidgetMode"
);
const SafeNativeOrbBalanceMenu = ErrorBoundary.wrap(NativeOrbBalanceMenu, { noop: true });

function FullBountyVideo({
    hlsUrl,
    poster,
    initialTime,
    maxPlayableTime,
    onAvailable,
    onUnavailable,
    onProgress,
    onEnded
}: {
    hlsUrl: string;
    poster?: string;
    initialTime: number;
    maxPlayableTime: number;
    onAvailable: () => void;
    onUnavailable: () => void;
    onProgress: (currentTime: number) => void;
    onEnded: () => void;
}) {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [activated, setActivated] = React.useState(false);

    // With up to five Bounties on the page there is no reason to initialize
    // every HLS stream immediately. Start the player only when it is near the
    // viewport, which avoids unnecessary manifests, buffers and decoders.
    React.useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (typeof IntersectionObserver === "undefined") {
            setActivated(true);
            return;
        }

        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setActivated(true);
                observer.disconnect();
            }
        }, { rootMargin: "320px" });

        observer.observe(video);
        return () => observer.disconnect();
    }, []);

    React.useEffect(() => {
        const pauseWhenBackgrounded = () => {
            const video = videoRef.current;
            if (!video) return;
            if (document.visibilityState !== "visible" || !document.hasFocus()) {
                try { video.pause(); } catch { }
            }
        };

        document.addEventListener("visibilitychange", pauseWhenBackgrounded);
        window.addEventListener("blur", pauseWhenBackgrounded);

        return () => {
            document.removeEventListener("visibilitychange", pauseWhenBackgrounded);
            window.removeEventListener("blur", pauseWhenBackgrounded);
        };
    }, []);

    React.useEffect(() => {
        if (!activated) return;

        const video = videoRef.current;
        if (!video) return;

        let cancelled = false;
        let hls: any = null;

        const cleanupVideo = () => {
            try { video.pause(); } catch { }
            video.removeAttribute("src");
            try { video.load(); } catch { }
        };

        cleanupVideo();

        const nativeHls = video.canPlayType("application/vnd.apple.mpegurl")
            || video.canPlayType("application/x-mpegURL");

        if (nativeHls) {
            video.src = hlsUrl;
            onAvailable();
            return cleanupVideo;
        }

        void (async () => {
            try {
                const Hls = await HlsRuntime.loadHls();
                if (cancelled || !videoRef.current || !Hls?.isSupported?.()) {
                    if (!cancelled) onUnavailable();
                    return;
                }

                hls = new Hls({
                    startLevel: -1,
                    startFragPrefetch: false,
                    backBufferLength: 30,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60
                });

                hls.loadSource(hlsUrl);
                hls.attachMedia(video);
                onAvailable();

                if (Hls.Events?.ERROR) {
                    hls.on(Hls.Events.ERROR, (_event: unknown, data: any) => {
                        if (!data?.fatal || cancelled) return;
                        try { hls?.destroy?.(); } catch { }
                        hls = null;
                        onUnavailable();
                    });
                }
            } catch (error) {
                console.warn("[DesktopBounties] Failed to initialize Discord HLS playback", error);
                if (!cancelled) onUnavailable();
            }
        })();

        return () => {
            cancelled = true;
            try { hls?.destroy?.(); } catch { }
            cleanupVideo();
        };
    }, [activated, hlsUrl]);

    const durationOf = (video: HTMLVideoElement) =>
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

    return (
        <video
            ref={videoRef}
            poster={poster}
            playsInline
            controls
            preload="metadata"
            onLoadedMetadata={event => {
                const video = event.currentTarget;
                const duration = durationOf(video);
                if (initialTime > 0 && duration > 0) {
                    video.currentTime = Math.min(initialTime, Math.max(0, duration - 0.25));
                }
            }}
            onTimeUpdate={event => onProgress(event.currentTarget.currentTime)}
            onSeeking={event => {
                const video = event.currentTarget;
                if (video.currentTime > maxPlayableTime + 1) {
                    video.currentTime = maxPlayableTime;
                }
            }}
            onEnded={onEnded}
        />
    );
}

function BountiesNavItemInner() {
    const locale = useStateFromStores([LocaleStore], () => LocaleStore.locale || "en-US");
    const [active, setActive] = React.useState(isBountiesRoute);

    React.useEffect(() => {
        const sync = () => setActive(isBountiesRoute());

        FluxDispatcher.subscribe("ROUTE_CHANGED", sync);
        window.addEventListener("popstate", sync);

        return () => {
            FluxDispatcher.unsubscribe("ROUTE_CHANGED", sync);
            window.removeEventListener("popstate", sync);
        };
    }, []);

    const interactiveClassName = [
        InteractionClasses.interactive,
        ShortcutClasses.interactive,
        ShortcutClasses.linkButton,
        active ? ShortcutClasses.interactiveSelected : null,
        active ? InteractionClasses.selected : null
    ].filter(Boolean).join(" ");

    return (
        <div
            className={`${NavWrapperClasses.wrapper} vc-desktop-bounties-navShell${active ? " vc-desktop-bounties-navShell-active" : ""}`}
            data-vc-desktop-bounties-nav="true"
        >
            <li className={ShortcutClasses.channel} role="listitem">
                <div className={interactiveClassName}>
                    <a
                        className={`${ShortcutClasses.link} vc-desktop-bounties-navLink`}
                        data-list-item-id="private-channels-uid_11___bounties"
                        tabIndex={-1}
                        href={BOUNTIES_ROUTE}
                        aria-current={active ? "page" : undefined}
                        onClick={event => {
                            event.preventDefault();
                            openBountiesPage();
                        }}
                    >
                        <div className={`${LayoutClasses.layout} ${ShortcutClasses.avatarWithText}`}>
                            <div className={LayoutClasses.avatar}>
                                <BountyIcon className={ShortcutClasses.linkButtonIcon} />
                            </div>
                            <div className={LayoutClasses.content}>
                                <div className={LayoutClasses.nameAndDecorators}>
                                    <div className={LayoutClasses.name}>{msg("navBounties", {}, locale)}</div>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            </li>
        </div>
    );
}

export const BountiesNavItem = ErrorBoundary.wrap(BountiesNavItemInner, { noop: true });

function BountyCard({
    decision,
    locale,
    userId,
    onClaimed
}: {
    decision: AdDecision;
    locale: string;
    userId: string;
    onClaimed: (id: string) => void;
}) {
    const content = getBountyContent(decision);
    if (!content) return null;

    const image = mediaUrl(content.image_preview ?? content.product_icon);
    const fullHls = mediaUrl(content.video_hls);
    const icon = mediaUrl(content.product_icon);
    const ctaUrl = safeExternalUrl(content.cta?.url);
    const targetSeconds = Math.max(1, content.reward_timer_seconds ?? 15);
    const initialProgress = Math.min(targetSeconds, getSavedProgress(userId, content.id));

    // Discord mobile bases Bounty completion on the maximum playback timestamp,
    // not on a separate wall-clock interval. Mirroring that behavior is both
    // more accurate and substantially cheaper than polling four times a second.
    const [maxVideoProgressSeconds, setMaxVideoProgressSeconds] = React.useState(initialProgress);
    const [claimState, setClaimState] = React.useState<ClaimState>("idle");
    const [claimError, setClaimError] = React.useState<string | null>(null);
    const [videoAvailable, setVideoAvailable] = React.useState(Boolean(fullHls));

    const wholeSeconds = Math.floor(maxVideoProgressSeconds);
    const progressPercent = Math.min(100, Math.round((maxVideoProgressSeconds / targetSeconds) * 100));
    const localizedSeconds = formatNumber(targetSeconds, locale);
    const localizedPercent = formatPercent(progressPercent, locale);

    const doClaim = React.useCallback(async () => {
        if (claimState === "claiming") return;

        setClaimState("claiming");
        setClaimError(null);

        try {
            await claimBounty(decision, userId);
            onClaimed(content.id);
        } catch (error) {
            console.error("[DesktopBounties] Discord rejected Bounty claim", error);
            setClaimError(getErrorMessage(error));
            setClaimState("error");
        }
    }, [claimState, decision, content.id, onClaimed, userId]);

    React.useEffect(() => {
        saveProgress(userId, content.id, wholeSeconds);
    }, [userId, content.id, wholeSeconds]);

    React.useEffect(() => {
        if (
            maxVideoProgressSeconds >= targetSeconds
            && claimState === "idle"
            && fullHls
            && videoAvailable
        ) {
            void doClaim();
        }
    }, [maxVideoProgressSeconds, targetSeconds, claimState, fullHls, videoAvailable, doClaim]);

    const handleProgress = React.useCallback((currentTime: number) => {
        if (document.visibilityState !== "visible" || !document.hasFocus()) return;

        setMaxVideoProgressSeconds(current =>
            Math.min(targetSeconds, Math.max(current, currentTime))
        );
    }, [targetSeconds]);

    const statusText = (() => {
        if (!fullHls || !videoAvailable) return msg("fullVideoUnavailable", {}, locale);
        if (claimState === "claiming") return msg("claimingReward", {}, locale);
        if (claimState === "error") return msg("retryClaimStatus", {}, locale);
        if (maxVideoProgressSeconds >= targetSeconds) return msg("readyToClaim", {}, locale);
        return msg("watchToComplete", { seconds: localizedSeconds }, locale);
    })();

    return (
        <article className="vc-desktop-bounties-card">
            <div className="vc-desktop-bounties-media">
                {fullHls && videoAvailable ? (
                    <FullBountyVideo
                        hlsUrl={fullHls}
                        poster={image}
                        initialTime={initialProgress}
                        maxPlayableTime={maxVideoProgressSeconds}
                        onAvailable={() => setVideoAvailable(true)}
                        onUnavailable={() => setVideoAvailable(false)}
                        onProgress={handleProgress}
                        onEnded={() => setMaxVideoProgressSeconds(targetSeconds)}
                    />
                ) : image ? (
                    <img src={image} alt="" loading="lazy" />
                ) : (
                    <div className="vc-desktop-bounties-mediaFallback"><BountyIcon /></div>
                )}

                <span className={`vc-desktop-bounties-statusPill${wholeSeconds > 0 ? " vc-desktop-bounties-statusPill-progress" : ""}`}>
                    {msg(wholeSeconds > 0 ? "statusProgress" : "statusAvailable", {}, locale)}
                </span>
            </div>

            <div className="vc-desktop-bounties-body">
                <div className="vc-desktop-bounties-progressBlock">
                    <div className="vc-desktop-bounties-progressText">
                        <span>{statusText}</span>
                        <strong>{localizedPercent}</strong>
                    </div>

                    <div
                        className="vc-desktop-bounties-progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressPercent}
                        aria-valuetext={localizedPercent}
                    >
                        <div style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>

                <div className="vc-desktop-bounties-titleRow">
                    {icon && <img className="vc-desktop-bounties-icon" src={icon} alt="" loading="lazy" />}
                    <div className="vc-desktop-bounties-titleText">
                        <strong>{content.product_name || content.advertiser_name || msg("bountyFallback", {}, locale)}</strong>
                        {content.advertiser_name && content.product_name && (
                            <span>{msg("promotedBy", { advertiser: content.advertiser_name }, locale)}</span>
                        )}
                    </div>
                </div>

                {(!fullHls || !videoAvailable) && (
                    <div className="vc-desktop-bounties-infoBox">
                        {msg("fullVideoInfo", {}, locale)}
                    </div>
                )}

                {claimError && (
                    <div className="vc-desktop-bounties-claimError">
                        <strong>{msg("claimRejected", {}, locale)}</strong>
                        <span>{claimError}</span>
                    </div>
                )}

                <div className="vc-desktop-bounties-cardFooter">
                    <div className="vc-desktop-bounties-actions">
                        {claimState === "error" && maxVideoProgressSeconds >= targetSeconds && (
                            <button className="vc-desktop-bounties-primaryButton" onClick={() => void doClaim()}>
                                {msg("retryClaim", {}, locale)}
                            </button>
                        )}
                        <button
                            className="vc-desktop-bounties-secondaryButton"
                            disabled={!ctaUrl}
                            onClick={() => openExternal(ctaUrl)}
                        >
                            {content.cta?.button_label || msg("view", {}, locale)}
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}

function BountiesPage() {
    const locale = useStateFromStores([LocaleStore], () => LocaleStore.locale || "en-US");
    const currentUserId = useStateFromStores(
        [UserStore],
        () => UserStore.getCurrentUser()?.id ?? null
    );

    const [result, setResult] = React.useState<LoadResult | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const requestEpochRef = React.useRef(0);
    const lastAutoRefreshRef = React.useRef(0);

    const load = React.useCallback(async (background = false, force = false) => {
        if (!currentUserId) return;

        const userId = currentUserId;
        const requestEpoch = ++requestEpochRef.current;
        lastAutoRefreshRef.current = Date.now();

        if (!background) setLoading(true);
        setError(null);

        try {
            const next = await fetchBounties(userId, force);
            if (
                requestEpoch !== requestEpochRef.current
                || UserStore.getCurrentUser()?.id !== userId
                || next.userId !== userId
            ) return;

            setResult(next);
        } catch (err) {
            if (requestEpoch !== requestEpochRef.current || UserStore.getCurrentUser()?.id !== userId) return;

            console.error("[DesktopBounties] Failed to fetch Bounties", err);
            setError(getErrorMessage(err));
        } finally {
            if (requestEpoch === requestEpochRef.current && !background) setLoading(false);
        }
    }, [currentUserId]);

    React.useEffect(() => {
        ++requestEpochRef.current;
        setResult(null);
        setError(null);

        if (!currentUserId) {
            setLoading(true);
            return;
        }

        const timeout = window.setTimeout(() => {
            void load(false);
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [currentUserId, load]);

    // Refresh on return to Discord, while the core respects Discord's response
    // TTL and coalesces duplicate focus/visibility events into one request.
    React.useEffect(() => {
        if (!currentUserId) return;

        const refreshIfVisible = () => {
            if (document.visibilityState !== "visible" || !document.hasFocus() || !isBountiesRoute()) return;

            const now = Date.now();
            if (now - lastAutoRefreshRef.current < 2_000) return;

            lastAutoRefreshRef.current = now;
            void load(true);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") refreshIfVisible();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", refreshIfVisible);
        FluxDispatcher.subscribe("ROUTE_CHANGED", refreshIfVisible);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", refreshIfVisible);
            FluxDispatcher.unsubscribe("ROUTE_CHANGED", refreshIfVisible);
        };
    }, [currentUserId, load]);

    const bounties = result?.userId === currentUserId ? result.bounties : [];

    const handleClaimed = React.useCallback((id: string) => {
        setResult(current => current == null || current.userId !== currentUserId ? current : {
            ...current,
            bounties: current.bounties.filter(decision => getBountyContent(decision)?.id !== id)
        });

        window.setTimeout(() => void load(true, true), 750);
    }, [currentUserId, load]);

    return (
        <div className="vc-desktop-bounties-page">
            <main className="vc-desktop-bounties-pageInner">
                <section className="vc-desktop-bounties-section">
                    <div className="vc-desktop-bounties-sectionHeader">
                        <div className="vc-desktop-bounties-headerLead">
                            <div className="vc-desktop-bounties-headerIcon" aria-hidden="true">
                                <BountyIcon />
                            </div>
                            <div className="vc-desktop-bounties-headingCopy">
                                <div className="vc-desktop-bounties-sectionTitleRow">
                                    <h1>{msg("titleAvailable", {}, locale)}</h1>
                                    <span className="vc-desktop-bounties-sectionCount">{formatNumber(bounties.length, locale)}</span>
                                </div>
                                <p>{msg("subtitleAvailable", {}, locale)}</p>
                            </div>
                        </div>

                        <div className="vc-desktop-bounties-nativeOrb">
                            <SafeNativeOrbBalanceMenu
                                showNotificationBadge={false}
                                ctaText={msg("openOrbs", {}, locale)}
                                ctaOnClick={() => NavigationRouter.transitionTo("/shop?tab=orbs")}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="vc-desktop-bounties-state vc-desktop-bounties-error">
                            <strong>{msg("loadErrorTitle", {}, locale)}</strong>
                            <span>{error}</span>
                        </div>
                    )}

                    {loading && !result ? (
                        <div className="vc-desktop-bounties-skeletonGrid">
                            <div className="vc-desktop-bounties-skeletonCard" />
                            <div className="vc-desktop-bounties-skeletonCard" />
                            <div className="vc-desktop-bounties-skeletonCard" />
                        </div>
                    ) : bounties.length > 0 ? (
                        <div className="vc-desktop-bounties-grid">
                            {bounties.map((decision, index) => (
                                <BountyCard
                                    key={getBountyContent(decision)?.id ?? index}
                                    decision={decision}
                                    locale={locale}
                                    userId={currentUserId!}
                                    onClaimed={handleClaimed}
                                />
                            ))}
                        </div>
                    ) : !error && (
                        <div className="vc-desktop-bounties-emptyState">
                            <div className="vc-desktop-bounties-emptyIcon"><BountyIcon /></div>
                            <div>
                                <h3>{msg("emptyTitle", {}, locale)}</h3>
                                <p>{msg("emptyBody", {}, locale)}</p>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

const SafeBountiesPage = ErrorBoundary.wrap(BountiesPage, {
    displayName: "DesktopBountiesPage"
});

export function renderBountiesPage() {
    return React.createElement(SafeBountiesPage);
}
