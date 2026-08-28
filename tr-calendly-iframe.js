// /wp-content/uploads/customer-scripts/kalender-iframe.js
document.addEventListener("DOMContentLoaded", function() {
    // 1. Konfiguration abrufen (mit Fallback, falls sie fehlt)
    const config = window.calendlyIframeConfig || {};
    const baseUrl = config.baseUrl || "";
    const styles = config.styles || {};

    if (!baseUrl) {
        console.error("Keine Base-URL für das iframe konfiguriert.");
        return;
    }

    // 2. URL Parameter & Cookies auslesen
    const urlParams = new URLSearchParams(window.location.search);

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    let utmTerm = urlParams.get("utm_term");
    if (!utmTerm) {
        utmTerm = getCookie("thub_lead_id");
    }

    // 3. Neue URL zusammenbauen
    const iframeParams = new URLSearchParams();
    const standardUtms = ["utm_source", "utm_campaign", "utm_medium", "utm_content"];

    standardUtms.forEach(param => {
        if (urlParams.has(param)) {
            iframeParams.set(param, urlParams.get(param));
        }
    });

    if (utmTerm) {
        iframeParams.set("utm_term", utmTerm);
    }

    const queryString = iframeParams.toString();
    
    // 4. Weiche für das Fragezeichen
    const separator = baseUrl.includes("?") ? "&" : "?";
    const finalIframeUrl = baseUrl + (queryString ? separator + queryString : "");

    // 5. iframe erstellen
    const iframe = document.createElement("iframe");
    iframe.src = finalIframeUrl;

    // 6. Styles aus der Konfiguration dynamisch anwenden
    for (const [property, value] of Object.entries(styles)) {
        iframe.style[property] = value;
    }

    // 7. Ins DOM einfügen
    const targetContainer = document.getElementById("calendly-iframe-leadid");
    if (targetContainer) {
        targetContainer.appendChild(iframe);
    } else {
        console.error("Der Container 'calendly-iframe-leadid' wurde nicht gefunden.");
    }
});
