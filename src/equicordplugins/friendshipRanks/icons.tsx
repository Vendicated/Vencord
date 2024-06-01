/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function sproutIcon(props) {
    return (
        <svg width={props.height} height={props.height} viewBox="0 0 303 303" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="shape-gradient-Circle" gradientTransform="rotate(90)">
                    <stop offset="0%" stopColor="#5865F1" />
                </linearGradient>
            </defs>
            <defs>
                <mask id="mask-Circle" fill="black">
                    <rect width="100%" height="100%" fill="white" />
                    <g opacity="100" style={{ transformOrigin: "center center" }}></g>
                </mask>
            </defs>
            <g fill="#5865F1">
                <g>
                    <circle
                        cx="151.5"
                        cy="151.5"
                        r="151.5"
                        stroke="#ffffff"
                        strokeLinejoin="round"
                        strokeWidth="0"
                        style={{ transform: "none", transformOrigin: "151.5px 151.5px" }}
                    />
                </g>
            </g>
            <defs>
                <linearGradient id="icon-gradient-0" gradientTransform="rotate(0)">
                    <stop offset="0%" stopColor="#fff" />
                </linearGradient>
            </defs>
            <g
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeLinejoin="round"
                strokeWidth="0"
                style={{ transformOrigin: "151.5px 151.5px", transform: "translateX(61.5px) translateY(70.5px) scale(1) rotate(0deg)" }}
                filter="false"
            >
                <path
                    d="M180,36 L180,58.5 C180,74.0151647 173.836625,88.8948686 162.865747,99.8657467 C151.894869,110.836625 137.015165,117 121.5,117 L99,117 L99,162 L81,162 L81,99 L81.171,90 C83.5220892,59.5264011 108.93584,36 139.5,36 L180,36 Z M36,0 C63.119888,0.00205254816 87.1987774,17.349872 95.787,43.074 C81.8722924,54.865561 73.3399721,71.8002844 72.144,90 L63,90 C28.2060608,90 0,61.7939392 0,27 L0,0 L36,0 Z"
                    viewBox="0 0 180 162"
                />
            </g>
        </svg>
    );
}

export function bloomingIcon(props) {
    return (
        <svg width={props.height} height={props.height} viewBox="0 0 303 303" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient gradientTransform="rotate(90)">
                    <stop offset="0%" stopColor="#5865F1" />
                </linearGradient>
            </defs>
            <defs>
                <mask fill="black">
                    <rect width="100%" height="100%" fill="white" />
                    <g opacity="100" style={{ transformOrigin: "center center" }}></g>
                </mask>
            </defs>
            <g fill="#5865F1">
                <g>
                    <circle
                        cx="151.5"
                        cy="151.5"
                        r="151.5"
                        stroke="#ffffff"
                        strokeLinejoin="round"
                        strokeWidth="0"
                        style={{ transform: "none", transformOrigin: "151.5px 151.5px" }}
                    />
                </g>
            </g>
            <defs>
                <linearGradient id="icon-gradient-0" gradientTransform="rotate(0)">
                    <stop offset="0%" stopColor="#fff" />
                </linearGradient>
            </defs>
            <g
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeLinejoin="round"
                strokeWidth="0"
                style={{ transformOrigin: "90px 81px", transform: "translateX(66.5px) translateY(77.5px) scale(1) rotate(0deg)" }}
            >
                <path
                    d="M84.9998992,147.027244 C84.1399412,147.027244 83.2803153,146.805116 82.5100055,146.360196 C81.6732896,145.877424 61.7943156,134.335394 41.6301277,116.944321 C29.6790363,106.637111 20.1391475,96.413904 13.2760854,86.5592506 C4.39494432,73.8073027 -0.0711925371,61.5414468 4.71843149e-15,50.1020138 C0.0851936394,36.7909271 4.85281383,24.2727283 13.426495,14.8530344 C22.1449414,5.27463015 33.7799401,0 46.188901,0 C62.0921466,0 76.6320767,8.90836755 85.0002312,23.0203108 C93.3683858,8.90869958 107.908316,0 123.811562,0 C135.53488,0 146.719978,4.75931943 155.307605,13.4013988 C164.731947,22.8851746 170.086596,36.2852453 170,50.1650995 C169.926558,61.5846107 165.376749,73.8318729 156.476019,86.5662233 C149.591706,96.4158962 140.065099,106.634454 128.160824,116.938677 C108.070347,134.328089 88.3341455,145.869787 87.5037382,146.352559 C86.7432923,146.79448 85.8794285,147.027244 84.9998992,147.027244 Z"
                    viewBox="0 0 170 148"
                />
            </g>
        </svg>
    );
}

export function burningIcon(props) {
    return (
        <svg width={props.width} height={props.height} viewBox="0 0 303 303" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient gradientTransform="rotate(90)">
                    <stop offset="0%" stopColor="#5865F1" />
                </linearGradient>
            </defs>
            <defs>
                <mask id="mask-Circle" fill="black">
                    <rect width="100%" height="100%" fill="white" />
                    <g opacity="100" style={{ transformOrigin: "center center" }}></g>
                </mask>
            </defs>
            <g>
                <g mask="#5865F1" fill="#5865F1">
                    <circle
                        cx="151.5"
                        cy="151.5"
                        r="151.5"
                        stroke="#ffffff"
                        strokeLinejoin="round"
                        strokeWidth="0"
                        style={{ transform: "none", transformOrigin: "151.5px 151.5px" }}
                    />
                </g>
            </g>
            <defs>
                <linearGradient id="icon-gradient-0" gradientTransform="rotate(0)">
                    <stop offset="0%" stopColor="#fff" />
                </linearGradient>
            </defs>
            <g
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeLinejoin="round"
                strokeWidth="0"
                style={{ transformOrigin: "90px 81px", transform: "translateX(84px) translateY(65.5px) scale(1) rotate(0deg)" }}
            >
                <path
                    d="M129.94 91.26C116.835 57.271 70.148 55.43 81.41 5.674a4.32 4.32 0 00-6.348-4.71c-30.51 18.019-52.215 53.85-33.991 100.943a4.094 4.094 0 01-6.348 4.914C19.571 95.355 17.933 78.975 19.366 67.1a4.095 4.095 0 00-7.577-2.867C6.056 73.037.322 86.96.322 108.05c3.277 46.888 42.797 61.22 57.13 63.063 20.272 2.662 42.387-1.228 58.154-15.766A56.503 56.503 0 00129.94 91.26zM52.538 133.44a26.495 26.495 0 0020.067-19.451c2.867-12.081-7.986-23.547-.819-42.589C74.448 86.96 99.02 96.79 99.02 113.988c.614 21.089-22.32 39.312-46.482 19.553v-.102z"
                    viewBox="0 0 135 172"
                />
            </g>
        </svg>
    );
}

export function starIcon(props) {
    return (
        <svg width={props.width} height={props.height} viewBox="0 0 303 303" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="shape-gradient-Circle" gradientTransform="rotate(90)">
                    <stop offset="0%" stopColor="#5865F1" />
                </linearGradient>
            </defs>
            <defs>
                <mask id="mask-Circle" fill="black">
                    <rect width="100%" height="100%" fill="white" />
                    <g opacity="100" style={{ transformOrigin: "center center" }}></g>
                </mask>
            </defs>
            <g fill="#5865F1">
                <g>
                    <circle
                        cx="151.5"
                        cy="151.5"
                        r="151.5"
                        stroke="#ffffff"
                        strokeLinejoin="round"
                        strokeWidth="0"
                        style={{ transform: "none", transformOrigin: "151.5px 151.5px" }}
                    />
                </g>
            </g>
            <defs>
                <linearGradient id="icon-gradient-0" gradientTransform="rotate(0)">
                    <stop offset="0%" stopColor="#fff" />
                </linearGradient>
            </defs>
            <g
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeLinejoin="round"
                strokeWidth="0"
                style={{ transformOrigin: "90px 81px", transform: "translateX(64px) translateY(68.5px) scale(1) rotate(0deg)" }}
            >
                <path
                    d="M169.456 73.514l-32.763 28.256a9.375 9.375 0 00-3.071 10.033l10.238 41.155a10.115 10.115 0 01-15.358 11.056l-36.858-22.113a9.298 9.298 0 00-10.238 0l-36.858 22.113c-8.191 4.095-17.406-2.047-15.358-11.056l10.238-41.155c1.024-4.095 0-8.19-3.071-10.033L3.594 73.514a10.667 10.667 0 016.144-18.222l43-3.072c4.096-1.024 7.167-3.071 8.191-5.938l18.43-40.13a9.992 9.992 0 0118.428 0l16.382 39.311a8.926 8.926 0 008.19 6.143l43.001 3.89c8.949.82 13.044 11.876 4.096 18.018z"
                    viewBox="0 0 175 166"
                />
            </g>
        </svg>
    );
}

export function royalIcon(props) {
    return (
        <svg width={props.width} height={props.height} viewBox="0 0 303 303" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="shape-gradient-Circle" gradientTransform="rotate(90)">
                    <stop offset="0%" stopColor="#5865F1" />
                </linearGradient>
            </defs>
            <defs>
                <mask id="mask-Circle" fill="black">
                    <rect width="100%" height="100%" fill="white" />
                    <g opacity="100" style={{ transformOrigin: "center center" }}></g>
                </mask>
            </defs>
            <g fill="#5865F1">
                <g>
                    <circle
                        cx="151.5"
                        cy="151.5"
                        r="151.5"
                        stroke="#ffffff"
                        strokeLinejoin="round"
                        strokeWidth="0"
                        style={{ transform: "none", transformOrigin: "151.5px 151.5px" }}
                    />
                </g>
            </g>
            <defs>
                <linearGradient id="icon-gradient-0" gradientTransform="rotate(0)">
                    <stop offset="0%" stopColor="#fff" />
                </linearGradient>
            </defs>
            <g
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeLinejoin="round"
                strokeWidth="0"
                style={{ transformOrigin: "90px 81px", transform: "translateX(71px) translateY(91px) scale(1) rotate(0deg)" }}
            >
                <path
                    d="M16.6 113.59c.9 4.2 4.1 7.1 7.8 7.1h112.5c3.7 0 6.9-2.9 7.8-7.1l16-74.794a10.002 10.002 0 00-2.9-9.7 7.09 7.09 0 00-8.9-.5l-33.6 23.499L87.4 3.398a1.85 1.85 0 00-.7-.8l-.1-.1c-.1-.1-.2-.3-.4-.4a6.71 6.71 0 00-4.5-1.8h-2a6.91 6.91 0 00-4.5 1.8 2.177 2.177 0 00-.5.4c-.3.3-.6.5-.7.8l-.2.4-.1.1-.4.6L46 51.995 12.4 28.497a7.09 7.09 0 00-8.9.5 10.248 10.248 0 00-3 9.799l16.1 74.794z"
                    viewBox="0 0 161 121"
                />
            </g>
        </svg>
    );
}

export function bestiesIcon(props) {
    return (
        <svg width={props.width} height={props.height} viewBox="0 0 303 303" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="shape-gradient-Circle" gradientTransform="rotate(90)">
                    <stop offset="0%" stopColor="#5865F1" />
                </linearGradient>
            </defs>
            <defs>
                <mask id="mask-Circle" fill="black">
                    <rect width="100%" height="100%" fill="white" />
                    <g opacity="100" style={{ transformOrigin: "center center" }}></g>
                </mask>
            </defs>
            <g fill="#5865F1">
                <g>
                    <circle
                        cx="151.5"
                        cy="151.5"
                        r="151.5"
                        stroke="#ffffff"
                        strokeLinejoin="round"
                        strokeWidth="0"
                        style={{ transform: "none", transformOrigin: "151.5px 151.5px" }}
                    />
                </g>
            </g>
            <defs>
                <linearGradient id="icon-gradient-0" gradientTransform="rotate(0)">
                    <stop offset="0%" stopColor="#fff" />
                </linearGradient>
            </defs>
            <g
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeLinejoin="round"
                strokeWidth="0"
                style={{ transformOrigin: "90px 81px", transform: "translateX(66.5px) translateY(66.5px) scale(1) rotate(0deg)" }}
            >
                <path
                    d="M166.102378,3.92112065 C161.691624,-0.489633516 154.908699,-1.19387158 145.975996,1.88253679 C142.047089,3.21688259 137.599269,5.29253161 132.595472,8.10948386 C129.593194,9.81448127 126.368525,11.7418696 123.032661,13.9657793 C122.143097,14.5588219 121.253533,15.1518645 120.326904,15.7819722 C125.441896,18.3765335 130.223302,21.5270722 134.634056,25.2335883 C135.671881,24.6034805 136.635575,23.9733728 137.599269,23.4173954 C146.050126,18.3765335 151.350444,16.4491451 154.130331,15.8931677 C153.389028,19.636749 150.164359,28.0505405 140.082635,42.5800837 C139.267201,43.7291037 138.451768,44.9151888 137.599269,46.101274 C135.708946,43.5437779 133.596232,41.0604121 131.261127,38.7623721 C105.723231,13.2244761 64.2843806,13.2244761 38.7464846,38.7623721 C13.2085886,64.3002681 13.2085886,105.739118 38.7464846,131.277014 C41.0815898,133.612119 43.5278904,135.724833 46.0853865,137.615157 C44.8993014,138.467655 43.7132162,139.283089 42.5641962,140.098523 C28.0346531,150.143181 19.6208615,153.404915 15.8772802,154.146219 C16.3220622,151.885244 17.6934731,147.845141 20.9922725,141.766455 C22.1412924,139.653741 23.5127034,137.28157 25.1806357,134.649944 C21.5111847,130.23919 18.360646,125.457784 15.7290196,120.342792 C15.0989118,121.232356 14.5058693,122.158985 13.9128267,123.048548 C10.8364183,127.718759 8.2789222,132.055383 6.24033834,136.021355 C4.35001512,139.653741 2.90447384,142.989605 1.86664933,145.991883 C-1.17269388,154.924587 -0.505520981,161.707511 3.90523319,166.118266 C8.31598736,170.52902 15.0989118,171.233258 24.0316157,168.156849 C30.332693,166.00707 38.0422466,161.929902 46.9749504,156.073607 C64.6179671,144.472212 85.6709786,126.79213 106.205078,106.25803 C126.739177,85.7239312 144.456324,64.6709197 156.020654,47.027903 C161.87695,38.0951992 165.954117,30.3856457 168.103897,24.0845683 C171.180305,15.1147993 170.513132,8.36893998 166.102378,3.92112065 Z M114.952456,114.968343 C101.979649,127.94115 88.7844521,139.802001 76.2934928,149.84666 C95.7897675,152.441221 116.286802,146.251339 131.261127,131.277014 C146.272517,116.265624 152.462399,95.805655 149.830772,76.3093803 C139.786114,88.8003396 127.925262,101.995537 114.952456,114.968343 L114.952456,114.968343 Z"
                    viewBox="0 0 170 170"
                />
            </g>
        </svg>
    );
}
