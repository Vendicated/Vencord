/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { userApiData } from "./interfaces";

class Getter {
    private arraythingy: userApiData;

    constructor(arraythingy: userApiData) {
        this.arraythingy = arraythingy;
    }


    public getTeacherNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.teachers.find(teacher => teacher.id === id);
        return temp?.name ?? "";
    }
    public getTeacherFullNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.teachers.find(teacher => teacher.id === id);
        return temp?.firstName + " " + temp?.lastName;
    }
    public getClassNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.klassen.find(klass => klass.id === id);
        return temp?.name ?? "";
    }
    public getClassLongNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.klassen.find(klass => klass.id === id);
        return temp?.longName ?? "";
    }
    public getRoomNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.rooms.find(room => room.id === id);
        return temp?.name ?? "";
    }
    public getRoomLongNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.rooms.find(room => room.id === id);
        return temp?.longName ?? "";
    }
    public getSubjectNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.subjects.find(subject => subject.id === id);
        return temp?.name ?? "";
    }
    public getSubjectLongNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.subjects.find(subject => subject.id === id);
        return temp?.longName ?? "";
    }
    public getAbsenceReasonNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.absenceReasons.find(reason => reason.id === id);
        return temp?.name ?? "";
    }
    public getAbsenceReasonLongNameFromID(id: number): string {
        const temp = this.arraythingy.masterData.absenceReasons.find(reason => reason.id === id);
        return temp?.longName ?? "";
    }
}


export default Getter;
