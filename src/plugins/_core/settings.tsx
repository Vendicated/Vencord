/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and Megumin
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

import { Settings } from "@api/Settings";
import { BackupAndRestoreTab, CloudTab, PatchHelperTab, PluginsTab, ThemesTab, UpdaterTab, VencordTab } from "@components/settings/tabs";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import gitHash from "~git-hash";

type SectionType = "HEADER" | "DIVIDER" | "CUSTOM";
type SectionTypes = Record<SectionType, SectionType>;

const VencordMainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        role="img"
    >
        <path
            d="M8.69136 0.0943326C8.27332 0.139771 8.05522 0.575984 8.10974 0.984934C8.27332 2.03912 7.93708 2.98424 7.21914 3.28414C6.49212 3.58404 5.59243 3.14782 4.95629 2.28448C4.71092 1.95733 4.24744 1.81192 3.92028 2.06638C3.22053 2.60256 2.60256 3.22053 2.06638 3.92028C1.81192 4.24744 1.95733 4.71092 2.28448 4.95629C3.15691 5.59243 3.58404 6.50121 3.28414 7.21914C2.98424 7.94616 2.03912 8.27332 0.984934 8.10974C0.575984 8.04613 0.139771 8.27332 0.0852449 8.69136C-0.028415 9.56009 -0.028415 10.4399 0.0852449 11.3086C0.139771 11.7267 0.575984 11.9448 0.984934 11.8903C2.03912 11.7267 2.98424 12.0629 3.28414 12.7809C3.58404 13.5079 3.15691 14.4076 2.28448 15.0437C1.95733 15.2891 1.81192 15.7526 2.06638 16.0797C2.60256 16.7795 3.22053 17.3974 3.92028 17.9336C4.24744 18.1881 4.71092 18.0427 4.95629 17.7155C5.59243 16.8522 6.50121 16.416 7.21914 16.7159C7.94616 17.0158 8.27332 17.9609 8.10974 19.0151C8.04613 19.424 8.27332 19.8602 8.69136 19.9148C9.56009 20.0284 10.4399 20.0284 11.3086 19.9148C11.7267 19.8602 11.9448 19.424 11.8903 19.0151C11.7267 17.9609 12.0629 17.0158 12.7809 16.7159C13.5079 16.416 14.4076 16.8431 15.0437 17.7155C15.2891 18.0427 15.7526 18.1881 16.0797 17.9336C16.7795 17.3974 17.3974 16.7795 17.9336 16.0797C18.1881 15.7526 18.0427 15.2891 17.7155 15.0437C16.8431 14.4076 16.416 13.4988 16.7159 12.7809C17.0158 12.0538 17.9609 11.7267 19.0151 11.8903C19.424 11.9539 19.8602 11.7267 19.9148 11.3086C20.0284 10.4399 20.0284 9.56009 19.9148 8.69136C19.8602 8.27332 19.424 8.05522 19.0151 8.10974C17.9609 8.27332 17.0158 7.93708 16.7159 7.21914C16.416 6.49212 16.8431 5.59243 17.7155 4.95629C18.0427 4.71092 18.1881 4.24744 17.9336 3.92028C17.3992 3.22409 16.7759 2.60083 16.0797 2.06638C15.7526 1.81192 15.2891 1.95733 15.0437 2.28448C14.4076 3.15691 13.4988 3.58404 12.7809 3.28414C12.0538 2.98424 11.7267 2.03912 11.8903 0.984934C11.9539 0.575984 11.7267 0.139771 11.3086 0.0852449C10.4399 -0.028415 9.56009 -0.028415 8.69136 0.0852449V0.0943326ZM13.6351 10C13.6351 10.9641 13.2521 11.8887 12.5704 12.5704C11.8887 13.2521 10.9641 13.6351 10 13.6351C9.03591 13.6351 8.11131 13.2521 7.42959 12.5704C6.74788 11.8887 6.36489 10.9641 6.36489 10C6.36489 9.03591 6.74788 8.11131 7.42959 7.42959C8.11131 6.74788 9.03591 6.36489 10 6.36489C10.9641 6.36489 11.8887 6.74788 12.5704 7.42959C13.2521 8.11131 13.6351 9.03591 13.6351 10Z"
            fill="currentColor"
        />
    </svg>
);
const PluginsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        role="img"
    >
        <path
            d="M16.059 10.8227C15.2884 11.4957 14.1663 11.3616 13.4404 10.641C12.2975 9.50625 8.99308 6.21104 8.99308 6.21104C8.39701 5.63087 8.39701 4.44662 8.99308 3.85464C9.81903 3.03435 11.1053 1.75146 11.1053 1.75146C11.4641 1.39195 11.956 1.18972 12.4653 1.18886L15.8363 1.18425L17.0255 0L20 2.96048L18.8108 4.14473L18.8021 7.50878C18.7992 8.01636 18.5967 8.50262 18.235 8.86127C18.235 8.86127 17.0718 9.93835 16.059 10.8227ZM12.7315 11.9548L10.9954 13.8273C11.5972 14.4265 11.5972 14.9113 11.14 15.6997L8.89757 18.2485C8.53588 18.6081 8.04689 18.8103 7.53473 18.8111L4.16378 18.8158L2.97455 20L0 17.0395L1.18927 15.8553L1.20082 12.4912C1.20082 11.9836 1.40338 11.4974 1.76507 11.1387L3.87153 9.04044C4.46759 8.44846 5.65685 8.44846 6.23844 9.04044L6.24424 9.0465L8.02951 7.26998L9.21878 8.45423L7.43347 10.2305L9.81193 12.599L11.5972 10.8227L12.7315 11.9548Z"
            fill="currentColor"
        />
    </svg>
);
const ThemesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        role="img"
    >
        <path
            d="M13.3524 5.23938C13.9022 4.66945 14.0022 3.79955 14.0022 2.99965C14.0022 2.40637 14.1781 1.82642 14.5076 1.33313C14.8371 0.839844 15.3055 0.455372 15.8535 0.228336C16.4014 0.0012997 17.0044 -0.0581033 17.5862 0.0576387C18.1679 0.173381 18.7022 0.459069 19.1216 0.878577C19.541 1.29809 19.8267 1.83257 19.9424 2.41444C20.0581 2.99632 19.9987 3.59945 19.7717 4.14756C19.5447 4.69567 19.1604 5.16415 18.6672 5.49376C18.174 5.82337 17.5942 5.99929 17.0011 5.99929C16.2014 5.99929 15.3317 6.08928 14.7619 6.64921C14.4842 6.93001 14.3284 7.30908 14.3284 7.70409C14.3284 8.0991 14.4842 8.47817 14.7619 8.75896L15.8815 9.87883C16.4431 10.4413 16.7586 11.2037 16.7586 11.9986C16.7586 12.7935 16.4431 13.5559 15.8815 14.1183L10.8834 19.1177C10.6047 19.3974 10.2737 19.6193 9.90917 19.7707C9.54465 19.9221 9.15383 20 8.75914 20C8.36444 20 7.97362 19.9221 7.6091 19.7707C7.24458 19.6193 6.91352 19.3974 6.63492 19.1177L0.877037 13.3684C0.315442 12.806 0 12.0436 0 11.2487C0 10.4538 0.315442 9.69136 0.877037 9.12892L4.91555 5.0894L5.88519 4.11951C6.44749 3.55778 7.2097 3.24226 8.00441 3.24226C8.79912 3.24226 9.56134 3.55778 10.1236 4.11951L11.2432 5.23938C11.823 5.81931 12.7627 5.81931 13.3424 5.23938H13.3524ZM4.90555 7.89907L2.30651 10.5388C2.21282 10.6317 2.13845 10.7423 2.0877 10.8641C2.03695 10.986 2.01082 11.1167 2.01082 11.2487C2.01082 11.3807 2.03695 11.5114 2.0877 11.6332C2.13845 11.755 2.21282 11.8656 2.30651 11.9586L4.47571 14.1283L5.30541 13.2884C5.39861 13.1952 5.50926 13.1212 5.63104 13.0708C5.75281 13.0203 5.88333 12.9944 6.01515 12.9944C6.14696 12.9944 6.27748 13.0203 6.39925 13.0708C6.52103 13.1212 6.63168 13.1952 6.72488 13.2884C6.81809 13.3817 6.89202 13.4923 6.94246 13.6141C6.99291 13.7359 7.01887 13.8665 7.01887 13.9983C7.01887 14.1302 6.99291 14.2607 6.94246 14.3825C6.89202 14.5044 6.81809 14.615 6.72488 14.7083L5.88519 15.5382L6.47498 16.1281L8.3043 14.2883C8.49254 14.1 8.74784 13.9943 9.01404 13.9943C9.28025 13.9943 9.53555 14.1 9.72378 14.2883C9.91201 14.4766 10.0178 14.732 10.0178 14.9982C10.0178 15.2645 9.91201 15.5199 9.72378 15.7081L7.88446 17.5379L8.0544 17.7079C8.14732 17.8016 8.25788 17.876 8.3797 17.9268C8.50151 17.9775 8.63217 18.0037 8.76413 18.0037C8.8961 18.0037 9.02675 17.9775 9.14857 17.9268C9.27038 17.876 9.38094 17.8016 9.47387 17.7079L12.1029 15.0882L4.90555 7.89907Z"
            fill="currentColor"
        />
    </svg>
);
const CloudIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        role="img"
    >
        <g transform="translate(0 5)">
            <path
                d="M0.666667 10.3333C0.666667 8.66667 2 7.33333 3.66667 7.33333C3.8 7.33333 3.86667 7.33333 4 7.26667C4.06667 7.2 4.06667 7.13333 4.06667 7C4 6.73333 4 6.53333 4 6.33333C4 3.2 6.53333 0.666667 9.66667 0.666667C12.3333 0.666667 14.6 2.46667 15.2 5.06667C15.2667 5.2 15.4 5.33333 15.5333 5.33333C17.6667 5.4 19.3333 7.2 19.3333 9.33333C19.3333 11.5333 17.5333 13.3333 15.3333 13.3333H3.66667C2 13.3333 0.666667 12 0.666667 10.3333ZM10.6309 5.2712V12.3331C10.6309 12.51 10.5607 12.6796 10.4356 12.8047C10.3106 12.9297 10.141 13 9.96423 13C9.78741 13 9.61785 12.9297 9.49282 12.8047C9.3678 12.6796 9.29756 12.51 9.29756 12.3331V5.26453L7.09756 7.47181C6.96926 7.58021 6.80478 7.63619 6.63701 7.62854C6.46924 7.62089 6.31053 7.55019 6.19262 7.43056C6.07471 7.31093 6.00628 7.15119 6.00102 6.98328C5.99575 6.81537 6.05404 6.65166 6.16423 6.52488L9.49756 3.19062C9.62218 3.06844 9.78972 3 9.96423 3C10.1387 3 10.3063 3.06844 10.4309 3.19062L13.7642 6.52488C13.8344 6.58417 13.8916 6.65734 13.9321 6.73978C13.9727 6.82222 13.9958 6.91216 14 7.00395C14.0042 7.09574 13.9894 7.18741 13.9564 7.2732C13.9235 7.35899 13.8733 7.43705 13.8088 7.50248C13.7443 7.56792 13.6669 7.61931 13.5817 7.65344C13.4964 7.68758 13.4049 7.70371 13.3131 7.70083C13.2213 7.69795 13.1311 7.67612 13.0481 7.63671C12.9651 7.59729 12.8912 7.54115 12.8309 7.47181L10.6309 5.2712Z"
                fill="currentColor"
            />
        </g>
    </svg>
);
const BackupRestoreIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        role="img"
    >
        <path
            d="M19 0.0123206C19.2652 0.0123206 19.5196 0.11757 19.7071 0.304916C19.8946 0.492262 20 0.746357 20 1.0113V7.00521C20 7.27015 19.8946 7.52425 19.7071 7.7116C19.5196 7.89894 19.2652 8.00419 19 8.00419H13C12.7348 8.00419 12.4804 7.89894 12.2929 7.7116C12.1054 7.52425 12 7.27015 12 7.00521C12 6.74026 12.1054 6.48617 12.2929 6.29882C12.4804 6.11147 12.7348 6.00622 13 6.00622H16.93C16.352 5.00597 15.5638 4.14275 14.6198 3.47602C13.6758 2.80929 12.5983 2.35488 11.4616 2.1441C10.3249 1.93332 9.15592 1.97117 8.03526 2.25505C6.91459 2.53892 5.86883 3.06208 4.97 3.78848C4.76313 3.9554 4.49836 4.03338 4.23393 4.00528C3.96951 3.97718 3.72709 3.84529 3.56 3.63863C3.39291 3.43197 3.31485 3.16747 3.34298 2.90331C3.37111 2.63916 3.50313 2.39698 3.71 2.23006C4.7542 1.38308 5.959 0.755701 7.25204 0.385613C8.54507 0.0155249 9.89965 -0.0896328 11.2344 0.0764574C12.5691 0.242548 13.8565 0.676458 15.0191 1.35212C16.1818 2.02778 17.1957 2.93125 18 4.00826V1.0113C18 0.746357 18.1054 0.492262 18.2929 0.304916C18.4804 0.11757 18.7348 0.0123206 19 0.0123206ZM1 19.992C0.734784 19.992 0.48043 19.8867 0.292893 19.6994C0.105357 19.5121 0 19.258 0 18.993V12.9991C0 12.7342 0.105357 12.4801 0.292893 12.2927C0.48043 12.1054 0.734784 12.0001 1 12.0001H7C7.26522 12.0001 7.51957 12.1054 7.70711 12.2927C7.89464 12.4801 8 12.7342 8 12.9991C8 13.2641 7.89464 13.5182 7.70711 13.7055C7.51957 13.8928 7.26522 13.9981 7 13.9981H3.07C3.64801 14.9983 4.43617 15.8616 5.3802 16.5283C6.32424 17.195 7.40171 17.6494 8.53843 17.8602C9.67514 18.071 10.8441 18.0331 11.9647 17.7493C13.0854 17.4654 14.1312 16.9422 15.03 16.2158C15.1324 16.1332 15.2502 16.0715 15.3764 16.0343C15.5027 15.9971 15.6351 15.9851 15.7661 15.999C15.897 16.013 16.0239 16.0525 16.1395 16.1154C16.2552 16.1783 16.3573 16.2634 16.44 16.3657C16.5227 16.468 16.5845 16.5856 16.6217 16.7118C16.659 16.8379 16.6709 16.9702 16.657 17.101C16.6431 17.2318 16.6035 17.3586 16.5405 17.4741C16.4776 17.5896 16.3924 17.6916 16.29 17.7743C15.2452 18.6199 14.0403 19.2461 12.7475 19.6154C11.4547 19.9847 10.1005 20.0895 8.76616 19.9235C7.43181 19.7574 6.14476 19.324 4.98212 18.6491C3.81947 17.9743 2.80518 17.0719 2 15.9961V18.993C2 19.258 1.89464 19.5121 1.70711 19.6994C1.51957 19.8867 1.26522 19.992 1 19.992Z"
            fill="currentColor"
        />
    </svg>
);
const UpdaterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        role="img"
    >
        <path
            d="M10 0C10.2652 0 10.5196 0.105357 10.7071 0.292893C10.8946 0.48043 11 0.734784 11 1V11.59L14.3 8.29C14.3904 8.18601 14.5013 8.10182 14.6258 8.04272C14.7503 7.98362 14.8856 7.95088 15.0234 7.94656C15.1611 7.94224 15.2982 7.96644 15.4261 8.01762C15.5541 8.0688 15.6701 8.14587 15.7668 8.244C15.8635 8.34212 15.939 8.45918 15.9883 8.58783C16.0377 8.71648 16.0599 8.85394 16.0537 8.99159C16.0474 9.12924 16.0127 9.26411 15.9519 9.38774C15.891 9.51137 15.8053 9.62108 15.7 9.71L10.7 14.71C10.5131 14.8932 10.2618 14.9959 10 14.9959C9.73825 14.9959 9.48693 14.8932 9.3 14.71L4.3 9.71C4.19474 9.62108 4.10898 9.51137 4.04812 9.38774C3.98726 9.26411 3.95261 9.12924 3.94634 8.99159C3.94007 8.85394 3.96231 8.71648 4.01167 8.58783C4.06104 8.45918 4.13646 8.34212 4.2332 8.244C4.32994 8.14587 4.44592 8.0688 4.57385 8.01762C4.70179 7.96644 4.83892 7.94224 4.97665 7.94656C5.11438 7.95088 5.24972 7.98362 5.3742 8.04272C5.49868 8.10182 5.6096 8.18601 5.7 8.29L9 11.59V1C9 0.734784 9.10536 0.48043 9.29289 0.292893C9.48043 0.105357 9.73478 0 10 0ZM1 18C0.734784 18 0.48043 18.1054 0.292893 18.2929C0.105357 18.4804 0 18.7348 0 19C0 19.2652 0.105357 19.5196 0.292893 19.7071C0.48043 19.8946 0.734784 20 1 20H19C19.2652 20 19.5196 19.8946 19.7071 19.7071C19.8946 19.5196 20 19.2652 20 19C20 18.7348 19.8946 18.4804 19.7071 18.2929C19.5196 18.1054 19.2652 18 19 18H1Z"
            fill="currentColor"
        />
    </svg>
);
const PatchHelperIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        role="img"
    >
        <path
            d="M6.50001 13.1424C7.08334 13.5007 7.50001 14.0924 7.50001 14.7757V17.5007C7.50001 17.7218 7.5878 17.9337 7.74408 18.09C7.90036 18.2463 8.11233 18.3341 8.33334 18.3341H11.6667C11.8877 18.3341 12.0996 18.2463 12.2559 18.09C12.4122 17.9337 12.5 17.7218 12.5 17.5007V14.7757C12.5 14.0924 12.9167 13.5007 13.5 13.1424C14.4642 12.5455 15.2615 11.7141 15.8177 10.7259C16.3738 9.7377 16.6707 8.62474 16.6807 7.49081C16.6907 6.35687 16.4134 5.23886 15.8747 4.24099C15.3361 3.24313 14.5535 2.39789 13.6 1.78408C13.1 1.45908 12.5 1.85908 12.5 2.45074V7.43408C12.5 7.65509 12.4122 7.86705 12.2559 8.02333C12.0996 8.17961 11.8877 8.26741 11.6667 8.26741H8.33334C8.11233 8.26741 7.90036 8.17961 7.74408 8.02333C7.5878 7.86705 7.50001 7.65509 7.50001 7.43408V2.45074C7.50001 1.85908 6.90001 1.45908 6.40001 1.78408C5.44652 2.39789 4.66396 3.24313 4.12527 4.24099C3.58658 5.23886 3.30931 6.35687 3.31929 7.49081C3.32927 8.62474 3.62619 9.7377 4.18236 10.7259C4.73853 11.7141 5.53586 12.5455 6.50001 13.1424Z"
            fill="currentColor"
        />
    </svg>
);

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    required: true,

    patches: [
        {
            find: ".versionHash",
            replacement: [
                {
                    match: /\.compactInfo.+?\[\(0,\i\.jsxs?\)\((.{1,10}),(\{[^{}}]+\{.{0,20}.versionHash,.+?\})\),/,
                    replace: (m, component, props) => {
                        return `${m}$self.makeInfoElements(${component}, ${props}),`;
                    }
                },
                {
                    match: /\.info.+?\[\(0,\i\.jsxs?\)\((.{1,10}),(\{[^{}}]+\{.{0,20}.versionHash,.+?\})\)," "/,
                    replace: (m, component, props) => {
                        props = props.replace(/children:\[.+\]/, "");
                        return `${m},$self.makeInfoElements(${component}, ${props})`;
                    }
                },
                {
                    match: /copyValue:\i\.join\(" "\)/,
                    replace: "$& + $self.getInfoString()"
                }
            ]
        },
        {
            find: ".SEARCH_NO_RESULTS&&0===",
            replacement: [
                {
                    match: /(?<=section:(.{0,50})\.DIVIDER\}\))([,;])(?=.{0,200}(\i)\.push.{0,100}label:(\i)\.header)/,
                    replace: (_, sectionTypes, commaOrSemi, elements, element) => `${commaOrSemi} $self.addSettings(${elements}, ${element}, ${sectionTypes}) ${commaOrSemi}`
                },
                {
                    match: /({(?=.+?function (\i).{0,160}(\i)=\i\.useMemo.{0,140}return \i\.useMemo\(\(\)=>\i\(\3).+?\(\)=>)\2/,
                    replace: (_, rest, settingsHook) => `${rest}$self.wrapSettingsHook(${settingsHook})`
                }
            ]
        },
        {
            find: "#{intl::USER_SETTINGS_ACTIONS_MENU_LABEL}",
            replacement: {
                // Skip the check Discord performs to make sure the section being selected in the user settings context menu is valid
                match: /(?<=function\((\i),(\i),\i\)\{)(?=let \i=Object.values\(\i\.\i\).+?(\(0,\i\.openUserSettings\))\()/,
                replace: (_, settingsPanel, section, openUserSettings) => `${openUserSettings}(${settingsPanel},{section:${section}});return;`
            }
        },
        {
            find: "2025-09-user-settings-redesign-1",
            replacement: {
                match: /enabled:![01],showLegacyOpen:/g,
                replace: (m: string) => {
                    try {
                        const { disableNewUI } = Settings.plugins.Settings;

                        if (disableNewUI) {
                            return "enabled:false,showLegacyOpen:";
                        }
                    } catch {

                    }

                    return m;
                }
            }
        },
        {
            find: ".buildLayout().map",
            replacement: {
                match: /(\i)\.buildLayout\(\)(?=\.map)/,
                replace: "$self.buildLayout($1)"
            }
        }
    ],

    buildLayout(originalLayoutBuilder: any) {
        const layout = originalLayoutBuilder.buildLayout();
        if (originalLayoutBuilder.key !== "$Root") return layout;

        try {
            const { disableNewUI } = Settings.plugins.Settings;
            if (disableNewUI) return layout;
        } catch {

        }

        const makeEntry = (
            key: string,
            title: string,
            Component: React.ComponentType<any>,
            Icon: React.ComponentType<any>
        ) => ({
            key,
            type: 2,
            legacySearchKey: title.toUpperCase(),
            useTitle: () => title,
            icon: () => <Icon />,
            buildLayout: () => [
                {
                    key: key + "_panel",
                    type: 3,
                    useTitle: () => title,
                    buildLayout: () => [
                        {
                            key: key + "_pane",
                            type: 4,
                            buildLayout: () => [],
                            render: () => <Component />,
                            useTitle: () => title
                        }
                    ]
                }
            ]
        });

        const vencordEntries: any[] = [];

        vencordEntries.push(
            makeEntry("vencord_main", "Vencord", VencordTab, VencordMainIcon),
            makeEntry("vencord_plugins", "Plugins", PluginsTab, PluginsIcon),
            makeEntry("vencord_themes", "Themes", ThemesTab, ThemesIcon),
            makeEntry("vencord_cloud", "Cloud", CloudTab, CloudIcon),
            makeEntry("vencord_backup_restore", "Backup & Restore", BackupAndRestoreTab, BackupRestoreIcon),
        );

        if (!IS_UPDATER_DISABLED && UpdaterTab) {
            vencordEntries.push(makeEntry("vencord_updater", "Updater", UpdaterTab, UpdaterIcon));
        }

        if (IS_DEV && PatchHelperTab) {
            vencordEntries.push(makeEntry("vencord_patch_helper", "Patch Helper", PatchHelperTab, PatchHelperIcon));
        }

        const vencordSection = {
            key: "vencord_section",
            type: 1,
            useLabel: () => "Vencord",
            buildLayout: () => vencordEntries
        };

        if (layout.some(s => s.key === "vencord_section")) {
            return layout;
        }

        let insertIndex = layout.length;

        try {
            const { settingsLocation } = Settings.plugins.Settings;

            const getSectionIndexByLabel = (intlKey: string) => {
                const label = getIntlMessage(intlKey);
                if (!label) return -1;

                return layout.findIndex(sec => {
                    const secLabel =
                        typeof sec.useLabel === "function" ? sec.useLabel() : sec.legacySearchKey;
                    return secLabel === label;
                });
            };

            switch (settingsLocation) {
                case "top":
                    insertIndex = 0;
                    break;

                case "aboveNitro": {
                    const idx = getSectionIndexByLabel("BILLING_SETTINGS");
                    insertIndex = idx === -1 ? layout.length : idx;
                    break;
                }

                case "belowNitro": {
                    const idx = getSectionIndexByLabel("APP_SETTINGS");
                    insertIndex = idx === -1 ? layout.length : idx;
                    break;
                }

                case "aboveActivity": {
                    const idx = getSectionIndexByLabel("ACTIVITY_SETTINGS");
                    insertIndex = idx === -1 ? layout.length : idx;
                    break;
                }

                case "belowActivity": {
                    const idx = getSectionIndexByLabel("ACTIVITY_SETTINGS");
                    insertIndex = idx === -1 ? layout.length : idx + 1;
                    break;
                }

                case "bottom":
                default:
                    insertIndex = layout.length;
                    break;
            }
        } catch {
        }

        layout.splice(insertIndex, 0, vencordSection);

        return layout;
    },

    customSections: [] as ((SectionTypes: SectionTypes) => any)[],

    makeSettingsCategories(SectionTypes: SectionTypes) {
        return [
            {
                section: SectionTypes.HEADER,
                label: "Vencord",
                className: "vc-settings-header"
            },
            {
                section: "settings/tabs",
                label: "Vencord",
                element: VencordTab,
                className: "vc-settings"
            },
            {
                section: "VencordPlugins",
                label: "Plugins",
                element: PluginsTab,
                className: "vc-plugins"
            },
            {
                section: "VencordThemes",
                label: "Themes",
                element: ThemesTab,
                className: "vc-themes"
            },
            !IS_UPDATER_DISABLED && {
                section: "VencordUpdater",
                label: "Updater",
                element: UpdaterTab,
                className: "vc-updater"
            },
            {
                section: "VencordCloud",
                label: "Cloud",
                element: CloudTab,
                className: "vc-cloud"
            },
            {
                section: "settings/tabsSync",
                label: "Backup & Restore",
                element: BackupAndRestoreTab,
                className: "vc-backup-restore"
            },
            IS_DEV && {
                section: "VencordPatchHelper",
                label: "Patch Helper",
                element: PatchHelperTab,
                className: "vc-patch-helper"
            },
            ...this.customSections.map(func => func(SectionTypes)),
            {
                section: SectionTypes.DIVIDER
            }
        ].filter(Boolean);
    },

    isRightSpot({ header, settings }: { header?: string; settings?: string[]; }) {
        const firstChild = settings?.[0];
        // lowest two elements... sanity backup
        if (firstChild === "LOGOUT" || firstChild === "SOCIAL_LINKS") return true;

        const { settingsLocation } = Settings.plugins.Settings;

        if (settingsLocation === "bottom") return firstChild === "LOGOUT";
        if (settingsLocation === "belowActivity") return firstChild === "CHANGELOG";

        if (!header) return;

        try {
            const names = {
                top: getIntlMessage("USER_SETTINGS"),
                aboveNitro: getIntlMessage("BILLING_SETTINGS"),
                belowNitro: getIntlMessage("APP_SETTINGS"),
                aboveActivity: getIntlMessage("ACTIVITY_SETTINGS")
            };

            if (!names[settingsLocation] || names[settingsLocation].endsWith("_SETTINGS"))
                return firstChild === "PREMIUM";

            return header === names[settingsLocation];
        } catch {
            return firstChild === "PREMIUM";
        }
    },

    patchedSettings: new WeakSet(),

    addSettings(elements: any[], element: { header?: string; settings: string[]; }, sectionTypes: SectionTypes) {
        if (this.patchedSettings.has(elements) || !this.isRightSpot(element)) return;

        this.patchedSettings.add(elements);

        elements.push(...this.makeSettingsCategories(sectionTypes));
    },

    wrapSettingsHook(originalHook: (...args: any[]) => Record<string, unknown>[]) {
        return (...args: any[]) => {
            const elements = originalHook(...args);
            if (!this.patchedSettings.has(elements))
                elements.unshift(...this.makeSettingsCategories({
                    HEADER: "HEADER",
                    DIVIDER: "DIVIDER",
                    CUSTOM: "CUSTOM"
                }));

            return elements;
        };
    },

    options: {
        settingsLocation: {
            type: OptionType.SELECT,
            description: "Where to put the Vencord settings section",
            options: [
                { label: "At the very top", value: "top" },
                { label: "Above the Nitro section", value: "aboveNitro", default: true },
                { label: "Below the Nitro section", value: "belowNitro" },
                { label: "Above Activity Settings", value: "aboveActivity" },
                { label: "Below Activity Settings", value: "belowActivity" },
                { label: "At the very bottom", value: "bottom" },
            ]
        },
        disableNewUI: {
            type: OptionType.BOOLEAN,
            description: "Force Discord to use the old settings UI",
            default: false,
            restartNeeded: true,
        },
    },

    get electronVersion() {
        return VencordNative.native.getVersions().electron || window.legcord?.electron || null;
    },

    get chromiumVersion() {
        try {
            return VencordNative.native.getVersions().chrome
                // @ts-expect-error Typescript will add userAgentData IMMEDIATELY
                || navigator.userAgentData?.brands?.find(b => b.brand === "Chromium" || b.brand === "Google Chrome")?.version
                || null;
        } catch { // inb4 some stupid browser throws unsupported error for navigator.userAgentData, it's only in chromium
            return null;
        }
    },

    get additionalInfo() {
        if (IS_DEV) return " (Dev)";
        if (IS_WEB) return " (Web)";
        if (IS_VESKTOP) return ` (Vesktop v${VesktopNative.app.getVersion()})`;
        if (IS_STANDALONE) return " (Standalone)";
        return "";
    },

    getInfoRows() {
        const { electronVersion, chromiumVersion, additionalInfo } = this;

        const rows = [`Vencord ${gitHash}${additionalInfo}`];

        if (electronVersion) rows.push(`Electron ${electronVersion}`);
        if (chromiumVersion) rows.push(`Chromium ${chromiumVersion}`);

        return rows;
    },

    getInfoString() {
        return "\n" + this.getInfoRows().join("\n");
    },

    makeInfoElements(Component: React.ComponentType<React.PropsWithChildren>, props: React.PropsWithChildren) {
        return this.getInfoRows().map((text, i) =>
            <Component key={i} {...props}>{text}</Component>
        );
    }
});
