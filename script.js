
const $ = (id) => document.getElementById(id);


// Safely show text without interpreting it as HTML
function showText(container, text) {
  const p = document.createElement("p");
  p.textContent = text;
  container.replaceChildren(p);
  container.hidden = false;
}


// 1. Basic health guidance demo
const healthForm = $("healthForm");
const healthResult = $("healthResult");
const messageInput = $("message");
const sendBtn = $("sendBtn");

healthForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  const symptom = $("symptom").value;
  const age = $("age").value;

  if (!message) {
    showText(healthResult, "Please describe your health concern.");
    return;
  }

  const text = (message + " " + symptom).toLowerCase();

  let heading = "General health information";
  let advice =
    "Your concern cannot be assessed reliably from this information alone. " +
    "Consider contacting a qualified healthcare professional for personalised advice, " +
    "especially if symptoms persist or worsen.";

  const emergencyWords = [
    "chest pain", "can't breathe", "cannot breathe",
    "difficulty breathing", "unconscious", "severe bleeding",
    "saans nahi aa", "behosh"
  ];

  if (emergencyWords.some(word => text.includes(word))) {
    heading = "Urgent medical attention";
    advice =
      "These symptoms may indicate a medical emergency. Contact local emergency " +
      "services or go to the nearest emergency department now. Ask someone nearby " +
      "to help. Do not wait for online guidance.";
  } else if (symptom === "fever" || text.includes("fever") ||
             text.includes("bukhar")) {
    heading = "Fever: general guidance";
    advice =
      "Rest, drink fluids if you can, and monitor how you feel. Fever can have " +
      "different causes, and this tool cannot determine the cause. Seek medical " +
      "advice if it persists, worsens, or concerns you. For a young child or " +
      "any severe symptoms, seek prompt professional care.";
  } else if (symptom === "cough" || text.includes("cough") ||
             text.includes("khansi")) {
    heading = "Cough: general guidance";
    advice =
      "Rest and drink fluids if appropriate. Avoid smoke and other irritants. " +
      "A cough can have many causes, so consult a healthcare professional if " +
      "it persists or worsens. Breathing difficulty needs urgent medical attention.";
  } else if (symptom === "headache" || text.includes("headache") ||
             text.includes("sir dard")) {
    heading = "Headache: general guidance";
    advice =
      "Consider resting in a quiet environment and drinking water if you can. " +
      "Seek professional advice if the headache persists or keeps returning. " +
      "A sudden, severe headache or headache with confusion or weakness requires urgent care.";
  } else if (symptom === "stomach" || text.includes("stomach") ||
             text.includes("pet dard")) {
    heading = "Stomach discomfort: general guidance";
    advice =
      "Stomach discomfort can have many causes. Avoid assuming a diagnosis and " +
      "seek professional advice if it persists or worsens. Severe pain, repeated " +
      "vomiting, fainting, or blood in vomit or stool needs urgent assessment.";
  } else if (symptom === "weakness" || text.includes("weakness") ||
             text.includes("fatigue")) {
    heading = "Weakness: general guidance";
    advice =
      "Rest when needed and maintain regular meals and fluids if you can. " +
      "Weakness has many possible causes. Arrange a medical assessment if it " +
      "persists or affects everyday activities. Sudden weakness needs urgent care.";
  } else if (symptom === "skin") {
    heading = "Skin concern: general guidance";
    advice =
      "Avoid applying unknown products or sharing personal towels. A clinician " +
      "can help assess the cause. Seek prompt care for rapidly spreading redness, " +
      "significant swelling, fever, or a severe allergic reaction.";
  }

  // Age is collected as context but is not used to diagnose or calculate risk.
  const result = document.createElement("div");
  result.appendChild(document.createElement("h3")).textContent = heading;

  const ageNote = age
    ? "Age group: " + $("age").selectedOptions[0].textContent + ". "
    : "";

  result.appendChild(document.createElement("p")).textContent = ageNote + advice;

  const note = document.createElement("p");
  note.className = "small";
  note.textContent =
    "This is rule-based demo guidance, not an AI diagnosis or a prescription.";
  result.appendChild(note);

  healthResult.replaceChildren(result);
  healthResult.hidden = false;
});


// 2. Voice input
const voiceBtn = $("voiceBtn");
const voiceStatus = $("voiceStatus");
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceBtn.addEventListener("click", () => {
    voiceStatus.textContent = "Listening... Please speak clearly.";
    voiceBtn.disabled = true;

    try {
      recognition.start();
    } catch {
      voiceStatus.textContent = "Please wait and try again.";
      voiceBtn.disabled = false;
    }
  });

  recognition.onresult = (event) => {
    const spoken = event.results[0][0].transcript;
    messageInput.value =
      (messageInput.value.trim() + " " + spoken).trim();
    voiceStatus.textContent = "Your speech has been added to the text box.";
    messageInput.focus();
  };

  recognition.onerror = () => {
    voiceStatus.textContent =
      "Voice input failed. Check microphone permission and try again.";
  };

  recognition.onend = () => {
    voiceBtn.disabled = false;
  };
} else {
  voiceBtn.disabled = true;
  voiceStatus.textContent =
    "Voice recognition is not supported by this browser.";
}


// 3. Nearby healthcare search using OpenStreetMap
const locationForm = $("locationForm");
const locationInput = $("location");
const facilityResults = $("facilityResults");
const searchBtn = $("searchBtn");

async function searchHealthcare(place) {
  const query = place.trim();

  if (!query) {
    showText(facilityResults, "Please enter a village, town or PIN code.");
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = "Searching...";
  showText(facilityResults, "Searching for mapped healthcare facilities...");

  try {
    const geocodeURL = new URL(
      "https://nominatim.openstreetmap.org/search"
    );
    geocodeURL.searchParams.set("q", query);
    geocodeURL.searchParams.set("format", "jsonv2");
    geocodeURL.searchParams.set("limit", "1");
    geocodeURL.searchParams.set("countrycodes", "in");

    const geoResponse = await fetch(geocodeURL);

    if (!geoResponse.ok) {
      throw new Error("Location service is unavailable.");
    }

    const locations = await geoResponse.json();

    if (!locations.length) {
      throw new Error("Location not found. Try a nearby town or PIN code.");
    }

    const lat = Number(locations[0].lat);
    const lon = Number(locations[0].lon);

    const overpassQuery = `
      [out:json][timeout:20];
      (
        node["amenity"~"^(hospital|clinic|doctors|health_post)$"]
          (around:10000,${lat},${lon});
        way["amenity"~"^(hospital|clinic|doctors|health_post)$"]
          (around:10000,${lat},${lon});
        relation["amenity"~"^(hospital|clinic|doctors|health_post)$"]
          (around:10000,${lat},${lon});
      );
      out center tags;
    `;

    const response = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: new URLSearchParams({ data: overpassQuery })
      }
    );

    if (!response.ok) {
      throw new Error("The healthcare map service is temporarily unavailable.");
    }

    const data = await response.json();
    const facilities = data.elements || [];

    facilityResults.replaceChildren();

    if (!facilities.length) {
      showText(
        facilityResults,
        "No mapped healthcare facilities were found. Try another nearby location or check an official health directory."
      );
      return;
    }

    const title = document.createElement("h3");
    title.textContent = `Found ${facilities.length} mapped facilities`;
    facilityResults.appendChild(title);

    facilities.slice(0, 20).forEach((item) => {
      const tags = item.tags || {};
      const name = tags.name || "Unnamed healthcare facility";
      const type = tags.amenity || "Healthcare facility";

      const itemLat = item.lat ?? item.center?.lat;
      const itemLon = item.lon ?? item.center?.lon;

      const card = document.createElement("article");
      card.className = "facility-card";

      const heading = document.createElement("h3");
      heading.textContent = name;
      card.appendChild(heading);

      const typeText = document.createElement("p");
      typeText.textContent =
        "Type: " + type.replaceAll("_", " ");
      card.appendChild(typeText);

      const address =
        tags["addr:full"] ||
        [
          tags["addr:street"],
          tags["addr:city"] || tags["addr:town"]
        ].filter(Boolean).join(", ");

      if (address) {
        const addressText = document.createElement("p");
        addressText.textContent = "Address: " + address;
        card.appendChild(addressText);
      }

      const phone = tags.phone || tags["contact:phone"];
      if (phone) {
        const phoneText = document.createElement("p");
        phoneText.textContent = "Phone: " + phone;
        card.appendChild(phoneText);
      }

      if (itemLat != null && itemLon != null) {
        const mapLink = document.createElement("a");
        mapLink.href =
          `https://www.openstreetmap.org/?mlat=${itemLat}&mlon=${itemLon}#map=17/${itemLat}/${itemLon}`;
        mapLink.target = "_blank";
        mapLink.rel = "noopener noreferrer";
        mapLink.textContent = "View on map ↗";
        card.appendChild(mapLink);
      }

      facilityResults.appendChild(card);
    });

    const disclaimer = document.createElement("p");
    disclaimer.className = "small muted";
    disclaimer.textContent =
      "Results reflect mapped data, not confirmed availability, opening hours or medical quality. Verify before travelling.";
    facilityResults.appendChild(disclaimer);

  } catch (error) {
    showText(
      facilityResults,
      error.message ||
      "Could not complete the search. Check your internet connection and try again."
    );
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search Nearby Care";
  }
}

locationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchHealthcare(locationInput.value);
});


// 4. Optional current location access
$("currentLocationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showText(
      facilityResults,
      "Location is not supported. Please enter your town or PIN code."
    );
    return;
  }

  showText(facilityResults, "Requesting permission to access your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const url = new URL(
          "https://nominatim.openstreetmap.org/reverse"
        );

        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("lat", latitude);
        url.searchParams.set("lon", longitude);

        const response = await fetch(url);
        if (!response.ok) throw new Error("Could not look up your location.");

        const data = await response.json();
        const address = data.address || {};

        const place = [
          address.village || address.town || address.city ||
          address.suburb || address.county,
          address.state,
          address.postcode
        ].filter(Boolean).join(", ");

        if (!place) throw new Error("Could not identify your area.");

        locationInput.value = place;
        searchHealthcare(place);
      } catch {
        showText(
          facilityResults,
          "Could not determine your area. Please enter your town or PIN code manually."
        );
      }
    },
    () => {
      showText(
        facilityResults,
        "Location permission was denied or unavailable. You can still enter your location manually."
      );
    },
    { timeout: 12000, maximumAge: 60000 }
  );
});
