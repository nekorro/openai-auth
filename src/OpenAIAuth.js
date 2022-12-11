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
    async authByEmail() {
        // step 1 - get session (cookies)
        this.sessionReq()
            // step 2 - get CSRF
            .then(
                () => {
                    console.log('Cookies set: ' + this.reqOptions.openai.headers['Cookie']);
                    return this.csrfReq();
                }
            )
            // step 3 - sign in (get auth0 provider url)
            .then(
                csrfToken => {
                    console.log('CSRF Token: ' + csrfToken);
                    return this.openaiSignInReq(csrfToken);
                }
            )
            // step 4 - go to auth0 provider url
            .then(
                auth0Url => {
                    console.log(auth0Url);
                    return this.auth0AuthReq(auth0Url);
                }
            )
            .then(
                auth0StatePath => {
                    console.log(auth0StatePath);
                    return this.auth0LoginReq(auth0StatePath);
                }
            )
            .then(
                what => {
                    console.log(what);
                }
            )
            .catch(
                error => {
                    console.log('Error authByEmail() promise chain:\n\t' + error);
                }
            )
    }

    // Async function to get session.
    // Return Promise
    async sessionReq() {
        const sessionReqOptions = this.reqOptions.openai;
        sessionReqOptions.path = '/api/auth/session';
        sessionReqOptions.method = 'GET';
        return new Promise(async (resolve, reject) => {
            const req = https.request(sessionReqOptions, async (res) => {
                try {
                    if (res.statusCode != '200') {
                        reject('Error sessionReq() res status code: ' + res.statusCode)
                    }
                    for await (const cookie of res.headers['set-cookie']) {
                        this.setCookie(cookie, 'openai');
                    }
                    resolve();
                } catch (error) {
                    reject('Error sessionReq() res parsing: ' + error);
                }
            });
            req.on('error', (error) => {
                reject('Error sessionReq() req: ' + error);
            });
            req.end();
        });
    };

    // Async function to get CSRF token.
    // Return Promise
    async csrfReq() {
        const csrfReqOptions = this.reqOptions.openai;
        csrfReqOptions.path = '/api/auth/csrf';
        csrfReqOptions.method = 'GET';
        return new Promise(async (resolve, reject) => {
            const req = https.request(csrfReqOptions, async (res) => {
                try {
                    if (res.statusCode != '200') {
                        reject('Error csrfReq() res status code: ' + res.statusCode)
                    }
                    let responseText = '';

                    for await (const chunk of res) {
                        responseText += chunk;
                    }
                    const bodyJson = JSON.parse(responseText || 'null');
                    if (!bodyJson.csrfToken) {
                        reject('Error csrfReq(): No csrfToken in response.');
                    } else {
                        if (res.headers['set-cookie']) {
                            for (const cookie of res.headers['set-cookie']) {
                                this.setCookie(cookie, 'openai');
                            }
                        }
                        resolve(bodyJson.csrfToken);
                    }
                } catch (error) {
                    reject('Error csrfReq() res parsing: ' + error);
                }
            });
            req.on('error', (error) => {
                reject('Error csrfReq() req: ' + error);
            });
            req.end();
        });
    };

    // Async function to sign in
    // Return Promise
    async openaiSignInReq(csrfToken) {
        const data = `callbackUrl=%2F&csrfToken=${csrfToken}&json=true`;
        const signInReqOptions = this.reqOptions.openai;
        signInReqOptions.path = '/api/auth/signin/auth0?prompt=login';
        signInReqOptions.method = 'POST';
        signInReqOptions.headers = {
            ...signInReqOptions.headers,
            'Origin': 'https://chat.openai.com',
            'Referer': 'https://chat.openai.com/auth/login',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length,
        }

        return new Promise(async (resolve, reject) => {
            const req = https.request(signInReqOptions, async (res) => {
                try {
                    if (res.statusCode != '200') {
                        reject('Error openaiSignInReq() res status code: ' + res.statusCode)
                    }
                    let responseText = '';
                    for await (const chunk of res) {
                        responseText += chunk;
                    }
                    const bodyJson = JSON.parse(responseText || 'null');
                    if (!bodyJson.url) {
                        reject('Error openaiSignInReq(): No url in response.');
                    } else {
                        if (bodyJson.url === 'https://chat.openai.com/api/auth/error?error=OAuthSignin' || bodyJson.url.includes('error')) {
                            reject('Error openaiSignInReq(): Rate limit.');
                        } else {
                            if (res.headers['set-cookie']) {
                                for (const cookie of res.headers['set-cookie']) {
                                    this.setCookie(cookie, 'openai');
                                }
                            }
                            resolve(bodyJson.url);
                        }
                    }
                } catch (error) {
                    reject('Error openaiSignInReq() res parsing: ' + error);
                }
            });
            req.on('error', (error) => {
                reject('Error openaiSignInReq() req: ' + error);
            });
            req.write(data);
            req.end();
        });
    };


    // Async function to start auth with auth0 provider
    // Return Promise
    async auth0AuthReq(url) {
        const auth0AuthReq = this.reqOptions.auth0;
        auth0AuthReq.path = url.replace('https://auth0.openai.com', '');
        auth0AuthReq.method = 'GET';
        return new Promise(async (resolve, reject) => {
            const req = https.request(auth0AuthReq, async (res) => {
                try {
                    if (res.statusCode != '302') {
                        reject('Error auth0AuthReq() res status code: ' + res.statusCode)
                    }
                    let responseText = '';
                    for await (const chunk of res) {
                        responseText += chunk;
                    }
                    if (res.headers['set-cookie']) {
                        for (const cookie of res.headers['set-cookie']) {
                            this.setCookie(cookie, 'auth0');
                        }
                    }
                    resolve(responseText.replace('Found. Redirecting to ', ''));
                } catch (error) {
                    reject('Error auth0AuthReq() res parsing: ' + error);
                }
            });
            req.on('error', (error) => {
                reject('Error auth0AuthReq() req: ' + error);
            });
            req.end();
        });
    };

    // Async function to detect captcha
    // Return Promise
    async auth0CheckCaptchaReq(url) {
        const auth0CheckCaptchaReq = this.reqOptions.auth0;
        if (!auth0CheckCaptchaReq.path.includes('state')) {
            reject('Error auth0CheckCaptchaReq() no state in req path: ' + auth0LoginReq.path)
        }
        auth0CheckCaptchaReq.path = url;
        auth0CheckCaptchaReq.method = 'GET';
        return new Promise(async (resolve, reject) => {
            const req = https.request(auth0LoginReq, async (res) => {
                try {
                    if (res.statusCode != '200') {
                        reject('Error auth0CheckCaptchaReq() res status code: ' + res.statusCode)
                    }
                    let responseText = '';
                    for await (const chunk of res) {
                        responseText += chunk;
                    }
                    if (res.headers['set-cookie']) {
                        for (const cookie of res.headers['set-cookie']) {
                            this.setCookie(cookie, 'auth0');
                        }
                    }
                    if (responseText.includes('captcha')) {
                        reject('Error auth0CheckCaptchaReq() res captcha found!')
                    } else {
                        resolve(responseText);
                    }
                } catch (error) {
                    reject('Error auth0CheckCaptchaReq() res parsing: ' + error);
                }
            });
            req.on('error', (error) => {
                reject('Error auth0CheckCaptchaReq() req: ' + error);
            });
            req.end();
        });
    };

}