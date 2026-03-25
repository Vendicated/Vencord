/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { copyWithToast, openImageModal } from "@utils/discord";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { MessageStore, Parser, ReactDOM, useEffect, useRef, useState } from "@webpack/common";

const MarkupClasses = findCssClassesLazy("markup", "codeContainer");
const MessageClasses = findCssClassesLazy("messageContent", "markupRtl");

const enum ReferencedMessageState {
    LOADED = 0,
    NOT_LOADED = 1,
    DELETED = 2,
}

type ReferencedMessage =
    | { state: ReferencedMessageState.LOADED; message: Message; }
    | { state: ReferencedMessageState.NOT_LOADED | ReferencedMessageState.DELETED; };

interface ReplyProps {
    referencedMessage: ReferencedMessage;
    baseMessage: Message;
}

function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

function AudioPlayer({ src }: { src: string; }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);

    const toggle = () => {
        const a = audioRef.current;
        if (!a) return;
        if (playing) a.pause(); else a.play();
    };

    return (
        <div className="vc-expanded-reply-audio">
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
            />
            <button className="vc-expanded-reply-audio-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
                {playing
                    ? <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z" /></svg>
                }
            </button>
            <input
                className="vc-expanded-reply-audio-bar"
                type="range"
                min={0}
                max={duration || 1}
                step={0.01}
                value={current}
                onChange={e => {
                    const a = audioRef.current;
                    if (a) a.currentTime = Number(e.target.value);
                }}
            />
            <span className="vc-expanded-reply-audio-time">
                {fmt(current)} / {fmt(duration)}
            </span>
        </div>
    );
}

function VideoControls({ playing, current, duration, volume, muted, onToggle, onToggleMute, onSeek, onVolume, onFullscreen }: {
    playing: boolean; current: number; duration: number; volume: number; muted: boolean;
    onToggle(): void; onToggleMute(): void; onSeek(v: number): void; onVolume(v: number): void; onFullscreen(): void;
}) {
    return (
        <div className="vc-expanded-reply-video-controls" onClick={e => e.stopPropagation()}>
            <button className="vc-expanded-reply-video-btn" onClick={onToggle} aria-label={playing ? "Pause" : "Play"}>
                {playing
                    ? <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z" /></svg>
                }
            </button>
            <input
                className="vc-expanded-reply-video-bar"
                type="range" min={0} max={duration || 1} step={0.01} value={current}
                style={{ "--pct": `${(current / (duration || 1)) * 100}%` } as React.CSSProperties}
                onChange={e => onSeek(Number(e.target.value))}
            />
            <span className="vc-expanded-reply-video-time">{fmt(current)} / {fmt(duration)}</span>
            <input
                className="vc-expanded-reply-video-volume"
                type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                onChange={e => onVolume(Number(e.target.value))}
            />
            <button className="vc-expanded-reply-video-btn" onClick={onToggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                {muted || volume === 0
                    ? <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
                }
            </button>
            <button className="vc-expanded-reply-video-btn" onClick={onFullscreen} aria-label="Fullscreen">
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
            </button>
        </div>
    );
}

function VideoPlayer({ src }: { src: string; }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);

    const toggle = () => { const v = videoRef.current; if (!v) return; if (playing) v.pause(); else v.play(); };
    const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !muted; setMuted(!muted); };
    const seek = (val: number) => { const v = videoRef.current; if (v) v.currentTime = val; };
    const changeVolume = (val: number) => { const v = videoRef.current; if (!v) return; v.volume = val; v.muted = val === 0; };

    const requestFullscreen = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.requestFullscreen) v.requestFullscreen();
    };

    return (
        <div className="vc-expanded-reply-video-wrapper">
            <video
                ref={videoRef}
                src={src}
                className="vc-expanded-reply-video"
                preload="metadata"
                onClick={toggle}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={() => setCurrent(videoRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
                onVolumeChange={() => { setVolume(videoRef.current?.volume ?? 1); setMuted(videoRef.current?.muted ?? false); }}
            />
            <VideoControls
                playing={playing} current={current} duration={duration} volume={volume} muted={muted}
                onToggle={toggle} onToggleMute={toggleMute} onSeek={seek} onVolume={changeVolume}
                onFullscreen={requestFullscreen}
            />
        </div>
    );
}

function CopyButton({ fullMsg }: { fullMsg: any; }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const mediaAtts: any[] = (fullMsg.attachments ?? []).filter((a: any) =>
        a.content_type?.startsWith("image/") || a.content_type?.startsWith("video/") || a.content_type?.startsWith("audio/")
    );
    const hasText = !!fullMsg.content;
    const hasMedia = mediaAtts.length > 0;

    const mediaLabel = (a: any) => a.content_type?.startsWith("image/") ? "Copy image URL"
        : a.content_type?.startsWith("video/") ? "Copy video URL"
            : "Copy audio URL";

    useEffect(() => {
        if (!showMenu) return;
        const onMouseDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
        };
        document.addEventListener("mousedown", onMouseDown);
        return () => document.removeEventListener("mousedown", onMouseDown);
    }, [showMenu]);

    const copyIcon = (
        <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
        </svg>
    );

    if (!hasText && mediaAtts.length === 1) {
        return (
            <button
                className="vc-expanded-reply-copy"
                onClick={() => copyWithToast(mediaAtts[0].url)}
                aria-label="Copy"
            >
                {copyIcon}
            </button>
        );
    }

    if (!hasMedia) {
        return (
            <button
                className="vc-expanded-reply-copy"
                onClick={() => copyWithToast(fullMsg.content || "")}
                aria-label="Copy"
            >
                {copyIcon}
            </button>
        );
    }

    return (
        <div className="vc-expanded-reply-copy-wrapper" ref={menuRef}>
            <button
                className="vc-expanded-reply-copy"
                onClick={() => setShowMenu(m => !m)}
                aria-label="Copy"
            >
                {copyIcon}
            </button>
            {showMenu && (
                <div className="vc-expanded-reply-copy-menu">
                    {hasText && <button onClick={() => { copyWithToast(fullMsg.content); setShowMenu(false); }}>Copy text</button>}
                    {mediaAtts.map((a, i) => (
                        <button key={i} onClick={() => { copyWithToast(a.url); setShowMenu(false); }}>{mediaLabel(a)}</button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ExpandedReplyBtn({ referencedMessage, baseMessage }: ReplyProps) {
    const [expanded, setExpanded] = useState(false);
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
    const isInFullscreen = useRef(false);

    useEffect(() => {
        const onFsChange = () => { isInFullscreen.current = !!document.fullscreenElement; };
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    useEffect(() => {
        if (!expanded) return;

        const onMouseDown = (e: MouseEvent) => {
            if (isInFullscreen.current || document.fullscreenElement) return;
            if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
                wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setExpanded(false);
            }
        };

        const onScroll = () => { if (!isInFullscreen.current) setExpanded(false); };

        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("scroll", onScroll, true);
        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("scroll", onScroll, true);
        };
    }, [expanded]);

    useEffect(() => {
        if (!expanded || !wrapperRef.current) return;

        const compute = () => {
            if (!wrapperRef.current) return;

            const replyBar = wrapperRef.current.closest("[class*='repliedMessage']");
            const replyRect = replyBar?.getBoundingClientRect();
            const btn = wrapperRef.current.getBoundingClientRect();

            const left = replyRect ? replyRect.left : btn.left - 40;
            const width = replyRect ? Math.min(replyRect.width, 500) : 480;
            const bottom = window.innerHeight - btn.top + 4;
            const maxHeight = btn.top - 8;

            setPopupStyle({ left, width, bottom, maxHeight });
        };

        requestAnimationFrame(compute);
    }, [expanded]);

    if (referencedMessage.state !== ReferencedMessageState.LOADED) return null;

    const msg = referencedMessage.message;
    const fullMsg = (MessageStore.getMessage(baseMessage.channel_id, msg.id) as any) ?? msg;

    if (!fullMsg.content && (fullMsg.attachments?.length ?? 0) === 0 && (fullMsg.embeds?.length ?? 0) === 0) return null;

    const author = fullMsg.author as any;
    const avatarSrc = author?.id && author?.avatar
        ? `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.webp?size=32`
        : `https://cdn.discordapp.com/embed/avatars/${author?.discriminator ? Number(author.discriminator) % 5 : 0}.png`;

    const popup = expanded && (
        <div
            className="vc-expanded-reply-content"
            ref={popupRef}
            style={popupStyle}
            onClick={e => e.stopPropagation()}
        >
            <div className="vc-expanded-reply-header">
                <img className="vc-expanded-reply-avatar" src={avatarSrc} alt="" />
                <span className="vc-expanded-reply-author">@{author?.username}</span>
                <CopyButton fullMsg={fullMsg} />
                <button
                    className="vc-expanded-reply-close"
                    onClick={() => setExpanded(false)}
                    aria-label="Close"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>
            </div>
            <div className="vc-expanded-reply-body">
                {fullMsg.content && (
                    <div className={classes(MarkupClasses.markup, MessageClasses.messageContent, "vc-expanded-reply-text")}>
                        {Parser.parse(fullMsg.content, false, {
                            channelId: baseMessage.channel_id,
                            messageId: msg.id,
                            allowLinks: true,
                            allowHeading: true,
                            allowList: true,
                            allowEmojiLinks: true,
                        })}
                    </div>
                )}
                {fullMsg.attachments?.map((att: any) => {
                    if (att.content_type?.startsWith("image/")) {
                        return (
                            <img
                                key={att.id}
                                src={att.url}
                                className="vc-expanded-reply-image"
                                alt={att.filename}
                                loading="lazy"
                                onClick={() => openImageModal({
                                    url: att.url,
                                    width: att.width,
                                    height: att.height,
                                })}
                            />
                        );
                    }
                    if (att.content_type?.startsWith("video/")) {
                        return <VideoPlayer key={att.id} src={att.url} />;
                    }
                    if (att.content_type?.startsWith("audio/")) {
                        return <AudioPlayer key={att.id} src={att.url} />;
                    }
                    return null;
                })}
            </div>
        </div>
    );

    return (
        <span className="vc-expanded-reply-wrapper" ref={wrapperRef}>
            <button
                className="vc-expanded-reply-btn"
                onClick={e => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                }}
                aria-label={expanded ? "Collapse reply" : "Expand reply"}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" className={expanded ? "vc-expanded-reply-chevron-open" : "vc-expanded-reply-chevron"}>
                    <path fill="currentColor" d="M7 10l5 5 5-5z" />
                </svg>
            </button>
            {popup && ReactDOM.createPortal(popup, document.body)}
        </span>
    );
}

export default definePlugin({
    name: "ExpandedReply",
    description: "Adds a button to expand replied message previews to show full content",
    authors: [{ name: "kira_kohler", id: 839217437383983184n }],

    patches: [
        {
            find: "#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}",
            replacement: {
                match: /\.onClickReply,.+?}\),(?=\i,\i,\i\])/,
                replace: "$&$self.ExpandedReplyBtn(arguments[0]),"
            }
        }
    ],

    ExpandedReplyBtn: ErrorBoundary.wrap(ExpandedReplyBtn, { noop: true }),
});
