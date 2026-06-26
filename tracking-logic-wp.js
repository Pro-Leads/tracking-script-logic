// --- V3.5_EXTERNAL_THUB_BACKWARDS_COMPATIBLE ---
window.addEventListener("load", function() {
    // 1. Konfiguration abrufen
    const config = window.TrackingHubLeadConfig;

    if (!config || !config.fields) {
        console.error("Die Konfiguration 'window.TrackingHubLeadConfig' wurde nicht gefunden.");
        return;
    }

    config.userDataFields = config.userDataFields || {};

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

    // --- NEU: RÜCKWÄRTSKOMPATIBILITÄT FÜR URL UND COOKIES ---
    // 1. Suche nach neuem URL Parameter ODER alten URL Parametern
    const thubValue = urlParams.get('thub') || urlParams.get('nli') || urlParams.get('nil');
    
    // 2. Suche nach neuem Cookie ODER altem Cookie
    let currentLeadId = getCookie(config.cookieName) || getCookie('nao_lead_id');

    // 3. Logik: URL schlägt Cookie. Wenn alt gefunden, auf neu updaten.
    if (thubValue) {
        // URL hat Prio. Wir speichern den Wert (egal ob alt oder neu) in das NEUE Cookie
        setCookie(config.cookieName, thubValue, 90);
        currentLeadId = thubValue; 
    } else if (currentLeadId) {
        // Keine URL, aber Cookie gefunden (vielleicht das alte).
        // Wir speichern den Wert zur Sicherheit noch mal in das NEUE Cookie ab (Migration)
        setCookie(config.cookieName, currentLeadId, 90);
    } else {
        // Überhaupt kein Lead bekannt: Neue ID generieren
        currentLeadId = crypto.randomUUID();
        setCookie(config.cookieName, currentLeadId, 90);
    }

    // --- FELDER BEFÜLLEN ---
    function fillAllFields() {
        function fillMultiple(fieldId, value) {
            if (!fieldId || !value) return;
            const elements = document.querySelectorAll('[id="' + fieldId + '"]');
            elements.forEach(el => safeSetValue(el, value));
        }

        const realFbc = getCookie('_fbc');
        const realFbp = getCookie('_fbp');

        fillMultiple(config.fields.lead_id, currentLeadId);
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

    // --- JQUERY ELEMENTOR SUBMIT_SUCCESS LOGIK ---
    function initTrackingHubTracking() {
        if (typeof jQuery === 'undefined') {
            setTimeout(initTrackingHubTracking, 100);
            return;
        }

        jQuery(document).on('submit_success', function(event, response) {
            var form = event.target;
            
            if (form && form.querySelector('[id="' + config.fields.lead_id + '"]')) {
                
                function getSafeValue(fieldId) {
                    if (!fieldId) return "";
                    var field = form.querySelector('[id="' + fieldId + '"]');
                    return field ? field.value : "";
                }

                const dlEventName = config.eventName || 'sst_form_submitted';

                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    'event': dlEventName,
                    'user_data': {
                        'email_address': getSafeValue(config.userDataFields.email),
                        'phone_number': getSafeValue(config.userDataFields.phone),
                        'first_name': getSafeValue(config.userDataFields.firstName),
                        'last_name': getSafeValue(config.userDataFields.lastName),
                        'address': {
                            'city': getSafeValue(config.userDataFields.city),
                            'postal_code': getSafeValue(config.userDataFields.postalCode),
                            'country': getSafeValue(config.userDataFields.country)
                        }
                    },
                    'tracking_data': {
                        'lead_id': getSafeValue(config.fields.lead_id),
                        'user_agent': getSafeValue(config.fields.ua),
                        'page_url': getSafeValue(config.fields.url),
                        'fbc': getSafeValue(config.fields.fbc),
                        'fbp': getSafeValue(config.fields.fbp),
                        'gclid': getSafeValue(config.fields.gclid),
                        'wbraid': getSafeValue(config.fields.wbraid),
                        'gbraid': getSafeValue(config.fields.gbraid)
                    }
                });
            }
        });
    }

    initTrackingHubTracking();
});
