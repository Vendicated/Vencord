/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Text {
    lesson: string;
    substitution: string;
    info: string;
    attachments: any[];
}

export interface _Teacher {
    type: string;
    id: number;
    orgId: number;
    name: string | undefined;
    longName: string | undefined;
}
export interface _Class {
    type: string;
    id: number;
    orgId: number;
    name: string | undefined;
    longName: string | undefined;
}

export interface _Subject {
    type: string;
    id: number;
    orgId: number;
    name: string | undefined;
    longName: string | undefined;
}

export interface _Room {
    type: string;
    id: number;
    orgId: number;
    name: string | undefined;
    longName: string | undefined;
}

export interface Element {
    type: string;
    id: number;
    orgId: number;
    name: string | undefined;
    longName: string | undefined;
}


export interface period {
    id: number;
    lessonId: number;
    startDateTime: string;
    startDateTimeUnix: number | null;
    endDateTime: string;
    endDateTimeUnix: number | null;
    foreColor: string;
    backColor: string;
    innerForeColor: string;
    innerBackColor: string;
    text: Text;
    elements: Element[];
    rooms: _Room[] | null;
    classes: _Class[] | null;
    teachers: _Teacher[] | null;
    subjects: _Subject[] | null;
    can: string[];
    is: string[];
    homeWorks: any[];
    exam?: any;
    isOnlinePeriod: boolean;
    blockHash: number;
}
export interface periodArray {
    periods: period[];

}











export interface AbsenceReason {
    id: number;
    name: string;
    longName: string;
    active: boolean;
    automaticNotificationEnabled: boolean;
}

export interface Duty {
    id: number;
    name: string;
    longName: string;
    type: string;
}

export interface ExcuseStatuse {
    id: number;
    name: string;
    longName: string;
    excused: boolean;
    active: boolean;
}

export interface Holiday {
    id: number;
    name: string;
    longName: string;
    startDate: string;
    endDate: string;
}

export interface Klassen {
    id: number;
    name: string;
    longName: string;
    departmentId: number;
    startDate: string;
    endDate: string;
    foreColor?: any;
    backColor?: any;
    active: boolean;
    displayable: boolean;
}

export interface Room {
    id: number;
    name: string;
    longName: string;
    departmentId: number;
    foreColor?: any;
    backColor?: any;
    active: boolean;
    displayAllowed: boolean;
}

export interface Subject {
    id: number;
    name: string;
    longName: string;
    departmentIds: any[];
    foreColor?: any;
    backColor?: any;
    active: boolean;
    displayAllowed: boolean;
}

export interface Teacher {
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    departmentIds: any[];
    foreColor?: any;
    backColor?: any;
    entryDate?: any;
    exitDate?: any;
    active: boolean;
    displayAllowed: boolean;
}

export interface Schoolyear {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
}

export interface Unit {
    label: string;
    startTime: string;
    endTime: string;
}

export interface Day {
    day: string;
    units: Unit[];
}

export interface TimeGrid {
    days: Day[];
}

export interface MasterData {
    timeStamp: number;
    absenceReasons: AbsenceReason[];
    departments: any[];
    duties: Duty[];
    eventReasons: any[];
    eventReasonGroups: any[];
    excuseStatuses: ExcuseStatuse[];
    holidays: Holiday[];
    klassen: Klassen[];
    rooms: Room[];
    subjects: Subject[];
    teachers: Teacher[];
    teachingMethods: any[];
    schoolyears: Schoolyear[];
    timeGrid: TimeGrid;
}

export interface UserData {
    elemType: string;
    elemId: number;
    displayName: string;
    schoolName: string;
    departmentId: number;
    children: any[];
    klassenIds: any[];
    rights: string[];
}

export interface Setting {
    showAbsenceReason: boolean;
    showAbsenceText: boolean;
    absenceCheckRequired: boolean;
    defaultAbsenceReasonId: number;
    defaultLatenessReasonId: number;
    defaultAbsenceEndTime: string;
    customAbsenceEndTime?: any;
    showCalendarDetails: boolean;
}

export interface userApiData {
    masterData: MasterData;
    userData: UserData;
    settings: Setting;
}

