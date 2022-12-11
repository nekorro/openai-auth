"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
const https = require('https');
module.exports = class OpenAIAuth {
    constructor(email, password) {
        this.email = email;
        this.password = password;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:107.0) Gecko/20100101 Firefox/107.0';
        this.reqOptions = {
            openai: {
                hostname: 'chat.openai.com',
                port: 443,
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive',
                    'Accept': '*/*',
                    'Cookie': ''
                }
            },
            auth0: {
                hostname: 'auth0.openai.com',
                port: 443,
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive',
                    'Accept': '*/*',
                    'Referer': 'https://chat.openai.com/',
                    'Cookie': ''
                }
            }
        };
    }
    setCookie(newCookie, host) {
        let newCookieString = newCookie.split('; ')[0];
        let newCookieName = newCookieString.split('=')[0];
        let updated = false;
        let cookies = this.reqOptions[host].headers['Cookie'].split('; ');
        for (let i = 0; i < cookies.length; i++) {
            if (cookies[i].includes(newCookieName)) {
                cookies[i] = newCookieString;
                updated = true;
            }
            if (updated) {
                break;
            }
        }
        if (!updated) {
            cookies.push(newCookieString);
        }
        this.reqOptions[host].headers['Cookie'] = cookies.filter(n => n).join('; ');
    }
    // Async function to proceed auth by email
    authByEmail() {
        return __awaiter(this, void 0, void 0, function* () {
            // step 1 - get session (cookies)
            this.sessionReq()
                // step 2 - get CSRF
                .then(() => {
                console.log('Cookies set: ' + this.reqOptions.openai.headers['Cookie']);
                return this.csrfReq();
            })
                // step 3 - sign in (get auth0 provider url)
                .then(csrfToken => {
                console.log('CSRF Token: ' + csrfToken);
                return this.openaiSignInReq(csrfToken);
            })
                // step 4 - go to auth0 provider url
                .then(auth0Url => {
                console.log(auth0Url);
                return this.auth0AuthReq(auth0Url);
            })
                .then(auth0StatePath => {
                console.log(auth0StatePath);
                return this.auth0LoginReq(auth0StatePath);
            })
                .then(what => {
                console.log(what);
            })
                .catch(error => {
                console.log('Error authByEmail() promise chain:\n\t' + error);
            });
        });
    }
    // Async function to get session.
    // Return Promise
    sessionReq() {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionReqOptions = this.reqOptions.openai;
            sessionReqOptions.path = '/api/auth/session';
            sessionReqOptions.method = 'GET';
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const req = https.request(sessionReqOptions, (res) => __awaiter(this, void 0, void 0, function* () {
                    var _a, e_1, _b, _c;
                    try {
                        if (res.statusCode != '200') {
                            reject('Error sessionReq() res status code: ' + res.statusCode);
                        }
                        try {
                            for (var _d = true, _e = __asyncValues(res.headers['set-cookie']), _f; _f = yield _e.next(), _a = _f.done, !_a;) {
                                _c = _f.value;
                                _d = false;
                                try {
                                    const cookie = _c;
                                    this.setCookie(cookie, 'openai');
                                }
                                finally {
                                    _d = true;
                                }
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        resolve();
                    }
                    catch (error) {
                        reject('Error sessionReq() res parsing: ' + error);
                    }
                }));
                req.on('error', (error) => {
                    reject('Error sessionReq() req: ' + error);
                });
                req.end();
            }));
        });
    }
    ;
    // Async function to get CSRF token.
    // Return Promise
    csrfReq() {
        return __awaiter(this, void 0, void 0, function* () {
            const csrfReqOptions = this.reqOptions.openai;
            csrfReqOptions.path = '/api/auth/csrf';
            csrfReqOptions.method = 'GET';
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const req = https.request(csrfReqOptions, (res) => { var _a, res_1, res_1_1; return __awaiter(this, void 0, void 0, function* () {
                    var _b, e_2, _c, _d;
                    try {
                        if (res.statusCode != '200') {
                            reject('Error csrfReq() res status code: ' + res.statusCode);
                        }
                        let responseText = '';
                        try {
                            for (_a = true, res_1 = __asyncValues(res); res_1_1 = yield res_1.next(), _b = res_1_1.done, !_b;) {
                                _d = res_1_1.value;
                                _a = false;
                                try {
                                    const chunk = _d;
                                    responseText += chunk;
                                }
                                finally {
                                    _a = true;
                                }
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (!_a && !_b && (_c = res_1.return)) yield _c.call(res_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        const bodyJson = JSON.parse(responseText || 'null');
                        if (!bodyJson.csrfToken) {
                            reject('Error csrfReq(): No csrfToken in response.');
                        }
                        else {
                            if (res.headers['set-cookie']) {
                                for (const cookie of res.headers['set-cookie']) {
                                    this.setCookie(cookie, 'openai');
                                }
                            }
                            resolve(bodyJson.csrfToken);
                        }
                    }
                    catch (error) {
                        reject('Error csrfReq() res parsing: ' + error);
                    }
                }); });
                req.on('error', (error) => {
                    reject('Error csrfReq() req: ' + error);
                });
                req.end();
            }));
        });
    }
    ;
    // Async function to sign in
    // Return Promise
    openaiSignInReq(csrfToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = `callbackUrl=%2F&csrfToken=${csrfToken}&json=true`;
            const signInReqOptions = this.reqOptions.openai;
            signInReqOptions.path = '/api/auth/signin/auth0?prompt=login';
            signInReqOptions.method = 'POST';
            signInReqOptions.headers = Object.assign(Object.assign({}, signInReqOptions.headers), { 'Origin': 'https://chat.openai.com', 'Referer': 'https://chat.openai.com/auth/login', 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': data.length });
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const req = https.request(signInReqOptions, (res) => { var _a, res_2, res_2_1; return __awaiter(this, void 0, void 0, function* () {
                    var _b, e_3, _c, _d;
                    try {
                        if (res.statusCode != '200') {
                            reject('Error openaiSignInReq() res status code: ' + res.statusCode);
                        }
                        let responseText = '';
                        try {
                            for (_a = true, res_2 = __asyncValues(res); res_2_1 = yield res_2.next(), _b = res_2_1.done, !_b;) {
                                _d = res_2_1.value;
                                _a = false;
                                try {
                                    const chunk = _d;
                                    responseText += chunk;
                                }
                                finally {
                                    _a = true;
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (!_a && !_b && (_c = res_2.return)) yield _c.call(res_2);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                        const bodyJson = JSON.parse(responseText || 'null');
                        if (!bodyJson.url) {
                            reject('Error openaiSignInReq(): No url in response.');
                        }
                        else {
                            if (bodyJson.url === 'https://chat.openai.com/api/auth/error?error=OAuthSignin' || bodyJson.url.includes('error')) {
                                reject('Error openaiSignInReq(): Rate limit.');
                            }
                            else {
                                if (res.headers['set-cookie']) {
                                    for (const cookie of res.headers['set-cookie']) {
                                        this.setCookie(cookie, 'openai');
                                    }
                                }
                                resolve(bodyJson.url);
                            }
                        }
                    }
                    catch (error) {
                        reject('Error openaiSignInReq() res parsing: ' + error);
                    }
                }); });
                req.on('error', (error) => {
                    reject('Error openaiSignInReq() req: ' + error);
                });
                req.write(data);
                req.end();
            }));
        });
    }
    ;
    // Async function to start auth with auth0 provider
    // Return Promise
    auth0AuthReq(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth0AuthReq = this.reqOptions.auth0;
            auth0AuthReq.path = url.replace('https://auth0.openai.com', '');
            auth0AuthReq.method = 'GET';
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const req = https.request(auth0AuthReq, (res) => { var _a, res_3, res_3_1; return __awaiter(this, void 0, void 0, function* () {
                    var _b, e_4, _c, _d;
                    try {
                        if (res.statusCode != '302') {
                            reject('Error auth0AuthReq() res status code: ' + res.statusCode);
                        }
                        let responseText = '';
                        try {
                            for (_a = true, res_3 = __asyncValues(res); res_3_1 = yield res_3.next(), _b = res_3_1.done, !_b;) {
                                _d = res_3_1.value;
                                _a = false;
                                try {
                                    const chunk = _d;
                                    responseText += chunk;
                                }
                                finally {
                                    _a = true;
                                }
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (!_a && !_b && (_c = res_3.return)) yield _c.call(res_3);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                        if (res.headers['set-cookie']) {
                            for (const cookie of res.headers['set-cookie']) {
                                this.setCookie(cookie, 'auth0');
                            }
                        }
                        resolve(responseText.replace('Found. Redirecting to ', ''));
                    }
                    catch (error) {
                        reject('Error auth0AuthReq() res parsing: ' + error);
                    }
                }); });
                req.on('error', (error) => {
                    reject('Error auth0AuthReq() req: ' + error);
                });
                req.end();
            }));
        });
    }
    ;
    // Async function to detect captcha
    // Return Promise
    auth0CheckCaptchaReq(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth0CheckCaptchaReq = this.reqOptions.auth0;
            if (!auth0CheckCaptchaReq.path.includes('state')) {
                reject('Error auth0CheckCaptchaReq() no state in req path: ' + auth0LoginReq.path);
            }
            auth0CheckCaptchaReq.path = url;
            auth0CheckCaptchaReq.method = 'GET';
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const req = https.request(auth0LoginReq, (res) => { var _a, res_4, res_4_1; return __awaiter(this, void 0, void 0, function* () {
                    var _b, e_5, _c, _d;
                    try {
                        if (res.statusCode != '200') {
                            reject('Error auth0CheckCaptchaReq() res status code: ' + res.statusCode);
                        }
                        let responseText = '';
                        try {
                            for (_a = true, res_4 = __asyncValues(res); res_4_1 = yield res_4.next(), _b = res_4_1.done, !_b;) {
                                _d = res_4_1.value;
                                _a = false;
                                try {
                                    const chunk = _d;
                                    responseText += chunk;
                                }
                                finally {
                                    _a = true;
                                }
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (!_a && !_b && (_c = res_4.return)) yield _c.call(res_4);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                        if (res.headers['set-cookie']) {
                            for (const cookie of res.headers['set-cookie']) {
                                this.setCookie(cookie, 'auth0');
                            }
                        }
                        if (responseText.includes('captcha')) {
                            reject('Error auth0CheckCaptchaReq() res captcha found!');
                        }
                        else {
                            resolve(responseText);
                        }
                    }
                    catch (error) {
                        reject('Error auth0CheckCaptchaReq() res parsing: ' + error);
                    }
                }); });
                req.on('error', (error) => {
                    reject('Error auth0CheckCaptchaReq() req: ' + error);
                });
                req.end();
            }));
        });
    }
    ;
};
