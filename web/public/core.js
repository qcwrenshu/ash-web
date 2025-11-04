/*
Ash Web
@qcwrenshu

core.js is loaded first on every page and provides helper functions.
It also updates the user data from the server on every page load, and invalidates it if the user is logged out.
Java Web Tokens would have probably worked better in this case, but this works just as well and still provides sessions that can be timed out by the server.

*/

const core = {
    fetch: async function(method, path, data) {
        return new Promise(function(resolve, err) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, path);
            if (method === "POST") xhr.setRequestHeader("Content-Type", "application/json");
            xhr.onload = () => {
                let response; try { response = JSON.parse(xhr.response); } catch { response = xhr.response; }
                resolve({ response, ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, statusText: xhr.statusText });
            }
            xhr.onerror = () => err(xhr);
            xhr.send(data ? JSON.stringify(data) : null);
        });
    },
    colorBase10toHex: color => color.toString(16).padStart(6, "0"),
    userData: localStorage.getItem("user_data") ? JSON.parse(localStorage.getItem("user_data")) : null
}
window.core = core;

if (core.userData) {
    const data = await core.fetch("GET", "/identify");
    if (data.ok) {
        localStorage.setItem("user_data", JSON.stringify(data.response));
        core.userData = data.response;
    } else { localStorage.removeItem("user_data"); location.reload(); }
}