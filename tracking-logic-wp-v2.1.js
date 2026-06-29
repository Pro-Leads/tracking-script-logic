// --- V3.9_EXTERNAL_THUB_HYBRID_MASTER ---
window.addEventListener("load", function() {
    
    // 1. URL-Parameter sofort beim ersten Laden abfangen und im localStorage sichern
    const urlParams = new URLSearchParams(window.location.search);
    
    function getCleanParam(paramName) {
        const val = urlParams.get(paramName);
        return val ? val.replace(/\+/g, ' ') : null;
    }

    // Klick-IDs und UTMs in den localStorage retten (Sicher vor Tab-Wechseln und URL-Verlust)
    const paramsToStore = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    paramsToStore.forEach(param => {
        const val = getCleanParam(param);
        if (val !== null) {
            localStorage.setItem('thub_' + param, val);
        }
    });

    // Künstliche Verzögerung von 800ms nach dem Laden für das restliche Setup
    setTimeout(function() {
        
        const config = window.TrackingHubLeadConfig;

        if (!config || !config.trackingfields) {
            console.error("Die Konfiguration 'window.TrackingHubLeadConfig' wurde nicht gefunden.");
            return;
        }

        config.userDataFields = config.userDataFields || {};

        // --- Hilfsfunktionen ---
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

        // --- Facebook FBC Cookie Logik (Schutz vor Überschreiben) ---
        const storedFbclid = localStorage.getItem('thub_fbclid');
        let fallbackFbc = null;
        if (storedFbclid) {
            fallbackFbc = `fb.1.${Date.now()}.${storedFbclid}`;
            if (!getCookie('_fbc')) {
                setCookie('_fbc', fallbackFbc, 90);
            }
        }

        // --- LEAD ID MANAGEMENT (Mit dedizierter Schutz- & Override-Logik) ---
        const thubOverrideValue = getCleanParam('thub') || getCleanParam('nli') || getCleanParam('nil');
        let currentLeadId = getCookie(config.cookieName) || getCookie('nao_lead_id');

        if (thubOverrideValue) {
            // URL-Befehl: Überschreiben erzwungen, wenn Parameter existiert UND ungleich dem aktuellen Cookie ist
            if (thubOverrideValue !== currentLeadId) {
                setCookie(config.cookieName, thubOverrideValue, 90);
                currentLeadId = thubOverrideValue;
            }
        } else if (!currentLeadId) {
            // Kein Cookie vorhanden: Frisch generieren
            currentLeadId = generateUUID();
            setCookie(config.cookieName, currentLeadId, 90);
        } else {
            // Cookie existiert bereits und kein URL-Override aktiv: Sicher beibehalten und Ablaufdatum auffrischen
            setCookie(config.cookieName, currentLeadId, 90);
        }

        // --- HIDDEN FIELDS BEFÜLLEN (Für das CRM) ---
        function fillAllFields() {
            function fillMultiple(fieldId, value) {
                if (!fieldId || !value) return;
                const elements = document.querySelectorAll('[id="' + fieldId + '"]');
                elements.forEach(el => safeSetValue(el, value));
            }

            // Befüllt nur noch die 6 für dein Backend/CRM relevanten Felder im HTML
            fillMultiple(config.trackingfields.lead_id, currentLeadId);
            fillMultiple(config.trackingfields.utm_source, localStorage.getItem('thub_utm_source'));
            fillMultiple(config.trackingfields.utm_medium, localStorage.getItem('thub_utm_medium'));
            fillMultiple(config.trackingfields.utm_campaign, localStorage.getItem('thub_utm_campaign'));
            fillMultiple(config.trackingfields.utm_content, localStorage.getItem('thub_utm_content'));
            fillMultiple(config.trackingfields.utm_term, localStorage.getItem('thub_utm_term'));

            return true; 
        }

        // Polling-Intervall für dynamische Formulare (Elementor Popups etc.)
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

        // --- SUBMIT LOGIK (Elementor Success Gateway) ---
        function initTrackingHubTracking() {
            if (typeof jQuery === 'undefined') {
                setTimeout(initTrackingHubTracking, 100);
                return;
            }

            jQuery(document).on('submit_success', function(event, response) {
                var form = event.target;
                
                // Gatekeeper
                if (form && form.querySelector('[id="' + config.userDataFields.email + '"]')) {
                    
                    function getSafeValue(fieldId) {
                        if (!fieldId) return "";
                        var field = form.querySelector('[id="' + fieldId + '"]');
                        return field ? field.value : "";
                    }

                    // Datenpaket schnüren (Direktzugriff ohne Umweg über HTML-Felder)
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
                            'lead_id': currentLeadId,
                            'user_agent': navigator.userAgent,
                            'page_url': window.location.href.split(/[?#]/)[0],
                            'fbc': getCookie('_fbc') || fallbackFbc || "",
                            'fbp': getCookie('_fbp') || "",
                            'gclid': localStorage.getItem('thub_gclid') || "",
                            'wbraid': localStorage.getItem('thub_wbraid') || "",
                            'gbraid': localStorage.getItem('thub_gbraid') || ""
                        }
                    };

                    // --- DIE ADBLOCKER WEICHE + TESTPARAMETER SIMULATION ---
                    const isTestMode = (urlParams.get('fetch_check') === 'true');
                    const isGtmActive = (typeof window.google_tag_manager !== 'undefined');

                    if (isGtmActive && !isTestMode) {
                        // Szenario A: GTM geladen und kein Testmodus aktiv -> dataLayer befüllen
                        window.dataLayer = window.dataLayer || [];
                        window.dataLayer.push(payload);
                    } else {
                        // Szenario B: GTM blockiert ODER fetch_check=true -> Direkter HTTP-POST per Fetch an den sGTM
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
                    }
                }
            });
        }

        initTrackingHubTracking();

    }, 800);
});
