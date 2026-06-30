// --- V3.9.4_EXTERNAL_THUB_HYBRID_MASTER (Minuten-Timer & Redundanz-Schleife) ---
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
        setCookie(config.cookieName, currentLeadId, 90); // Auffrischen des Cookies
        localStorage.setItem(config.cookieName, currentLeadId); // Speichern im LocalStorage für Unsterblichkeit

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

    }, 800);
});
