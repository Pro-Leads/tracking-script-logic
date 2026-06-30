<script>
    // TrackingHub Konfiguration global speichern
    window.TrackingHubLeadConfig = {
        cookieName: "thub_lead_id", 
        eventName: "sst_form_submitted", 
        serverEndpoint: "https://sst.vabusinessacademy.de/lead-data",
        trackingfields: {
            lead_id: "form-field-thub_lead_id",
            utm_source: "form-field-utm_source",
            utm_medium: "form-field-utm_medium",
            utm_campaign: "form-field-utm_campaign",
            utm_content: "form-field-utm_content",
            utm_term: "form-field-utm_term"
        },
        userDataFields: {
            email: "form-field-email",
            phone: "form-field-telefon",
            firstName: "form-field-vorname",
            lastName: "form-field-nachname",
            city: "form-field-stadt",
            postalCode: "form-field-plz",
            country: "form-field-land"
        }
    };
</script>
