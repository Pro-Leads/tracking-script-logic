// --- V3.9.5_EXTERNAL_THUB_HYBRID_MASTER (Inklusive Live-Debugger) ---
window.addEventListener("load", function() {
    
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
            // Umrechnung von Minuten in Millisekunden
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
                // Prüfen, ob die Zeit abgelaufen ist
                if (new Date().getTime() > item.expiry) {
                    localStorage.removeItem(key); 
                    return "";
                }
                return item.value || "";
            }
        } catch (e) {}
        return itemStr; 
    }

    // 1. Klick-IDs und UTMs abfangen und speichern (Überschreibt alte Werte automatisch!)
    const paramsToStore = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    paramsToStore.forEach(param => {
        const val = getCleanParam(param);
        if (val !== null) {
            setStorageWithExpiry('thub_' + param, val, storageExpiryMinutes);
        }
    });

    setTimeout(function() {
        
        const config = window.TrackingHubLeadConfig;

        if (!config || !config.trackingfields) {
            console.error("Die Konfiguration 'window.TrackingHubLeadConfig' wurde nicht gefunden.");
            return;
        }

        config.userDataFields = config.userDataFields || {};

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

        const storedFbclid = getStorageWithExpiry('thub_fbclid');
        let fallbackFbc = null;
        if (storedFbclid && storedFbclid !== "") {
            fallbackFbc = `fb.1.${Date.now()}.${storedFbclid}`;
            if (!getCookie('_fbc')) {
                setCookie('_fbc', fallbackFbc, 90);
            }
        }

        // --- LEAD ID MANAGEMENT (Wiederbelebungs-Schleife Cookie + LocalStorage) ---
        const thubOverrideValue = getCleanParam('thub') || getCleanParam('nli') || getCleanParam('nil');
        const cookieLeadId = getCookie(config.cookieName) || getCookie('nao_lead_id');
        const lsLeadId = localStorage.getItem(config.cookieName);
        
        let currentLeadId = "";

        if (thubOverrideValue) {
            // 1. URL-Parameter (z.B. aus CRM) gewinnt immer
            currentLeadId = thubOverrideValue;
        } else if (cookieLeadId) {
            // 2. Cookie existiert regulär
            currentLeadId = cookieLeadId;
        } else if (lsLeadId) {
            // 3. Cookie wurde gelöscht (z.B. Safari ITP), LocalStorage rettet die ID!
            currentLeadId = lsLeadId;
        } else {
            // 4. Völlig neuer Nutzer: ID generieren
            currentLeadId = generateUUID();
        }

        // Jetzt wird die ID an BEIDEN Orten gespeichert bzw. die Laufzeit aufgefrischt
        setCookie(config.cookieName, currentLeadId, 90); 
        localStorage.setItem(config.cookieName, currentLeadId); 

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

        // --- SUBMIT LOGIK ---
        function initTrackingHubTracking() {
            if (typeof jQuery === 'undefined') {
                setTimeout(initTrackingHubTracking, 100);
                return;
            }

            jQuery(document).on('submit_success', function(event, response) {
                var form = event.target;
                
                if (form && form.querySelector('[id="' + config.userDataFields.email + '"]')) {
                    
                    function getSafeValue(fieldId) {
                        if (!fieldId) return "";
                        var field = form.querySelector('[id="' + fieldId + '"]');
                        return field ? field.value : "";
                    }

                    const payload = {
                        'event': config.eventName, 
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
                            'timestamp': Math.floor(Date.now() / 1000),
                            'lead_id': currentLeadId,
                            'user_agent': navigator.userAgent,
                            'page_url': window.location.href.split(/[?#]/)[0],
                            'fbc': getCookie('_fbc') || fallbackFbc || "",
                            'fbp': getCookie('_fbp') || "",
                            'gclid': getStorageWithExpiry('thub_gclid'),
                            'wbraid': getStorageWithExpiry('thub_wbraid'),
                            'gbraid': getStorageWithExpiry('thub_gbraid')
                        }
                    };

                    const isTestMode = (urlParams.get('fetch_check') === 'true');
                    const isGtmActive = (typeof window.google_tag_manager !== 'undefined');

                    if (isGtmActive && !isTestMode) {
                        window.dataLayer = window.dataLayer || [];
                        window.dataLayer.push(payload);
                    } else {
                        if (config.serverEndpoint && config.serverEndpoint.trim() !== "") {
                            fetch(config.serverEndpoint, {
                                method: 'POST',
                                keepalive: true,
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(payload)
                            }).catch(function(err) {
                                console.error('TrackingHub Fetch-Fallback Error:', err);
                            });
                        } else {
                            console.warn("TrackingHub: Fetch-Fallback wurde übersprungen, da 'serverEndpoint' nicht konfiguriert ist.");
                        }
                    }
                }
            });
        }

        initTrackingHubTracking();

        // --- VISUELLER LIVE-DEBUGGER ---
        function initLiveDebugger() {
            if (urlParams.get('thub-check-value') !== 'true') return;

            // Container-Styling ganz unten an die Seite hängen
            const debugContainer = document.createElement('div');
            debugContainer.id = 'thub-live-debugger';
            debugContainer.style.cssText = 'margin-top: 50px; background-color: #1e1e1e; color: #d4d4d4; padding: 30px; font-family: monospace; font-size: 15px; border-top: 4px solid #ff9800; word-break: break-all;';
            document.body.appendChild(debugContainer);

            // Hilfsfunktion: Prüft Live-Werte im Formular
            function getLiveFieldValue(fieldId) {
                if (!fieldId) return "nicht gesetzt";
                const field = document.querySelector('[id="' + fieldId + '"]');
                return (field && field.value.trim() !== "") ? field.value : "nicht gesetzt";
            }

            // Hilfsfunktion: Fallback für leere Werte
            function formatVal(val) {
                return (val && val !== "") ? val : "<span style='color: #ff5252;'>nicht gesetzt</span>";
            }

            // Rendert die Tabelle neu
            function renderDebugTable() {
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
                            <!-- ID -->
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #4CAF50;"><b>ID</b></td><td style="padding: 8px;">Lead ID</td><td style="padding: 8px; color: #fff;">${formatVal(currentLeadId)}</td></tr>
                            
                            <!-- Klick-IDs -->
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">gclid</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_gclid'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">wbraid</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_wbraid'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">gbraid</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_gbraid'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">fbclid</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_fbclid'))}</td></tr>
                            
                            <!-- UTMs -->
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_source</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_source'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_medium</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_medium'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_campaign</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_campaign'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_content</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_content'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_term</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_utm_term'))}</td></tr>
                            
                            <!-- Cookies -->
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #FFC107;"><b>Cookies</b></td><td style="padding: 8px;">_fbc</td><td style="padding: 8px; color: #fff;">${formatVal(getCookie('_fbc'))}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #FFC107;"><b>Cookies</b></td><td style="padding: 8px;">_fbp</td><td style="padding: 8px; color: #fff;">${formatVal(getCookie('_fbp'))}</td></tr>
                            
                            <!-- Live Formular-Werte -->
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

            // Einmalig initial rendern
            renderDebugTable();

            // Event Listener hinzufügen, um auf Eingaben in Echtzeit zu reagieren
            document.addEventListener('input', renderDebugTable);
            document.addEventListener('change', renderDebugTable);
            // Zusätzlicher Fallback für Auto-Fill-Ereignisse, die manchmal keine Input-Events feuern
            document.addEventListener('click', () => setTimeout(renderDebugTable, 100));
        }

        initLiveDebugger();

    }, 800);
});
