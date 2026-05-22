import { saveSessionToServer, loadSessionFromServer } from './apiClient.js';

export class UserSession {
    #studentId;
    #studentName;
    #selectedDevice;
    #loginTimestamp;
    #activityLog;
    #savedResults;

    constructor() {
        this.#studentId = null;
        this.#studentName = null;
        this.#selectedDevice = null;
        this.#loginTimestamp = null;
        this.#activityLog = [];
        this.#savedResults = {};
    }

    async init() {
        const s = await loadSessionFromServer();
        if (s) {
            this.#studentId = s.studentId || null;
            this.#studentName = s.studentName || null;
            this.#selectedDevice = s.selectedDevice || null;
            this.#loginTimestamp = s.loginTimestamp || null;
            this.#activityLog = s.activityLog || [];
            this.#savedResults = s.savedResults || {};
        }
    }

    get studentName() { return this.#studentName; }
    get selectedDevice() { return this.#selectedDevice; }
    get loginTimestamp() { return this.#loginTimestamp; }
    get activityLog() { return [...this.#activityLog]; }
    get savedResults() { return { ...this.#savedResults }; }

    isLoggedIn() { return this.#studentId !== null && this.#studentName !== null; }

    async login(studentId, studentName) {
        this.#studentId = studentId;
        this.#studentName = studentName;
        this.#loginTimestamp = new Date().toISOString();
        await this.#saveToStorage();
    }

    async setDevice(deviceType) {
        this.#selectedDevice = deviceType;
        await this.#saveToStorage();
    }

    async recordActivity(moduleName, payload) {
        const entry = { module: moduleName, timestamp: new Date().toISOString(), payload };
        this.#activityLog.push(entry);
        this.#savedResults[moduleName] = { ...payload, savedAt: entry.timestamp };
        await this.#saveToStorage();
    }

    async logout() {
        this.#studentId = null;
        this.#studentName = null;
        this.#selectedDevice = null;
        this.#loginTimestamp = null;
        this.#activityLog = [];
        this.#savedResults = {};
        sessionStorage.removeItem('ecocircuit_session');
        try { await fetch('/api/session', { method:'DELETE' }); } catch(e){}
    }

    async #saveToStorage() {
        const payload = {
            studentId: this.#studentId,
            studentName: this.#studentName,
            selectedDevice: this.#selectedDevice,
            loginTimestamp: this.#loginTimestamp,
            activityLog: this.#activityLog,
            savedResults: this.#savedResults
        };
        await saveSessionToServer(payload);
    }
}

export const activeSession = new UserSession();
