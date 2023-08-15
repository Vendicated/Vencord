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

export const SupressionIcon = ({ enabled }: { enabled: boolean; }) => enabled
    ? <svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24"><path d="M10.889 4C10.889 3.44772 11.3367 3 11.889 3H12.1112C12.6635 3 13.1112 3.44772 13.1112 4V20C13.1112 20.5523 12.6635 21 12.1112 21H11.889C11.3367 21 10.889 20.5523 10.889 20V4Z" fill="currentColor"></path><path d="M6.44439 6.25C6.44439 5.69772 6.89211 5.25 7.44439 5.25H7.66661C8.2189 5.25 8.66661 5.69772 8.66661 6.25V17.75C8.66661 18.3023 8.2189 18.75 7.66661 18.75H7.44439C6.89211 18.75 6.44439 18.3023 6.44439 17.75V6.25Z" fill="currentColor"></path><path d="M3.22222 15.375C3.77451 15.375 4.22222 14.9273 4.22222 14.375L4.22222 9.625C4.22222 9.07272 3.77451 8.625 3.22222 8.625H3C2.44772 8.625 2 9.07272 2 9.625V14.375C2 14.9273 2.44772 15.375 3 15.375H3.22222Z" fill="currentColor"></path><path d="M22.0001 13.25C22.0001 13.8023 21.5523 14.25 21.0001 14.25H20.7778C20.2255 14.25 19.7778 13.8023 19.7778 13.25V10.75C19.7778 10.1977 20.2255 9.75 20.7778 9.75H21.0001C21.5523 9.75 22.0001 10.1977 22.0001 10.75V13.25Z" fill="currentColor"></path><path d="M16.3333 7.5C15.781 7.5 15.3333 7.94772 15.3333 8.5V15.5C15.3333 16.0523 15.781 16.5 16.3333 16.5H16.5555C17.1078 16.5 17.5555 16.0523 17.5555 15.5V8.5C17.5555 7.94772 17.1078 7.5 16.5555 7.5H16.3333Z" fill="currentColor"></path></svg>
    : <svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 48 48"><path d="M30.6666 24.9644L35.1111 20.5199V31C35.1111 32.1046 34.2156 33 33.1111 33H32.6666C31.562 33 30.6666 32.1046 30.6666 31V24.9644Z" fill="currentColor"></path><path d="M26.2224 14.1463V8C26.2224 6.89543 25.327 6 24.2224 6H23.7779C22.6734 6 21.7779 6.89543 21.7779 8V18.5907L26.2224 14.1463Z" fill="currentColor"></path><path d="M21.7779 33.8543L21.9254 33.7056L26.2224 29.4086V40C26.2224 41.1046 25.327 42 24.2224 42H23.7779C22.6734 42 21.7779 41.1046 21.7779 40V33.8543Z" fill="currentColor"></path><path d="M17.3332 23.0354L12.8888 27.4799V12.5C12.8888 11.3954 13.7842 10.5 14.8888 10.5H15.3332C16.4378 10.5 17.3332 11.3954 17.3332 12.5V23.0354Z" fill="currentColor"></path><path d="M8.44445 28.75C8.44445 29.8546 7.54902 30.75 6.44445 30.75H6C4.89543 30.75 4 29.8546 4 28.75V19.25C4 18.1454 4.89543 17.25 6 17.25H6.44445C7.54902 17.25 8.44445 18.1454 8.44445 19.25L8.44445 28.75Z" fill="currentColor"></path><path d="M44.0001 26.5C44.0001 27.6046 43.1047 28.5 42.0001 28.5H41.5557C40.4511 28.5 39.5557 27.6046 39.5557 26.5V21.5C39.5557 20.3954 40.4511 19.5 41.5557 19.5H42.0001C43.1047 19.5 44.0001 20.3954 44.0001 21.5V26.5Z" fill="currentColor"></path><path d="M42 8.54L39.46 6L6 39.46L8.54 42L16.92 33.64L19.38 31.16L22.7 27.84L29.98 20.56L42 8.54Z" fill="currentColor"></path></svg>;
