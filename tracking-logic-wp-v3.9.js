// --- V5.0.6_EXTERNAL_THUB_SMART_ROUTING_MASTER ---
function bootTrackingHub() {
    if (window.thub_initialized) return;
    window.thub_initialized = true;

    console.log("TrackingHub Debug: Skript gebootet (V5.0.6).");

    const urlParams = new URLSearchParams(window.location.search);
    
    function getCleanParam(paramName) {
        const val = urlParams.get(paramName);
        return val ? val.replace(/\+/g, ' ') : null;
    }

    // --- Timer in Minuten (30 Minuten empfohlen für eine Session) ---
    const storageExpiryMinutes = 30; 

    function setStorageWithExpiry(key, value, minutes) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + (minutes * 60 * 1000)
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    function getStorageWithExpiry(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return ""; 
        try {
            const item = JSON.parse(itemStr);
            if (item && item.expiry) {
                if (new Date().getTime() > item.expiry) {
                    localStorage.removeItem(key); 
                    return "";
                }
                return item.value || "";
            }
        } catch (e) {}
        return itemStr; 
    }

    // 1. Klick-IDs und UTMs abfangen und speichern
    const paramsToStore = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    paramsToStore.forEach(param => {
        const val = getCleanParam(param);
        if (val !== null) {
            setStorageWithExpiry('thub_' + param, val, storageExpiryMinutes);
        }
    });

    setTimeout(function() {
        
        console.log("TrackingHub Debug: Sammle Daten nach 800ms.");
        const config = window.TrackingHubLeadConfig || {};

        if (!config.trackingfields) {
            console.error("TrackingHub Debug: Abbruch! Konfiguration nicht gefunden oder unvollständig.", config);
            return;
        }

        config.userDataFields = config.userDataFields || {};
        const currentPath = window.location.pathname;

        function generateUUID() {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
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
            document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax;Secure`;
        }

        function safeSetValue(element, value) {
            if (element && value && element.value !== value) {
                element.value = value;
                element.setAttribute('value', value); 
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // --- NEU: Last-Click-Attribution Logik für Facebook (_fbc) ---
        const currentUrlFbclid = getCleanParam('fbclid');
        const storedFbclid = getStorageWithExpiry('thub_fbclid');
        let fallbackFbc = null;

        if (currentUrlFbclid && currentUrlFbclid !== "") {
            // Priorität 1: Harter Override bei frischem Klick
            fallbackFbc = `fb.1.${Date.now()}.${currentUrlFbclid}`;
            setCookie('_fbc', fallbackFbc, 90);
            console.log("TrackingHub Debug: Neue fbclid erkannt. _fbc Cookie erzwungen/überschrieben.");
        } else if (storedFbclid && storedFbclid !== "") {
            // Priorität 2: Weicher Fallback aus dem Speicher
            fallbackFbc = `fb.1.${Date.now()}.${storedFbclid}`;
            if (!getCookie('_fbc')) {
                setCookie('_fbc', fallbackFbc, 90);
                console.log("TrackingHub Debug: Fehlendes _fbc Cookie aus Storage wiederhergestellt.");
            }
        }

        // --- Processing Lead ID and Hybrid Storage logic... ---
        const thubCookieName = 'thub_lead_id';
        const thubOverrideValue = getCleanParam('thub') || getCleanParam('nli') || getCleanParam('nil');
        const cookieLeadId = getCookie(thubCookieName) || getCookie('nao_lead_id');
        const lsLeadId = localStorage.getItem(thubCookieName);
        
        let currentLeadId = "";

        if (thubOverrideValue) {
            currentLeadId = thubOverrideValue;
        } else if (cookieLeadId) {
            currentLeadId = cookieLeadId;
        } else if (lsLeadId) {
            currentLeadId = lsLeadId;
        } else {
            currentLeadId = generateUUID();
        }

        setCookie(thubCookieName, currentLeadId, 90); 
        localStorage.setItem(thubCookieName, currentLeadId); 

        // Hilfsfunktion: Prüft, ob der aktuelle Pfad in der kommagetrennten Config-Liste enthalten ist
        function isPathMatching(configString, path) {
            if (!configString) return false;
            const paths = configString.split(',').map(p => p.trim());
            return paths.some(p => p !== "" && path.includes(p));
        }

        // --- Dynamische Routing-Funktion (Mit strengem GTM Check) ---
        function pushOrFetch(payload) {
            const isTestMode = (urlParams.get('fetch_check') === 'true');
            // Nur 'google_tag_manager' beweist, dass der GTM wirklich da und unblockiert ist!
            const isGtmActive = (typeof window.google_tag_manager !== 'undefined');

            console.log(`TrackingHub Debug: Event '${payload.event}' bereit. GTM erkannt: ${isGtmActive}`);

            if (isGtmActive && !isTestMode) {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(payload);
                console.log("TrackingHub Debug: Erfolgreich in DataLayer gepusht.");
            } else {
                console.log("TrackingHub Debug: GTM nicht verfügbar. Sende Notfall-Fetch an Server.");
                if (config.serverEndpoint && config.serverEndpoint.trim() !== "") {
                    fetch(config.serverEndpoint, {
                        method: 'POST',
                        keepalive: true,
                        credentials: 'include', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).catch(function(err) {
                        console.error('TrackingHub Fetch-Fallback Error:', err);
                    });
                } else {
                    console.warn("TrackingHub: Fetch-Fallback übersprungen (kein serverEndpoint konfiguriert).");
                }
            }
        }

        // ---------------------------------------------------------
        // STUFE 1: PAGE VIEW LOGIK (Base Payload)
        // ---------------------------------------------------------
        const excludePageView = isPathMatching(config.negativPV, currentPath);

        if (!excludePageView) {
            const basePayload = {
                'event': 'page_view', 
                'event_name': 'page_view', 
                'event_time': Math.floor(Date.now() / 1000), 
                'action_source': 'website',
                'event_id': generateUUID(), 
                'th_tracking_data_timestamp': Math.floor(Date.now() / 1000),
                'th_tracking_data_lead_id': currentLeadId,
                'th_tracking_data_user_agent': navigator.userAgent,
                'th_tracking_data_page_url': window.location.href.split(/[?#]/)[0],
                'th_tracking_data_fbc': getCookie('_fbc') || fallbackFbc || "",
                'th_tracking_data_fbp': getCookie('_fbp') || "",
                'th_tracking_data_gclid': getStorageWithExpiry('thub_gclid'),
                'th_tracking_data_wbraid': getStorageWithExpiry('thub_wbraid'),
                'th_tracking_data_gbraid': getStorageWithExpiry('thub_gbraid')
            };

            pushOrFetch(basePayload);
        }

        // ---------------------------------------------------------
        // FÜLLEN DER ELEMENTOR FELDER (Nur Tracking-Daten)
        // ---------------------------------------------------------
        function fillAllFields() {
            function fillMultiple(fieldId, value) {
                if (!fieldId || !value) return;
                const elements = document.querySelectorAll('[id="' + fieldId + '"]');
                elements.forEach(el => safeSetValue(el, value));
            }

            fillMultiple(config.trackingfields.lead_id, currentLeadId);
            fillMultiple(config.trackingfields.utm_source, getStorageWithExpiry('thub_utm_source'));
            fillMultiple(config.trackingfields.utm_medium, getStorageWithExpiry('thub_utm_medium'));
            fillMultiple(config.trackingfields.utm_campaign, getStorageWithExpiry('thub_utm_campaign'));
            fillMultiple(config.trackingfields.utm_content, getStorageWithExpiry('thub_utm_content'));
            fillMultiple(config.trackingfields.utm_term, getStorageWithExpiry('thub_utm_term'));

            return true; 
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

        // ---------------------------------------------------------
        // STUFE 2: SUBMIT LOGIK (Doppelter Boden für Mobile & Desktop)
        // ---------------------------------------------------------
        
        // Zentrale Funktion: Baut den Payload und verschickt ihn
        function handleFormSubmit(form) {
            if (!form) return;

            // Deduplizierung: Schützt vor doppeltem Senden, wenn beide Methoden anschlagen
            if (form.dataset.thubSubmitted === 'true') {
                console.log("TrackingHub Debug: Formular wurde bereits erfasst. Abbruch (Deduplizierung).");
                return;
            }

            let matchedEventName = null;

            if (isPathMatching(config.cLead, currentPath)) {
                matchedEventName = 'generate_lead';
            } else if (isPathMatching(config.cSchedule, currentPath)) {
                matchedEventName = 'schedule';
            } else if (isPathMatching(config.cPurchase, currentPath)) {
                matchedEventName = 'purchase';
            }

            if (!matchedEventName) {
                console.log("TrackingHub Debug: Kein Event-Pfad für diese URL definiert. Submit wird ignoriert.");
                return; 
            }
            
            if (form.querySelector('[id="' + config.userDataFields.email + '"]')) {
                function getSafeValue(fieldId) {
                    if (!fieldId) return "";
                    var field = form.querySelector('[id="' + fieldId + '"]');
                    return field ? field.value : "";
                }

                const payload = {
                    'event': matchedEventName, 
                    'event_name': matchedEventName, 
                    'event_time': Math.floor(Date.now() / 1000), 
                    'action_source': 'website',
                    'event_id': generateUUID(), 
                    'th_user_data_email_address': getSafeValue(config.userDataFields.email),
                    'th_user_data_phone_number': getSafeValue(config.userDataFields.phone),
                    'th_user_data_first_name': getSafeValue(config.userDataFields.firstName),
                    'th_user_data_last_name': getSafeValue(config.userDataFields.lastName),
                    'th_user_data_city': getSafeValue(config.userDataFields.city),
                    'th_user_data_postal_code': getSafeValue(config.userDataFields.postalCode),
                    'th_user_data_country': getSafeValue(config.userDataFields.country),
                    'th_tracking_data_timestamp': Math.floor(Date.now() / 1000),
                    'th_tracking_data_utm_source': getStorageWithExpiry('thub_utm_source'),
                    'th_tracking_data_utm_term': getStorageWithExpiry('thub_utm_term'),
                    'th_tracking_data_lead_id': currentLeadId,
                    'th_tracking_data_user_agent': navigator.userAgent,
                    'th_tracking_data_page_url': window.location.href.split(/[?#]/)[0],
                    'th_tracking_data_fbc': getCookie('_fbc') || fallbackFbc || "",
                    'th_tracking_data_fbp': getCookie('_fbp') || "",
                    'th_tracking_data_gclid': getStorageWithExpiry('thub_gclid'),
                    'th_tracking_data_wbraid': getStorageWithExpiry('thub_wbraid'),
                    'th_tracking_data_gbraid': getStorageWithExpiry('thub_gbraid')
                };

                // Formular digital abstempeln
                form.dataset.thubSubmitted = 'true';
                
                // An GTM oder Server senden
                pushOrFetch(payload);
            }
        }

        // METHODE A: Elementor / jQuery Fallback (Standard für Desktop)
        function initTrackingHubTracking() {
            if (typeof jQuery !== 'undefined') {
                jQuery(document).on('submit_success', function(event, response) {
                    console.log("TrackingHub Debug: Methode A (jQuery) hat Submit erkannt.");
                    handleFormSubmit(event.target);
                });
            } else {
                setTimeout(initTrackingHubTracking, 100);
            }
        }
        initTrackingHubTracking();

        // METHODE B: Universeller HTML5 & iOS Listener (Der Retter für Mobile & Custom Builder)
        document.addEventListener('submit', function(event) {
            const form = event.target;
            
            // 1. Nativer Check: Sind alle HTML5 Pflichtfelder ausgefüllt?
            if (form.checkValidity && !form.checkValidity()) {
                console.log("TrackingHub Debug: Methode B (Nativ) - HTML5 Validierung fehlgeschlagen.");
                return;
            }

            // 2. Kurz warten (200ms), damit Custom Pagebuilder ihre Fehlermeldungen (z.B. falsche Email) rendern können
            setTimeout(() => {
                // Wildcard-Suche nach Fehlerklassen (Elementor, Wix, Funnelcockpit, CF7)
                const hasErrors = form.querySelector('[class*="error"], [class*="invalid"], [class*="danger"], .elementor-message-danger');
                
                if (hasErrors) {
                    console.log("TrackingHub Debug: Methode B (Nativ) - Custom Formularfehler erkannt. Abbruch.");
                    return;
                }
                
                console.log("TrackingHub Debug: Methode B (Nativ) - Formular gültig erkannt.");
                handleFormSubmit(form);
            }, 200);
        }, true);


        // --- VISUELLER LIVE-DEBUGGER ---
        function initLiveDebugger() {
            if (urlParams.get('thub-check-value') !== 'true') return;

            const debugContainer = document.createElement('div');
            debugContainer.id = 'thub-live-debugger';
            debugContainer.style.cssText = 'margin-top: 50px; background-color: #1e1e1e; color: #d4d4d4; padding: 30px; font-family: monospace; font-size: 15px; border-top: 4px solid #ff9800; word-break: break-all;';
            document.body.appendChild(debugContainer);

            function getLiveFieldValue(fieldId) {
                if (!fieldId) return "nicht gesetzt";
                const field = document.querySelector('[id="' + fieldId + '"]');
                return (field && field.value.trim() !== "") ? field.value : "nicht gesetzt";
            }

            function formatVal(val) {
                return (val && val !== "") ? val : "<span style='color: #ff5252;'>nicht gesetzt</span>";
            }

            function renderDebugTable() {
                
                // --- NEU: Routen-Check für den Debugger ---
                let matchedEventNameForDebug = "Kein Event definiert (Submit wird ignoriert)";
                let eventColor = "#ff5252"; // Rot

                if (isPathMatching(config.cLead, currentPath)) {
                    matchedEventNameForDebug = "generate_lead";
                    eventColor = "#4CAF50"; // Grün
                } else if (isPathMatching(config.cSchedule, currentPath)) {
                    matchedEventNameForDebug = "schedule";
                    eventColor = "#4CAF50"; 
                } else if (isPathMatching(config.cPurchase, currentPath)) {
                    matchedEventNameForDebug = "purchase";
                    eventColor = "#4CAF50"; 
                }

                const tableHTML = `
                    <h2 style="color: #ff9800; margin-top: 0; margin-bottom: 20px;">TrackingHub Live-Debugger</h2>
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 2px solid #555;">
                                <th style="padding: 10px; width: 25%;">Kategorie</th>
                                <th style="padding: 10px; width: 25%;">Schlüssel</th>
                                <th style="padding: 10px; width: 50%;">Aktueller Wert</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 2px solid #ff9800; background-color: #2a2a2a;"><td style="padding: 12px; color: #9C27B0;"><b>Routing</b></td><td style="padding: 12px; font-weight: bold;">Erkanntes Event</td><td style="padding: 12px; color: ${eventColor}; font-weight: bold; font-size: 16px;">${matchedEventNameForDebug}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #4CAF50;"><b>ID</b></td><td style="padding: 8px;">Lead ID</td><td style="padding: 8px; color: #fff;">${formatVal(currentLeadId)}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">gclid</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_gclid'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">wbraid</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_wbraid'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">gbraid</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_gbraid'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">fbclid</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_fbclid'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_source</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_source'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_medium</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_medium'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_campaign</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_campaign'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_content</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_content'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_term</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_term'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #FFC107;"><b>Cookies</b></td><td style="padding: 8px;">_fbc</td><td style="padding: 8px; color: #fff;">${formatVal(getCookie('_fbc'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #FFC107;"><b>Cookies</b></td><td style="padding: 8px;">_fbp</td><td style="padding: 8px; color: #fff;">${formatVal(getCookie('_fbp'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #00BCD4;"><b>Formular (Live)</b></td><td style="padding: 8px;">E-Mail</td><td style="padding: 8px; color: #fff;">${formatVal(getLiveFieldValue(config.userDataFields.email))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #00BCD4;"><b>Formular (Live)</b></td><td style="padding: 8px;">Telefon</td><td style="padding: 8px; color: #fff;">${formatVal(getLiveFieldValue(config.userDataFields.phone))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #00BCD4;"><b>Formular (Live)</b></td><td style="padding: 8px;">Vorname</td><td style="padding: 8px; color: #fff;">${formatVal(getLiveFieldValue(config.userDataFields.firstName))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #00BCD4;"><b>Formular (Live)</b></td><td style="padding: 8px;">Nachname</td><td style="padding: 8px; color: #fff;">${formatVal(getLiveFieldValue(config.userDataFields.lastName))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #00BCD4;"><b>Formular (Live)</b></td><td style="padding: 8px;">Stadt</td><td style="padding: 8px; color: #fff;">${formatVal(getLiveFieldValue(config.userDataFields.city))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #00BCD4;"><b>Formular (Live)</b></td><td style="padding: 8px;">PLZ</td><td style="padding: 8px; color: #fff;">${formatVal(getLiveFieldValue(config.userDataFields.postalCode))}</td></tr>
                            <tr><td style="padding: 8px; color: #00BCD4;"><b>Formular (Live)</b></td><td style="padding: 8px;">Land</td><td style="padding: 8px; color: #fff;">${formatVal(getLiveFieldValue(config.userDataFields.country))}</td></tr>
                        </tbody>
                    </table>
                `;
                debugContainer.innerHTML = tableHTML;
            }

            renderDebugTable();
            document.addEventListener('input', renderDebugTable);
            document.addEventListener('change', renderDebugTable);
            document.addEventListener('click', () => setTimeout(renderDebugTable, 100));
        }

        initLiveDebugger();

        // --- VISUELLER FETCH-CHECK WARNHINWEIS ---
        function initFetchCheckWarning() {
            if (urlParams.get('fetch_check') !== 'true') return;

            const warnContainer = document.createElement('div');
            warnContainer.id = 'thub-fetch-check-warning';
            warnContainer.style.cssText = 'background-color: #ff5252; color: #ffffff; padding: 15px; font-family: sans-serif; font-size: 14px; font-weight: bold; text-align: center; border-top: 2px solid #b71c1c; margin-top: 20px; word-break: break-word;';
            warnContainer.innerHTML = '⚠️ ACHTUNG: Fetch-Testmodus aktiv (fetch_check=true). Das reguläre GTM-Tracking ist blockiert und die Daten werden als direktes Fallback an den Server gesendet.';
            document.body.appendChild(warnContainer);
        }

        initFetchCheckWarning();

    }, 800);
}

// Bulletproof Start-Logik: Startet sofort, falls Seite schon geladen ist
if (document.readyState === "complete" || document.readyState === "interactive") {
    bootTrackingHub();
} else {
    document.addEventListener("DOMContentLoaded", bootTrackingHub);
    window.addEventListener("load", bootTrackingHub);
}
