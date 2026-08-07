// --- V5.2.5_EXTERNAL_THUB_SMART_ROUTING_MASTER ---
function bootTrackingHub() {
    if (window.thub_initialized) return;
    window.thub_initialized = true;

    console.log("TrackingHub Debug: Skript gebootet (V5.2.5).");

    const urlParams = new URLSearchParams(window.location.search);
    
    function getCleanParam(paramName) {
        const val = urlParams.get(paramName);
        return val ? val.replace(/\+/g, ' ') : null;
    }

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

    function saveTempUserData(dataObj) {
        const item = { data: dataObj, expiry: Date.now() + 25000 };
        sessionStorage.setItem('thub_temp_userdata', JSON.stringify(item));
        console.log("TrackingHub Debug: Nutzerdaten in Session-Kurier gespeichert (25s Timer läuft).");
    }

    function getAndClearTempUserData() {
        const str = sessionStorage.getItem('thub_temp_userdata');
        if (!str) return {};
        try {
            const item = JSON.parse(str);
            sessionStorage.removeItem('thub_temp_userdata'); 
            
            if (Date.now() > item.expiry) {
                console.log("TrackingHub Debug: Session-Kurier abgelaufen (> 25s). Daten verworfen.");
                return {};
            }
            console.log("TrackingHub Debug: Frische Nutzerdaten aus Session-Kurier geladen und sicher gelöscht.");
            return item.data || {};
        } catch(e) {
            return {};
        }
    }

    const paramsToStore = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
    paramsToStore.forEach(param => {
        const val = getCleanParam(param);
        if (val !== null) {
            setStorageWithExpiry('thub_' + param, val, storageExpiryMinutes);
        }
    });

    const thubAdIdVal = getCleanParam('thub_ad_id');
    const utmTermVal = getCleanParam('utm_term');
    
    if (thubAdIdVal !== null) {
        setStorageWithExpiry('thub_ad_id', thubAdIdVal, storageExpiryMinutes);
        console.log("TrackingHub Debug: thub_ad_id gefunden. Wird priorisiert gespeichert.");
    } else if (utmTermVal !== null) {
        setStorageWithExpiry('thub_ad_id', utmTermVal, storageExpiryMinutes);
    }

    setTimeout(function() {
        
        console.log("TrackingHub Debug: Sammle Daten nach 1500ms.");
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
            const rootDomain = '.' + window.location.hostname.split('.').slice(-2).join('.');
            document.cookie = `${name}=${value};expires=${d.toUTCString()};domain=${rootDomain};path=/;SameSite=Lax;Secure`;
        }

        function safeSetValue(element, value) {
            if (element && value && element.value !== value) {
                element.value = value;
                element.setAttribute('value', value); 
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        const currentUrlFbclid = getCleanParam('fbclid');
        const storedFbclid = getStorageWithExpiry('thub_fbclid');
        let fallbackFbc = null;

        if (currentUrlFbclid && currentUrlFbclid !== "") {
            const root = '.' + window.location.hostname.split('.').slice(-2).join('.');
            const host = window.location.hostname;
            const pastDate = 'Thu, 01 Jan 1970 00:00:00 UTC';
            document.cookie = `_fbc=; expires=${pastDate}; path=/;`;
            document.cookie = `_fbc=; expires=${pastDate}; domain=${root}; path=/;`;
            document.cookie = `_fbc=; expires=${pastDate}; domain=${host}; path=/;`;

            fallbackFbc = `fb.1.${Date.now()}.${currentUrlFbclid}`;
            setCookie('_fbc', fallbackFbc, 90); 
            console.log("TrackingHub Debug: Neue fbclid erkannt. Cookie-Duplikate gelöscht und neues _fbc auf Root-Domain erzwungen.");
            
        } else if (storedFbclid && storedFbclid !== "") {
            fallbackFbc = `fb.1.${Date.now()}.${storedFbclid}`;
            if (!getCookie('_fbc')) {
                setCookie('_fbc', fallbackFbc, 90);
                console.log("TrackingHub Debug: Fehlendes _fbc Cookie aus Storage wiederhergestellt (auf Root-Domain).");
            }
        }

        const thubCookieName = 'thub_lead_id';
        const thubOverrideValue = getCleanParam('thub') || getCleanParam('nli') || getCleanParam('nil');
        const cookieLeadId = getCookie(thubCookieName) || getCookie('nao_lead_id');
        const lsLeadId = localStorage.getItem(thubCookieName);
        
        function isValidUUID(id) {
            if (!id) return false;
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        }

        let currentLeadId = "";

        if (isValidUUID(thubOverrideValue)) {
            currentLeadId = thubOverrideValue;
        } else if (isValidUUID(cookieLeadId)) {
            currentLeadId = cookieLeadId;
        } else if (isValidUUID(lsLeadId)) {
            currentLeadId = lsLeadId;
        } else {
            currentLeadId = generateUUID();
        }

        setCookie(thubCookieName, currentLeadId, 90); 
        localStorage.setItem(thubCookieName, currentLeadId); 

        function pushOrFetch(payload) {
            const isTestMode = (urlParams.get('fetch_check') === 'true');
            const isGtmActive = (typeof window.google_tag_manager !== 'undefined' && Object.keys(window.google_tag_manager).length > 0);

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
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify(payload)
                    }).catch(function(err) {
                        console.error('TrackingHub Fetch-Fallback Error:', err);
                    });
                } else {
                    console.warn("TrackingHub: Fetch-Fallback übersprungen (kein serverEndpoint konfiguriert).");
                }
            }
        }

        function evaluateCurrentPageEvents(path) {
            const events = [
                { name: 'generate_lead', configStr: config.cLead },
                { name: 'schedule', configStr: config.cSchedule },
                { name: 'purchase', configStr: config.cPurchase }
            ];
            
            let matchedFormEvent = null;
            let matchedTypEvent = null;

            events.forEach(ev => {
                if (!ev.configStr) return;
                const routes = ev.configStr.split(',').map(p => p.trim());
                routes.forEach(route => {
                    if (route === "") return;
                    let isTyp = route.startsWith('typ:/');
                    let isForm = route.startsWith('form:/');
                    
                    let cleanPath = route;
                    if (isTyp) cleanPath = route.substring(5);
                    else if (isForm) cleanPath = route.substring(6);
                    else { cleanPath = route; isForm = true; } 
                    
                    if (cleanPath !== "" && path.includes(cleanPath)) {
                        if (isTyp) matchedTypEvent = ev.name;
                        if (isForm) matchedFormEvent = ev.name;
                    }
                });
            });

            return { matchedFormEvent, matchedTypEvent };
        }

        const pageEvents = evaluateCurrentPageEvents(currentPath);

        function isPathMatchingSimple(configString, path) {
            if (!configString) return false;
            const paths = configString.split(',').map(p => p.trim());
            return paths.some(p => {
                if (p === "") return false;
                let cleanP = p;
                if (p.startsWith('typ:/')) cleanP = p.substring(5);
                else if (p.startsWith('form:/')) cleanP = p.substring(6);
                return path.includes(cleanP);
            });
        }

        const excludePageView = isPathMatchingSimple(config.negativPV, currentPath);

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
                'th_tracking_data_gbraid': getStorageWithExpiry('thub_gbraid'),
                'th_tracking_data_thub_ad_id': getStorageWithExpiry('thub_ad_id')
            };

            pushOrFetch(basePayload);
        }

        if (pageEvents.matchedTypEvent) {
            const eventName = pageEvents.matchedTypEvent;
            const hasFired = sessionStorage.getItem('thub_fired_' + eventName);
            
            if (!hasFired) {
                console.log(`TrackingHub Debug: typ:/ Pfad erkannt. Feuere automatisches ${eventName} Event.`);
                
                const tempData = getAndClearTempUserData();
                
                const typPayload = {
                    'event': eventName, 
                    'event_name': eventName, 
                    'event_time': Math.floor(Date.now() / 1000), 
                    'action_source': 'website',
                    'event_id': generateUUID(), 
                    'th_user_data_email_address': tempData.email || "",
                    'th_user_data_phone_number': tempData.phone || "",
                    'th_user_data_first_name': tempData.firstName || "",
                    'th_user_data_last_name': tempData.lastName || "",
                    'th_user_data_city': tempData.city || "",
                    'th_user_data_postal_code': tempData.postalCode || "",
                    'th_user_data_country': tempData.country || "",
                    'th_tracking_data_funnel': tempData.funnel || "", 
                    'th_tracking_data_timestamp': Math.floor(Date.now() / 1000),
                    'th_tracking_data_utm_source': getStorageWithExpiry('thub_utm_source'),
                    'th_tracking_data_thub_ad_id': getStorageWithExpiry('thub_ad_id'), 
                    'th_tracking_data_lead_id': currentLeadId,
                    'th_tracking_data_user_agent': navigator.userAgent,
                    'th_tracking_data_page_url': window.location.href.split(/[?#]/)[0],
                    'th_tracking_data_fbc': getCookie('_fbc') || fallbackFbc || "",
                    'th_tracking_data_fbp': getCookie('_fbp') || "",
                    'th_tracking_data_gclid': getStorageWithExpiry('thub_gclid'),
                    'th_tracking_data_wbraid': getStorageWithExpiry('thub_wbraid'),
                    'th_tracking_data_gbraid': getStorageWithExpiry('thub_gbraid')
                };

                pushOrFetch(typPayload);
                sessionStorage.setItem('thub_fired_' + eventName, 'true'); 
            } else {
                console.log(`TrackingHub Debug: Event ${eventName} wurde in dieser Session bereits gefeuert. typ:/ wird übersprungen.`);
            }
        }

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
            
            const adIdField = config.trackingfields.thub_ad_id || config.trackingfields.utm_term;
            fillMultiple(adIdField, getStorageWithExpiry('thub_ad_id'));

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

        function extractUserDataFromForm(form) {
            function getSafeValue(fieldId) {
                if (!fieldId) return "";
                var field = form.querySelector('[id="' + fieldId + '"]');
                return field ? field.value : "";
            }
            return {
                email: getSafeValue(config.userDataFields.email),
                phone: getSafeValue(config.userDataFields.phone),
                firstName: getSafeValue(config.userDataFields.firstName),
                lastName: getSafeValue(config.userDataFields.lastName),
                city: getSafeValue(config.userDataFields.city),
                postalCode: getSafeValue(config.userDataFields.postalCode),
                country: getSafeValue(config.userDataFields.country),
                funnel: getSafeValue(config.trackingfields.funnel) 
            };
        }

        function handleFormSubmit(form) {
            if (!form) return;

            if (form.dataset.thubSubmitted === 'true') {
                console.log("TrackingHub Debug: Formular wurde bereits erfasst. Abbruch (Deduplizierung).");
                return;
            }
            
            form.dataset.thubSubmitted = 'true';
            const userData = extractUserDataFromForm(form);

            if (pageEvents.matchedFormEvent) {
                const eventName = pageEvents.matchedFormEvent;
                
                const payload = {
                    'event': eventName, 
                    'event_name': eventName, 
                    'event_time': Math.floor(Date.now() / 1000), 
                    'action_source': 'website',
                    'event_id': generateUUID(), 
                    'th_user_data_email_address': userData.email,
                    'th_user_data_phone_number': userData.phone,
                    'th_user_data_first_name': userData.firstName,
                    'th_user_data_last_name': userData.lastName,
                    'th_user_data_city': userData.city,
                    'th_user_data_postal_code': userData.postalCode,
                    'th_user_data_country': userData.country,
                    'th_tracking_data_funnel': userData.funnel, 
                    'th_tracking_data_timestamp': Math.floor(Date.now() / 1000),
                    'th_tracking_data_utm_source': getStorageWithExpiry('thub_utm_source'),
                    'th_tracking_data_thub_ad_id': getStorageWithExpiry('thub_ad_id'),
                    'th_tracking_data_lead_id': currentLeadId,
                    'th_tracking_data_user_agent': navigator.userAgent,
                    'th_tracking_data_page_url': window.location.href.split(/[?#]/)[0],
                    'th_tracking_data_fbc': getCookie('_fbc') || fallbackFbc || "",
                    'th_tracking_data_fbp': getCookie('_fbp') || "",
                    'th_tracking_data_gclid': getStorageWithExpiry('thub_gclid'),
                    'th_tracking_data_wbraid': getStorageWithExpiry('thub_wbraid'),
                    'th_tracking_data_gbraid': getStorageWithExpiry('thub_gbraid')
                };

                pushOrFetch(payload);
                sessionStorage.setItem('thub_fired_' + eventName, 'true'); 
            } else {
                if (userData.email && userData.email !== "") {
                    saveTempUserData(userData);
                } else {
                    console.log("TrackingHub Debug: Submit auf Nicht-Event-Seite, aber keine Email gefunden. Kurier übersprungen.");
                }
            }
        }

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

        document.addEventListener('submit', function(event) {
            const form = event.target;
            
            if (form.checkValidity && !form.checkValidity()) {
                console.log("TrackingHub Debug: Methode B (Nativ) - HTML5 Validierung fehlgeschlagen.");
                return;
            }

            setTimeout(() => {
                const hasErrors = form.querySelector('[class*="error"], [class*="invalid"], [class*="danger"], .elementor-message-danger');
                if (hasErrors) {
                    console.log("TrackingHub Debug: Methode B (Nativ) - Custom Formularfehler erkannt. Abbruch.");
                    return;
                }
                console.log("TrackingHub Debug: Methode B (Nativ) - Formular gültig erkannt.");
                handleFormSubmit(form);
            }, 200);
        }, true);


        function initLiveDebugger() {
            if (urlParams.get('thub-check-value') !== 'true') return;

            const debugContainer = document.createElement('div');
            debugContainer.id = 'thub-live-debugger';
            debugContainer.style.cssText = 'margin-top: 50px; background-color: #1e1e1e; color: #d4d4d4; padding: 30px; font-family: monospace; font-size: 15px; border-top: 4px solid #ff9800; word-break: break-all;';
            document.body.appendChild(debugContainer);

            function getLiveFieldValue(fieldId) {
                if (!fieldId) return "nicht gesetzt";
                const fields = document.querySelectorAll('[id="' + fieldId + '"]');
                for (let i = 0; i < fields.length; i++) {
                    let field = fields[i];
                    let val = field.value || field.getAttribute('value');
                    if (val && val.trim() !== "") {
                        return val.trim();
                    }
                }
                return "nicht gesetzt";
            }

            function formatVal(val) {
                return (val && val !== "") ? val : "<span style='color: #ff5252;'>nicht gesetzt</span>";
            }
            
            function formatDualVal(paramName) {
                const urlVal = getCleanParam(paramName);
                const storageVal = getStorageWithExpiry('thub_' + paramName);
                const urlStr = (urlVal && urlVal.trim() !== "") ? urlVal : "<span style='color: #ff5252;'>kein Parameter</span>";
                const storageStr = (storageVal && storageVal !== "") ? storageVal : "<span style='color: #ff5252;'>nicht gesetzt</span>";
                return `${urlStr} / ${storageStr}`;
            }

            function renderDebugTable() {
                let matchedEventNameForDebug = "Kein Event definiert";
                let requireSubmitStr = "N/A";
                let eventColor = "#ff5252"; 

                if (pageEvents.matchedFormEvent && pageEvents.matchedTypEvent) {
                    matchedEventNameForDebug = pageEvents.matchedFormEvent + " (Form & TYP)";
                    requireSubmitStr = "Beides hinterlegt (Konflikt möglich)";
                    eventColor = "#FFC107"; 
                } else if (pageEvents.matchedFormEvent) {
                    matchedEventNameForDebug = pageEvents.matchedFormEvent;
                    requireSubmitStr = "Ja (form:/)";
                    eventColor = "#4CAF50"; 
                } else if (pageEvents.matchedTypEvent) {
                    matchedEventNameForDebug = pageEvents.matchedTypEvent;
                    requireSubmitStr = "Nein (typ:/)";
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
                            <tr style="border-bottom: 1px solid #333; background-color: #2a2a2a;"><td style="padding: 12px; color: #9C27B0;"><b>Routing</b></td><td style="padding: 12px; font-weight: bold;">Erkanntes Event</td><td style="padding: 12px; color: ${eventColor}; font-weight: bold; font-size: 16px;">${matchedEventNameForDebug}</td></tr>
                            <tr style="border-bottom: 2px solid #ff9800; background-color: #2a2a2a;"><td style="padding: 12px; color: #9C27B0;"><b>Routing</b></td><td style="padding: 12px; font-weight: bold;">Form-Submit erforderlich</td><td style="padding: 12px; color: ${eventColor}; font-weight: bold; font-size: 16px;">${requireSubmitStr}</td></tr>
                            
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #4CAF50;"><b>ID</b></td><td style="padding: 8px;">Lead ID</td><td style="padding: 8px; color: #fff;">${formatVal(currentLeadId)}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>Tracking-Feld (Live)</b></td><td style="padding: 8px;">Funnel (Versteckt)</td><td style="padding: 8px; color: #fff;">${formatVal(getLiveFieldValue(config.trackingfields.funnel))}</td></tr>
                            
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">gclid / gclid (Storage)</td><td style="padding: 8px; color: #fff;">${formatDualVal('gclid')}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">wbraid / wbraid (Storage)</td><td style="padding: 8px; color: #fff;">${formatDualVal('wbraid')}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">gbraid / gbraid (Storage)</td><td style="padding: 8px; color: #fff;">${formatDualVal('gbraid')}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #2196F3;"><b>Klick-IDs</b></td><td style="padding: 8px;">fbclid / fbclid (Storage)</td><td style="padding: 8px; color: #fff;">${formatDualVal('fbclid')}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_source / utm_source (Storage)</td><td style="padding: 8px; color: #fff;">${formatDualVal('utm_source')}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_medium / utm_medium (Storage)</td><td style="padding: 8px; color: #fff;">${formatDualVal('utm_medium')}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_campaign / utm_campaign (Storage)</td><td style="padding: 8px; color: #fff;">${formatDualVal('utm_campaign')}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>UTM-Parameter</b></td><td style="padding: 8px;">utm_content / utm_content (Storage)</td><td style="padding: 8px; color: #fff;">${formatDualVal('utm_content')}</td></tr>
                            <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px; color: #E91E63;"><b>Ad/UTM-Parameter</b></td><td style="padding: 8px;">thub_ad_id (Storage)</td><td style="padding: 8px; color: #fff;">${formatVal(getStorageWithExpiry('thub_ad_id'))}</td></tr>
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
            document.addEventListener('click', () => setTimeout(renderDebugTable, 600)); // HIER LIEGT DIE ANPASSUNG
        }

        initLiveDebugger();

        function initFetchCheckWarning() {
            if (urlParams.get('fetch_check') !== 'true') return;

            const warnContainer = document.createElement('div');
            warnContainer.id = 'thub-fetch-check-warning';
            warnContainer.style.cssText = 'background-color: #ff5252; color: #ffffff; padding: 15px; font-family: sans-serif; font-size: 14px; font-weight: bold; text-align: center; border-top: 2px solid #b71c1c; margin-top: 20px; word-break: break-word;';
            warnContainer.innerHTML = '⚠️ ACHTUNG: Fetch-Testmodus aktiv (fetch_check=true). Das reguläre GTM-Tracking ist blockiert und die Daten werden als direktes Fallback an den Server gesendet.';
            document.body.appendChild(warnContainer);
        }

        initFetchCheckWarning();

    }, 1500);
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    bootTrackingHub();
} else {
    document.addEventListener("DOMContentLoaded", bootTrackingHub);
    window.addEventListener("load", bootTrackingHub);
}
