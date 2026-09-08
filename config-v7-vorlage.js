<script>
    window.TrackingHubLeadConfig = {
        serverEndpoint: "https://sst.deinedomain.de/id", 
        
        cLead: "typ:/danke, form:/optin",
        cSchedule: "typ:/termin-bestaetigung",
        cPurchase: "typ:/kauf-erfolgreich",
        negativPV: "/impressum, /datenschutzerklaerung, /karriere",

        trackingfields: {
            lead_id: "input[name='lead_id'], .lead-id-field",
            utm_source: "input[name='utm_source']",
            utm_medium: "input[name='utm_medium']",
            utm_campaign: "input[name='utm_campaign']",
            utm_content: "input[name='utm_content']",
            utm_term: "input[name='utm_term']", 
            thub_ad_id: "input[name='thub_ad_id']", // utm_term fungiert als Fallback
            page_url: "input[name='page_url']",
            referrerURL: "input[name='referrerURL']",
            funnel: "input[name='funnel'], .funnel-name" // Wird für Payload ausgelesen
        },
        userDataFields: {
            email: "input[type='email'], input[placeholder*='E-Mail'], #form_field-email, .email-adresse",
            phone: "input[type='tel'], input[placeholder*='Handy']",
            firstName: "input[autocomplete='given-name'], input[name='first_name']",
            lastName: "input[autocomplete='family-name'], input[name='last_name']",
            city: "input[name='city']",
            postalCode: "input[name='zip'], input[name='postal_code']",
            country: "input[name='country']"
        }
    };
</script>
