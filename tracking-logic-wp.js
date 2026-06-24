// --- V2.2_EXTERNAL_DELAYED ---
window.addEventListener("load", function() {
    // 1. Konfiguration abrufen
    const config = window.naoLeadConfig;

    if (!config || !config.fields) {
        console.error("Die Konfiguration 'window.naoLeadConfig' wurde nicht gefunden.");
        return;
    }

    function getCookie(name) {
        const parts = document.cookie.split(';');
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i].trim();
            if (part.startsWith(name + '=')) {
                let val = part.substring(name.length + 1);
                if (val && val.trim() !== "") return val;
            }
        }
        return null;
    }

    function setCookie(name, value, days) {
        const d = new Date(); 
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
    }

    function safeSetValue(element, value) {
        if (element && value && element.value !== value) {
            element.value = value;
            element.setAttribute('value', value); 
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    const urlParams = new URLSearchParams(window.location.search);

    function getCleanParam(paramName) {
        const val = urlParams.get(paramName);
        return val ? val.replace(/\+/g, ' ') : null;
    }

    const fbclid = urlParams.get('fbclid');
    let fallbackFbc = null;
    if (fbclid) {
        fallbackFbc = `fb.1.${Date.now()}.${fbclid}`;
    }

    const nliValue = urlParams.get('nli');
    let currentLeadId = getCookie(config.cookieName);

    if (nliValue) {
        setCookie(config.cookieName, nliValue, 90);
        currentLeadId = nliValue; 
    } else if (!currentLeadId) {
        currentLeadId = crypto.randomUUID();
        setCookie(config.cookieName, currentLeadId, 90);
    }

    function fillAllFields() {
        function fillMultiple(fieldId, value) {
            if (!fieldId || !value) return;
            const elements = document.querySelectorAll('[id="' + fieldId + '"]');
            elements.forEach(el => safeSetValue(el, value));
        }

        const realFbc = getCookie('_fbc');
        const realFbp = getCookie('_fbp');

        fillMultiple(config.fields.lead, currentLeadId);
        fillMultiple(config.fields.ua, navigator.userAgent);
        fillMultiple(config.fields.url, window.location.href.split(/[?#]/)[0]);

        fillMultiple(config.fields.utm_source, getCleanParam('utm_source'));
        fillMultiple(config.fields.utm_medium, getCleanParam('utm_medium'));
        fillMultiple(config.fields.utm_campaign, getCleanParam('utm_campaign'));
        fillMultiple(config.fields.utm_content, getCleanParam('utm_content'));
        fillMultiple(config.fields.utm_term, getCleanParam('utm_term'));

        fillMultiple(config.fields.gclid, getCleanParam('gclid'));
        fillMultiple(config.fields.wbraid, getCleanParam('wbraid'));
        fillMultiple(config.fields.gbraid, getCleanParam('gbraid'));

        if (realFbc) {
            fillMultiple(config.fields.fbc, realFbc);
        } else if (fallbackFbc) {
            fillMultiple(config.fields.fbc, fallbackFbc);
        }
        
        if (realFbp) {
            fillMultiple(config.fields.fbp, realFbp);
        }

        return !!(realFbc && realFbp);
    }

    let count = 0;
    const fbInterval = setInterval(() => {
        count++;
        if (fillAllFields() || count >= 54) clearInterval(fbInterval);
    }, 150);

    ['focusin', 'click'].forEach(evt => {
        document.addEventListener(evt, () => {
            setTimeout(fillAllFields, 100);
        });
    });
});
