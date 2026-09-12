// --- V7.8 ---

const _thub_frozenSearch = window.location.search;
const _thub_frozenHash = window.location.hash;
const _thub_frozenHref = window.location.href;
const _thub_frozenPathname = window.location.pathname;
const _thub_frozenReferrer = document.referrer || "";

function bootTrackingHub() {
    if (window.thub_initialized) return;
    window.thub_initialized = true;

    let searchString = _thub_frozenSearch;
    if (!searchString && _thub_frozenHash.includes('?')) {
        searchString = _thub_frozenHash.substring(_thub_frozenHash.indexOf('?'));
    }
    const urlParams = new URLSearchParams(searchString);
    
    function getCleanParam(paramName) {
        const val = urlParams.get(paramName);
        return val ? val.replace(/\+/g, ' ') : null;
    }

    const storageExpiryMinutes = 43200; 
    const utmExpiryMinutes = 10080;
    
    function setStorageWithExpiry(key, value, minutes) {
        try {
            const now = new Date();
            const item = { value: value, expiry: now.getTime() + (minutes * 60 * 1000) };
            localStorage.setItem(key, JSON.stringify(item));
        } catch(e) {}
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

    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
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
        
        let domainString = "";
        const host = window.location.hostname;
        
        if (host.includes('.') && !/^[0-9.]+$/.test(host)) {
            const rootDomain = host.split('.').slice(-2).join('.');
            domainString = `;domain=.${rootDomain}`;
        }
        
        document.cookie = `${name}=${value};expires=${d.toUTCString()}${domainString};path=/;SameSite=Lax;Secure`;
    }

    function isValidUUID(id) {
        if (!id) return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    }

    function saveTempUserData(dataObj) {
        const item = { data: dataObj, expiry: Date.now() + 25000 };
        sessionStorage.setItem('thub_temp_userdata', JSON.stringify(item));
    }

    function getTempUserData() {
        const str = sessionStorage.getItem('thub_temp_userdata');
        if (!str) return {};
        try {
            const item = JSON.parse(str);
            if (Date.now() > item.expiry) return {};
            return item.data || {};
        } catch(e) {
            return {};
        }
    }

    const thubData = {
        gclid: "", wbraid: "", gbraid: "", fbclid: "",
        utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "",
        thub_ad_id: "", fbc: "", fbp: "", lead_id: "", page_url: "", referrer: ""
    };

    const clickIdParams = ['gclid', 'wbraid', 'gbraid', 'fbclid'];
    clickIdParams.forEach(param => {
        const liveVal = getCleanParam(param);
        if (liveVal && liveVal !== "") {
            thubData[param] = liveVal;
            setStorageWithExpiry('thub_' + param, liveVal, storageExpiryMinutes);
        } else {
            thubData[param] = getStorageWithExpiry('thub_' + param);
        }
    });

    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    utmParams.forEach(param => {
        const liveVal = getCleanParam(param);
        if (liveVal && liveVal !== "") {
            thubData[param] = liveVal;
            setStorageWithExpiry('thub_' + param, liveVal, utmExpiryMinutes);
        } else {
            thubData[param] = getStorageWithExpiry('thub_' + param);
        }
    });

    const liveAdId = getCleanParam('thub_ad_id');
    if (liveAdId && liveAdId !== "") {
        thubData.thub_ad_id = liveAdId;
        setStorageWithExpiry('thub_ad_id', liveAdId, storageExpiryMinutes);
    } else if (thubData.utm_term !== "") {
        thubData.thub_ad_id = thubData.utm_term;
        setStorageWithExpiry('thub_ad_id', thubData.utm_term, storageExpiryMinutes);
    } else {
        thubData.thub_ad_id = getStorageWithExpiry('thub_ad_id');
    }

    const thubCookieName = 'thub_lead_id';
    const urlLeadId = getCleanParam('thub') || getCleanParam('nli') || getCleanParam('nil');
    const cookieLeadId = getCookie(thubCookieName) || getCookie('nao_lead_id') || localStorage.getItem(thubCookieName);

    if (isValidUUID(urlLeadId)) thubData.lead_id = urlLeadId;
    else if (isValidUUID(cookieLeadId)) thubData.lead_id = cookieLeadId;
    else thubData.lead_id = generateUUID();

    setCookie(thubCookieName, thubData.lead_id, 90); 
    try {
        localStorage.setItem(thubCookieName, thubData.lead_id);
    } catch(e) {}

    thubData.page_url = _thub_frozenHref.split(/[?#]/)[0];
    thubData.referrer = _thub_frozenReferrer;

    // --- PROACTIVE LINK UPDATER ENGINE (BRUTE FORCE & OBSERVER) ---
    const linkParameterMapping = {
        'digistore24.com': 'ds24tr',
        'ablefy.com': 'utm_term'
    };

    function getRootDomain(hostname) {
        const parts = hostname.split('.');
        if (parts.length <= 2) return hostname;
        return parts.slice(-2).join('.');
    }

    function injectLeadId(linkElement) {
        if (!linkElement || !linkElement.hasAttribute('href') || !thubData.lead_id) return;
        try {
            let url = new URL(linkElement.href, window.location.origin);
            const currentHost = window.location.hostname;
            const targetHost = url.hostname;
            
            if (targetHost && targetHost !== currentHost) {
                const currentRoot = getRootDomain(currentHost);
                const targetRoot = getRootDomain(targetHost);
                let paramName = 'utm_term'; 
                
                if (currentRoot === targetRoot) {
                    paramName = 'thub';
                } else {
                    for (const domain in linkParameterMapping) {
                        if (targetHost.includes(domain)) {
                            paramName = linkParameterMapping[domain];
                            break;
                        }
                    }
                }

                if (url.searchParams.get(paramName) !== thubData.lead_id) {
                    url.searchParams.set(paramName, thubData.lead_id);
                    linkElement.href = url.toString();
                }
            }
        } catch (e) {}
    }

    function scanAndInjectAllLinks() {
        document.querySelectorAll('a[href]').forEach(injectLeadId);
    }

    scanAndInjectAllLinks();

    if (typeof MutationObserver !== 'undefined') {
        let observerTimeout;
        let pendingMutations = [];
        const observer = new MutationObserver((mutations) => {
            pendingMutations.push(...mutations);
            if (observerTimeout) clearTimeout(observerTimeout);
            observerTimeout = setTimeout(() => {
                const mutationsToProcess = pendingMutations;
                pendingMutations = [];
                mutationsToProcess.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { 
                            if (node.tagName === 'A' && node.hasAttribute('href')) {
                                injectLeadId(node);
                            }
                            if (node.querySelectorAll) {
                                node.querySelectorAll('a[href]').forEach(injectLeadId);
                            }
                        }
                    });
                    if (mutation.type === 'attributes' && mutation.attributeName === 'href' && mutation.target.tagName === 'A') {
                        injectLeadId(mutation.target);
                    }
                });
            }, 250);
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    }

    ['mouseover', 'touchstart', 'mousedown', 'focusin'].forEach(evt => {
        document.addEventListener(evt, function(event) {
            const link = event.target.closest('a[href]');
            if (link) injectLeadId(link);
        }, true);
    });

    // --- VERKÜRZTES TIMEOUT: 500ms ---
    setTimeout(function() {
        
        thubData.fbp = getCookie('_fbp') || "";
        
        const existingFbc = getCookie('_fbc');
        if (thubData.fbclid !== "") {
            if (existingFbc && existingFbc.includes(thubData.fbclid)) {
                thubData.fbc = existingFbc;
            } else {
                const fallbackFbc = `fb.1.${Date.now()}.${thubData.fbclid}`;
                setCookie('_fbc', fallbackFbc, 90); 
                thubData.fbc = fallbackFbc;
            }
        } else {
            thubData.fbc = existingFbc || "";
        }

        const config = window.TrackingHubLeadConfig || {};
        config.userDataFields = config.userDataFields || {};
        config.trackingfields = config.trackingfields || {};

        window.thub_live_cache = window.thub_live_cache || { email: "", phone: "", firstName: "", lastName: "", city: "", postalCode: "", country: "", funnel: "" };

        function forcePersistCache() {
            if ((window.thub_live_cache.email && window.thub_live_cache.email !== "") || 
                (window.thub_live_cache.phone && window.thub_live_cache.phone !== "") || 
                (window.thub_live_cache.firstName && window.thub_live_cache.firstName !== "")) {
                saveTempUserData(window.thub_live_cache);
            }
        }

        function updateCacheFromElement(el) {
            if(!el || !el.value) return;
            const val = el.value.trim();
            if(val === "") return;

            let cacheUpdated = false;

            for (const key in config.userDataFields) {
                const selectors = config.userDataFields[key].split(',').map(s => s.trim());
                for (let s of selectors) {
                    if (!s) continue;
                    try {
                        if (el.matches(s)) {
                            window.thub_live_cache[key] = val;
                            cacheUpdated = true;
                            break;
                        }
                    } catch(err) {}
                }
            }
            if(config.trackingfields.funnel) {
                const funnelSelectors = config.trackingfields.funnel.split(',').map(s => s.trim());
                for (let s of funnelSelectors) {
                    if (!s) continue;
                    try {
                        if (el.matches(s)) {
                            window.thub_live_cache.funnel = val;
                            cacheUpdated = true;
                            break;
                        }
                    } catch(err) {}
                }
            }

            if (cacheUpdated) forcePersistCache();
        }

        ['input', 'change', 'focusout'].forEach(evt => {
            document.addEventListener(evt, (e) => {
                if(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
                    updateCacheFromElement(e.target);
                }
            }, true);
        });

        ['mousedown', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, (e) => {
                const tag = e.target ? e.target.tagName : "";
                const type = e.target ? e.target.getAttribute('type') : "";
                if (tag === 'BUTTON' || (tag === 'INPUT' && (type === 'submit' || type === 'button')) || (e.target && e.target.closest && (e.target.closest('button') || e.target.closest('a')))) {
                    let cacheUpdated = false;
                    for (const key in config.userDataFields) {
                        const selectors = config.userDataFields[key].split(',').map(s => s.trim());
                        for (let s of selectors) {
                            if (!s) continue;
                            try {
                                const fields = document.querySelectorAll(s);
                                fields.forEach(f => {
                                    if(f.value && f.value.trim() !== "") {
                                        window.thub_live_cache[key] = f.value.trim();
                                        cacheUpdated = true;
                                    }
                                });
                            } catch(err) {}
                        }
                    }
                    if (cacheUpdated) forcePersistCache();
                }
            }, true);
        });

        const currentPath = _thub_frozenPathname;

        function safeSetValue(element, value) {
            if (element && value && element.value !== value) {
                element.value = value;
                element.setAttribute('value', value); 
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // --- HYBRID QUEUE SYSTEM ---
        window.thub_payload_queue = window.thub_payload_queue || [];
        let thub_fallback_timer = null;
        let bgScanner = null;

        function triggerEmergencyFetch() {
            while(window.thub_payload_queue.length > 0) {
                let payload = window.thub_payload_queue.shift();
                if (config.serverEndpoint && config.serverEndpoint.trim() !== "") {
                    if (navigator.sendBeacon) {
                        navigator.sendBeacon(config.serverEndpoint, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
                    } else {
                        fetch(config.serverEndpoint, { method: 'POST', keepalive: true, credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) }).catch(function(err) {});
                    }
                }
            }
            thub_fallback_timer = null;
        }

        function flushQueueToGTM() {
            if (window.thub_payload_queue.length === 0) return;
            const isGtmActive = (typeof window.google_tag_manager !== 'undefined' && Object.keys(window.google_tag_manager).length > 0);
            if (isGtmActive) {
                window.dataLayer = window.dataLayer || [];
                while(window.thub_payload_queue.length > 0) {
                    window.dataLayer.push(window.thub_payload_queue.shift());
                }
                if (thub_fallback_timer) {
                    clearTimeout(thub_fallback_timer);
                    thub_fallback_timer = null;
                }
            }
        }
        
        function startQueueScanner() {
            if (bgScanner) return;
            let scanCount = 0;
            bgScanner = setInterval(() => {
                scanCount++;
                flushQueueToGTM();
                if (scanCount >= 12 || window.thub_payload_queue.length === 0) {
                    clearInterval(bgScanner);
                    bgScanner = null;
                }
            }, 500);
        }

        function pushOrFetch(payload) {
            const isTestMode = (urlParams.get('fetch_check') === 'true');
            const isGtmActive = (typeof window.google_tag_manager !== 'undefined' && Object.keys(window.google_tag_manager).length > 0);

            if (isGtmActive && !isTestMode) {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(payload);
            } else if (isTestMode) {
                if (config.serverEndpoint && config.serverEndpoint.trim() !== "") {
                    if (navigator.sendBeacon) {
                        navigator.sendBeacon(config.serverEndpoint, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
                    } else {
                        fetch(config.serverEndpoint, { method: 'POST', keepalive: true, credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) }).catch(function(err) {});
                    }
                }
            } else {
                window.thub_payload_queue.push(payload);
                startQueueScanner();
                if (!thub_fallback_timer) {
                    thub_fallback_timer = setTimeout(triggerEmergencyFetch, 6000);
                }
            }
        }

        ['click', 'touchstart', 'visibilitychange'].forEach(evt => {
            document.addEventListener(evt, (e) => {
                if (evt === 'visibilitychange' && document.visibilityState === 'hidden') {
                    const isGtmActive = (typeof window.google_tag_manager !== 'undefined' && Object.keys(window.google_tag_manager).length > 0);
                    if (!isGtmActive && window.thub_payload_queue.length > 0) {
                        triggerEmergencyFetch();
                        return;
                    }
                }
                flushQueueToGTM();
            }, { passive: true });
        });

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

        // --- DEBUGGER & WARNING ENGINE (REINTEGRIERT) ---
        function initLiveDebugger() {
            if (urlParams.get('thub-check-value') !== 'true') return;

            function getLiveFieldValue(fieldKey, selectorString) {
                if (window.thub_live_cache && window.thub_live_cache[fieldKey] && window.thub_live_cache[fieldKey] !== "") {
                    return window.thub_live_cache[fieldKey] + " (Cache)";
                }
                if (!selectorString) return "nicht konfiguriert";
                const selectors = selectorString.split(',').map(s => s.trim());
                for (let s of selectors) {
                    if (!s) continue;
                    try { 
                        const fields = document.querySelectorAll(s); 
                        for (let i = 0; i < fields.length; i++) {
                            let val = fields[i].value || fields[i].getAttribute('value');
                            if (val && val.trim() !== "") return val.trim() + " (Live)";
                        }
                    } catch(e) {}
                }
                return "nicht gefunden/leer";
            }

            function renderConsoleTable() {
                let matchedEventNameForDebug = "Kein Event definiert";
                if (pageEvents && pageEvents.matchedFormEvent && pageEvents.matchedTypEvent) {
                    matchedEventNameForDebug = pageEvents.matchedFormEvent + " (Form & TYP Konflikt)";
                } else if (pageEvents && pageEvents.matchedFormEvent) {
                    matchedEventNameForDebug = pageEvents.matchedFormEvent;
                } else if (pageEvents && pageEvents.matchedTypEvent) {
                    matchedEventNameForDebug = pageEvents.matchedTypEvent;
                }

                const debugData = {
                    "Erkanntes Event": { Kategorie: "Routing", Wert: matchedEventNameForDebug },
                    "Lead ID": { Kategorie: "ID", Wert: thubData.lead_id || "nicht gesetzt" },
                    "gclid": { Kategorie: "Klick-IDs", Wert: thubData.gclid || "nicht gesetzt" },
                    "wbraid": { Kategorie: "Klick-IDs", Wert: thubData.wbraid || "nicht gesetzt" },
                    "gbraid": { Kategorie: "Klick-IDs", Wert: thubData.gbraid || "nicht gesetzt" },
                    "fbclid": { Kategorie: "Klick-IDs", Wert: thubData.fbclid || "nicht gesetzt" },
                    "utm_source": { Kategorie: "UTM-Parameter", Wert: thubData.utm_source || "nicht gesetzt" },
                    "utm_medium": { Kategorie: "UTM-Parameter", Wert: thubData.utm_medium || "nicht gesetzt" },
                    "utm_campaign": { Kategorie: "UTM-Parameter", Wert: thubData.utm_campaign || "nicht gesetzt" },
                    "utm_content": { Kategorie: "UTM-Parameter", Wert: thubData.utm_content || "nicht gesetzt" },
                    "thub_ad_id": { Kategorie: "Ad/UTM-Parameter", Wert: thubData.thub_ad_id || "nicht gesetzt" },
                    "_fbc": { Kategorie: "Cookies", Wert: thubData.fbc || "nicht gesetzt" },
                    "_fbp": { Kategorie: "Cookies", Wert: thubData.fbp || "nicht gesetzt" },
                    "E-Mail": { Kategorie: "Formular", Wert: getLiveFieldValue('email', config?.userDataFields?.email) },
                    "Vorname": { Kategorie: "Formular", Wert: getLiveFieldValue('firstName', config?.userDataFields?.firstName) },
                    "Tel": { Kategorie: "Formular", Wert: getLiveFieldValue('phone', config?.userDataFields?.phone) }
                };

                console.log("%c🔥 TrackingHub V7.13 (Proactive Master) SSOT-Debugger", "color: #ff9800; font-size: 16px; font-weight: bold;");
                console.table(debugData);
            }

            renderConsoleTable();
            document.addEventListener('click', () => setTimeout(renderConsoleTable, 600)); 
            document.addEventListener('input', () => setTimeout(renderConsoleTable, 600)); 
        }

        function initFetchCheckWarning() {
            if (urlParams.get('fetch_check') !== 'true') return;
            console.warn('%c⚠️ ACHTUNG: Fetch-Testmodus aktiv (fetch_check=true). Das reguläre GTM-Tracking ist blockiert und die Daten werden als direktes Fallback an den Server gesendet.', 'color: #ffffff; background-color: #d32f2f; font-size: 14px; font-weight: bold; padding: 4px; border-radius: 2px;');
        }

        initLiveDebugger();
        initFetchCheckWarning();

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
                'th_tracking_data_lead_id': thubData.lead_id,
                'th_tracking_data_user_agent': navigator.userAgent,
                'th_tracking_data_page_url': thubData.page_url,
                'th_tracking_data_fbc': thubData.fbc,
                'th_tracking_data_fbp': thubData.fbp,
                'th_tracking_data_gclid': thubData.gclid,
                'th_tracking_data_wbraid': thubData.wbraid,
                'th_tracking_data_gbraid': thubData.gbraid,
                'th_tracking_data_thub_ad_id': thubData.thub_ad_id
            };
            pushOrFetch(basePayload);
        }

        if (pageEvents.matchedTypEvent) {
            const eventName = pageEvents.matchedTypEvent;
            const tempData = getTempUserData();
            
            if (tempData.email && tempData.email.trim() !== "") {
                const typPayload = {
                    'event': eventName, 
                    'event_name': eventName, 
                    'event_time': Math.floor(Date.now() / 1000), 
                    'action_source': 'website',
                    'event_id': generateUUID(), 
                    'th_user_data_email_address': tempData.email,
                    'th_user_data_phone_number': tempData.phone || "",
                    'th_user_data_first_name': tempData.firstName || "",
                    'th_user_data_last_name': tempData.lastName || "",
                    'th_user_data_city': tempData.city || "",
                    'th_user_data_postal_code': tempData.postalCode || "",
                    'th_user_data_country': tempData.country || "",
                    'th_tracking_data_funnel': tempData.funnel || "", 
                    'th_tracking_data_timestamp': Math.floor(Date.now() / 1000),
                    'th_tracking_data_utm_source': thubData.utm_source,
                    'th_tracking_data_thub_ad_id': thubData.thub_ad_id, 
                    'th_tracking_data_lead_id': thubData.lead_id,
                    'th_tracking_data_user_agent': navigator.userAgent,
                    'th_tracking_data_page_url': thubData.page_url,
                    'th_tracking_data_fbc': thubData.fbc,
                    'th_tracking_data_fbp': thubData.fbp,
                    'th_tracking_data_gclid': thubData.gclid,
                    'th_tracking_data_wbraid': thubData.wbraid,
                    'th_tracking_data_gbraid': thubData.gbraid
                };
                pushOrFetch(typPayload);
            }
        }

        function fillAllFields() {
            function fillMultiple(selectorString, value) {
                if (!selectorString || value == null) return;
                const selectors = selectorString.split(',').map(s => s.trim());
                selectors.forEach(s => {
                    if (!s) return;
                    try { 
                        const elements = document.querySelectorAll(s); 
                        elements.forEach(el => safeSetValue(el, value));
                    } catch(e) {}
                });
            }

            if (config.trackingfields.lead_id) fillMultiple(config.trackingfields.lead_id, thubData.lead_id);
            if (config.trackingfields.utm_source) fillMultiple(config.trackingfields.utm_source, thubData.utm_source);
            if (config.trackingfields.utm_medium) fillMultiple(config.trackingfields.utm_medium, thubData.utm_medium);
            if (config.trackingfields.utm_campaign) fillMultiple(config.trackingfields.utm_campaign, thubData.utm_campaign);
            if (config.trackingfields.utm_content) fillMultiple(config.trackingfields.utm_content, thubData.utm_content);
            
            const adIdField = config.trackingfields.thub_ad_id || config.trackingfields.utm_term;
            if (adIdField) fillMultiple(adIdField, thubData.thub_ad_id);

            if (config.trackingfields.page_url) fillMultiple(config.trackingfields.page_url, thubData.page_url);
            if (config.trackingfields.referrerURL) fillMultiple(config.trackingfields.referrerURL, thubData.referrer);
        }

        let count = 0;
        const fbInterval = setInterval(() => {
            count++;
            fillAllFields();
            if (count >= 54) clearInterval(fbInterval);
        }, 225);

        ['focusin', 'click'].forEach(evt => {
            document.addEventListener(evt, (e) => {
                const tag = e.target.tagName;
                if (tag === 'INPUT' || tag === 'FORM' || tag === 'TEXTAREA' || tag === 'SELECT') {
                    setTimeout(fillAllFields, 100);
                }
            });
        });

        function extractUserDataFromForm(form) {
            function getSafeValue(fieldKey, selectorString) {
                if (window.thub_live_cache && window.thub_live_cache[fieldKey] && window.thub_live_cache[fieldKey] !== "") {
                    return window.thub_live_cache[fieldKey];
                }
                
                if (!selectorString) return "";
                const selectors = selectorString.split(',').map(s => s.trim());
                for (let s of selectors) {
                    if (!s) continue;
                    try { 
                        let field = form ? form.querySelector(s) : null;
                        if (field && field.value) return field.value.trim();
                        
                        field = document.querySelector(s);
                        if (field && field.value) return field.value.trim();
                    } catch(e) {}
                }
                return "";
            }
            return {
                email: getSafeValue('email', config.userDataFields.email),
                phone: getSafeValue('phone', config.userDataFields.phone),
                firstName: getSafeValue('firstName', config.userDataFields.firstName),
                lastName: getSafeValue('lastName', config.userDataFields.lastName),
                city: getSafeValue('city', config.userDataFields.city),
                postalCode: getSafeValue('postalCode', config.userDataFields.postalCode),
                country: getSafeValue('country', config.userDataFields.country),
                funnel: getSafeValue('funnel', config.trackingfields.funnel) 
            };
        }

        function handleFormSubmit(form) {
            if (form && form.dataset.thubSubmitted === 'true') return;
            if (form) form.dataset.thubSubmitted = 'true';
            
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
                    'th_tracking_data_utm_source': thubData.utm_source,
                    'th_tracking_data_thub_ad_id': thubData.thub_ad_id,
                    'th_tracking_data_lead_id': thubData.lead_id,
                    'th_tracking_data_user_agent': navigator.userAgent,
                    'th_tracking_data_page_url': thubData.page_url,
                    'th_tracking_data_fbc': thubData.fbc,
                    'th_tracking_data_fbp': thubData.fbp,
                    'th_tracking_data_gclid': thubData.gclid,
                    'th_tracking_data_wbraid': thubData.wbraid,
                    'th_tracking_data_gbraid': thubData.gbraid
                };

                pushOrFetch(payload);
            } else {
                if ((userData.email && userData.email !== "") || (userData.phone && userData.phone !== "") || (userData.firstName && userData.firstName !== "")) {
                    saveTempUserData(userData);
                }
            }
        }

        let jqRetries = 0;
        function initTrackingHubTracking() {
            if (typeof jQuery !== 'undefined') {
                jQuery(document).on('submit_success', function(event, response) {
                    handleFormSubmit(event.target);
                });
            } else if (jqRetries < 50) {
                jqRetries++;
                setTimeout(initTrackingHubTracking, 100);
            }
        }
        initTrackingHubTracking();

        document.addEventListener('submit', function(event) {
            const form = event.target;
            if (form.checkValidity && !form.checkValidity()) return;

            setTimeout(() => {
                const hasErrors = form ? form.querySelector('[class*="error"], [class*="invalid"], [class*="danger"], .elementor-message-danger') : null;
                if (hasErrors) return;
                handleFormSubmit(form);
            }, 200);
        }, true);

    }, 500);
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    bootTrackingHub();
} else {
    document.addEventListener("DOMContentLoaded", bootTrackingHub);
    window.addEventListener("load", bootTrackingHub);
}
