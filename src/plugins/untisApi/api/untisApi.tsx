/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { generateTOTP } from "./otp";
const proxyUrl = "https://cors-anywhere.herokuapp.com/";

import Getter from "./Getter";
import { _Class, _Room, _Subject, _Teacher, periodArray, userApiData } from "./interfaces";


class WebUntisAPI {
    private school: string;
    private user: string;
    private userID: number | undefined;
    private userFullName: string | undefined;
    private classID: number[] | undefined;
    private schoolName: string | undefined;
    private secretKey: string;
    private authToken: string | null = null;
    private untisver: string = "arche";
    private FullUntisIdData!: userApiData;
    private typeuseage: string;



    constructor(school: string, user: string, secretKey: string, untisver: string = "defaultVersion", typeuseage: string = "", classroomid: number[] | undefined = undefined) {
        this.school = school;
        this.user = user;
        this.secretKey = secretKey;
        this.typeuseage = typeuseage;
        this.untisver = untisver;
        this.classID = [];

    }
    public async getCurrentLesson(offset: number = 0) {
        const timetable = await this.getTimetable({});
        const now = Date.now();
        const { periods } = timetable;

        const currentIndex = periods.findIndex(
            period => period.startDateTimeUnix! <= now && period.endDateTimeUnix! >= now
        );



        return periods[currentIndex];
    }





    public async setUp() {
        await this.authenticate();
        await this.cacheIdsToNames();


        this.userID = this.FullUntisIdData.userData.elemId;

        this.classID = this.FullUntisIdData.userData.klassenIds;
        this.userFullName = this.FullUntisIdData.userData.displayName;
        this.schoolName = this.FullUntisIdData.userData.schoolName;
    }
    private async renameArray(liste: periodArray) {
        var temp = new Getter(this.FullUntisIdData);
        var returnliste = liste;


        returnliste.periods.forEach(period => {
            period.subjects = [] as _Subject[];
            period.teachers = [] as _Teacher[];
            period.classes = [] as _Class[];
            period.rooms = [] as _Room[];
            period.startDateTimeUnix = new Date(period.startDateTime).getTime();
            period.endDateTimeUnix = new Date(period.endDateTime).getTime();

            period.elements.forEach(element2 => {

                if (element2.type === "SUBJECT") {

                    const tempSubject: _Subject = {
                        type: "SUBJECT",
                        id: element2.id,
                        orgId: element2.orgId,
                        name: temp.getSubjectNameFromID(element2.id),
                        longName: temp.getSubjectLongNameFromID(element2.id)
                    };
                    period.subjects?.push(tempSubject);
                }

                if (element2.type === "TEACHER") {
                    const tempTeacher: _Teacher = {
                        type: "TEACHER",
                        id: element2.id,
                        orgId: element2.orgId,
                        name: temp.getTeacherNameFromID(element2.id),
                        longName: temp.getTeacherFullNameFromID(element2.id)
                    };
                    period.teachers?.push(tempTeacher);
                }

                if (element2.type === "CLASS") {
                    const tempClass: _Class = {
                        type: "CLASS",
                        id: element2.id,
                        orgId: element2.orgId,
                        name: temp.getClassNameFromID(element2.id),
                        longName: temp.getClassLongNameFromID(element2.id)
                    };
                    period.classes?.push(tempClass);
                }

                if (element2.type === "ROOM") {
                    const tempRoom: _Room = {
                        type: "ROOM",
                        id: element2.id,
                        orgId: element2.orgId,
                        name: temp.getRoomNameFromID(element2.id),
                        longName: temp.getRoomLongNameFromID(element2.id)
                    };
                    period.rooms?.push(tempRoom);
                }


            });
        });
        return returnliste;
    }

    private async cacheIdsToNames() {


        const timetableParams = {

            masterDataTimestamp: 1724834423826,
            type: this.typeuseage,
            startDate: this.getCurrentMonday() || this.getCurrentMonday(),
            endDate: this.getCurrentFriday() || this.getCurrentFriday(),
            auth: {
                user: this.user,
                otp: await generateTOTP(this.secretKey),
                clientTime: Date.now(),
            },
            deviceOs: "IOS",
            deviceOsVersion: "18.0"
        };


        const data = await this.fetchFromAPI(`https://${this.untisver}.webuntis.com/WebUntis/jsonrpc_intern.do?a=0&m=getUserData2017&s=${this.untisver}.webuntis.com&school=${this.school}&v=i3.45.1`,
            "getUserData2017",
            timetableParams
        );
        this.FullUntisIdData = data;

    }

    private async fetchFromAPI(endpoint: string, method: string, params: any) {
        const baseJson = {
            jsonrpc: "2.0",
            id: "UntisMobileiOS",
            method,
            params: [params],
        };

        console.log("Sending API request:", baseJson);

        const response = await fetch(proxyUrl + endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
            },
            body: JSON.stringify(baseJson),
        });




        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || "Unknown API error");
        }
        console.log("API response:", data);


        return data.result;
    }

    private async authenticate() {
        const otp = await generateTOTP(this.secretKey);
        const authParams = {
            user: this.user,
            otp,
            clientTime: Date.now(),
        };

        const result = await this.fetchFromAPI(
            `https://arche.webuntis.com/WebUntis/jsonrpc_intern.do?a=0&m=getAuthToken&s=arche.webuntis.com&school=${this.school}&v=i3.45.1`,
            "getAuthToken",
            { auth: authParams }
        );



        this.authToken = result.token;
        console.log("Authentication successful. Token:", this.authToken);
    }

    private async ensureAuthenticated() {
        if (!this.authToken) {
            await this.authenticate();
        }
    }



    public async getTimetable(params: {
        id?: number;
        type?: "STUDENT" | "CLASS" | "ROOM";
        startDate?: string;
        endDate?: string;

    }) {
        await this.ensureAuthenticated();


        const { id, type, startDate, endDate } = params;
        const timetableParams = {
            masterDataTimestamp: 1724834423826,
            id: this.typeuseage === "STUDENT" ? this.userID : this.classID?.[0] ?? 0,
            type: this.typeuseage,
            startDate: startDate || this.getCurrentMonday(),
            endDate: endDate || this.getCurrentFriday(),
            auth: {
                user: this.user,
                otp: await generateTOTP(this.secretKey),
                clientTime: Date.now(),
            }


        };

        const result = await this.fetchFromAPI(
            `https://arche.webuntis.com/WebUntis/jsonrpc_intern.do?a=0&m=getTimetable2017&s=arche.webuntis.com&school=${this.school}&v=i3.45.1`,
            "getTimetable2017",
            timetableParams
        );

        return await this.renameArray(result.timetable as periodArray) as periodArray;
    }

    private getCurrentMonday(): string {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
        return new Date(today.setDate(diff)).toISOString().split("T")[0];
    }

    private getCurrentFriday(): string {
        const monday = new Date(this.getCurrentMonday());
        return new Date(monday.setDate(monday.getDate() + 4)).toISOString().split("T")[0];
    }
}

export default WebUntisAPI;
