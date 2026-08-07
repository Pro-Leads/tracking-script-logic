<script>
    // TrackingHub Konfiguration global speichern
    window.TrackingHubLeadConfig = {
        serverEndpoint: "https://sst.vabusinessacademy.de/lead-data",
        cLead: "form:/capi-facebook, form:/webinar/6-schritte-zu-mehr-leads, form:/youtube-ads-guide",
	    cSchedule: "typ:/typ-blueprint-vsl",
        cPurchase: "typ:/danke",
        negativPV: "/impressum, /datenschutz",
        trackingfields: {
            lead_id: "form-field-thub_lead_id",
			funnel: "form-field-thub_funnel"
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
