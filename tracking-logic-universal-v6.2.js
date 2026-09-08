// --- V6.2_HYBRID_SMART_ROUTING_MASTER ---

const _thub_frozenSearch = window.location.search;
const _thub_frozenHash = window.location.hash;
const _thub_frozenHref = window.location.href;
const _thub_frozenPathname = window.location.pathname;
const _thub_frozenReferrer = document.referrer || "";

function bootTrackingHub() {
    if (window.thub_initialized) return;
    window.thub_initialized = true;

    console.log("TrackingHub Debug: Skript gebootet (V6.2). Greife auf eingefrorene globale Variablen zu.");

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

    function getAndClearTempUserData() {
        const str = sessionStorage.getItem('thub_temp_userdata');
        if (!str) return {};
        try {
            const item = JSON.parse(str);
            sessionStorage.removeItem('thub_temp_userdata'); 
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

    const standardParams = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    standardParams.forEach(param => {
        const liveVal = getCleanParam(param);
        if (liveVal && liveVal !== "") {
            thubData[param] = liveVal;
            setStorageWithExpiry('thub_' + param, liveVal, storageExpiryMinutes);
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

        const currentPath = _thub_frozenPathname;

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

        function initLiveDebugger() {
            if (urlParams.get('thub-check-value') !== 'true') return;

            function getLiveFieldValue(selectorString) {
                if (!selectorString) return "nicht konfiguriert";
                const selectors = selectorString.split(',').map(s => s.trim());
                
                for (let s of selectors) {
                    if (!s) continue;
                    try { 
                        const fields = document.querySelectorAll(s); 
                        for (let i = 0; i < fields.length; i++) {
                            let val = fields[i].value || fields[i].getAttribute('value');
                            if (val && val.trim() !== "") return val.trim();
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
                    "E-Mail (Live)": { Kategorie: "Formular", Wert: getLiveFieldValue(config?.userDataFields?.email) },
                    "Vorname (Live)": { Kategorie: "Formular", Wert: getLiveFieldValue(config?.userDataFields?.firstName) }
                };

                console.log("%c🔥 TrackingHub V6.2 (Hybrid) SSOT-Debugger", "color: #ff9800; font-size: 16px; font-weight: bold;");
                console.table(debugData);
            }

            renderConsoleTable();
            document.addEventListener('click', () => setTimeout(renderConsoleTable, 600)); 
        }

        initLiveDebugger();

        if (Object.keys(config.trackingfields).length === 0) {
            console.error("TrackingHub Debug: Abbruch der Injection! Konfiguration (trackingfields) nicht gefunden.");
            return;
        }

        function safeSetValue(element, value) {
            if (element && value && element.value !== value) {
                element.value = value;
                element.setAttribute('value', value); 
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        function pushOrFetch(payload) {
            const isTestMode = (urlParams.get('fetch_check') === 'true');
            const isGtmActive = (typeof window.google_tag_manager !== 'undefined' && Object.keys(window.google_tag_manager).length > 0);

            if (isGtmActive && !isTestMode) {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(payload);
            } else {
                if (config.serverEndpoint && config.serverEndpoint.trim() !== "") {
                    if (navigator.sendBeacon) {
                        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                        navigator.sendBeacon(config.serverEndpoint, blob);
                    } else {
                        fetch(config.serverEndpoint, {
                            method: 'POST',
                            keepalive: true,
                            credentials: 'include', 
                            headers: { 'Content-Type': 'text/plain' },
                            body: JSON.stringify(payload)
                        }).catch(function(err) {});
                    }
                }
            }
        }

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
                'event': 'page_view', 'event_name': 'page_view', 'event_time': Math.floor(Date.now() / 1000), 'action_source': 'website',
                'event_id': generateUUID(), 'th_tracking_data_timestamp': Math.floor(Date.now() / 1000),
                'th_tracking_data_lead_id': thubData.lead_id, 'th_tracking_data_user_agent': navigator.userAgent,
                'th_tracking_data_page_url': thubData.page_url, 'th_tracking_data_fbc': thubData.fbc,
                'th_tracking_data_fbp': thubData.fbp, 'th_tracking_data_gclid': thubData.gclid,
                'th_tracking_data_wbraid': thubData.wbraid, 'th_tracking_data_gbraid': thubData.gbraid,
                'th_tracking_data_thub_ad_id': thubData.thub_ad_id
            };
            pushOrFetch(basePayload);
        }

        if (pageEvents.matchedTypEvent) {
            const eventName = pageEvents.matchedTypEvent;
            const hasFired = sessionStorage.getItem('thub_fired_' + eventName);
            
            if (!hasFired) {
                const tempData = getAndClearTempUserData();
                const typPayload = {
                    'event': eventName, 'event_name': eventName, 'event_time': Math.floor(Date.now() / 1000), 'action_source': 'website',
                    'event_id': generateUUID(), 'th_user_data_email_address': tempData.email || "",
                    'th_user_data_phone_number': tempData.phone || "", 'th_user_data_first_name': tempData.firstName || "",
                    'th_user_data_last_name': tempData.lastName || "", 'th_user_data_city': tempData.city || "",
                    'th_user_data_postal_code': tempData.postalCode || "", 'th_user_data_country': tempData.country || "",
                    'th_tracking_data_funnel': tempData.funnel || "", 'th_tracking_data_timestamp': Math.floor(Date.now() / 1000),
                    'th_tracking_data_utm_source': thubData.utm_source, 'th_tracking_data_thub_ad_id': thubData.thub_ad_id, 
                    'th_tracking_data_lead_id': thubData.lead_id, 'th_tracking_data_user_agent': navigator.userAgent,
                    'th_tracking_data_page_url': thubData.page_url, 'th_tracking_data_fbc': thubData.fbc,
                    'th_tracking_data_fbp': thubData.fbp, 'th_tracking_data_gclid': thubData.gclid,
                    'th_tracking_data_wbraid': thubData.wbraid, 'th_tracking_data_gbraid': thubData.gbraid
                };
                pushOrFetch(typPayload);
                sessionStorage.setItem('thub_fired_' + eventName, 'true'); 
            }
        }

        function fillAllFields() {
            function fillMultiple(selectorString, value) {
                if (!selectorString || !value) return;
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
            function getSafeValue(selectorString) {
                if (!selectorString) return "";
                const selectors = selectorString.split(',').map(s => s.trim());
                
                for (let s of selectors) {
                    if (!s) continue;
                    try { 
                        const field = form.querySelector(s); 
                        if (field && field.value) return field.value;
                    } catch(e) {}
                }
                return "";
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
            if (form.dataset.thubSubmitted === 'true') return;
            
            form.dataset.thubSubmitted = 'true';
            const userData = extractUserDataFromForm(form);

            if (pageEvents.matchedFormEvent) {
                const eventName = pageEvents.matchedFormEvent;
                const payload = {
                    'event': eventName, 'event_name': eventName, 'event_time': Math.floor(Date.now() / 1000), 'action_source': 'website',
                    'event_id': generateUUID(), 'th_user_data_email_address': userData.email, 'th_user_data_phone_number': userData.phone,
                    'th_user_data_first_name': userData.firstName, 'th_user_data_last_name': userData.lastName,
                    'th_user_data_city': userData.city, 'th_user_data_postal_code': userData.postalCode,
                    'th_user_data_country': userData.country, 'th_tracking_data_funnel': userData.funnel, 
                    'th_tracking_data_timestamp': Math.floor(Date.now() / 1000), 'th_tracking_data_utm_source': thubData.utm_source,
                    'th_tracking_data_thub_ad_id': thubData.thub_ad_id, 'th_tracking_data_lead_id': thubData.lead_id,
                    'th_tracking_data_user_agent': navigator.userAgent, 'th_tracking_data_page_url': thubData.page_url,
                    'th_tracking_data_fbc': thubData.fbc, 'th_tracking_data_fbp': thubData.fbp,
                    'th_tracking_data_gclid': thubData.gclid, 'th_tracking_data_wbraid': thubData.wbraid,
                    'th_tracking_data_gbraid': thubData.gbraid
                };
                pushOrFetch(payload);
                sessionStorage.setItem('thub_fired_' + eventName, 'true'); 
            } else {
                if (userData.email && userData.email !== "") {
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
                const hasErrors = form.querySelector('[class*="error"], [class*="invalid"], [class*="danger"], .elementor-message-danger');
                if (hasErrors) return;
                handleFormSubmit(form);
            }, 200);
        }, true);

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
