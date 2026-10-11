
/* 1. API KEY */
const API_KEY = "22004b5b514a524ee0665419070813bd";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

/* 2. HTML ELEMENTS */
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const statusMessage = document.getElementById("statusMessage");

const weatherSection = document.getElementById("weatherSection");
const hourlySection = document.getElementById("hourlySection");
const dailySection = document.getElementById("dailySection");

const recentSearches = document.getElementById("recentSearches");
const clearHistory = document.getElementById("clearHistory");
const themeToggle = document.getElementById("themeToggle");

/* 3. STATUS MESSAGE */
function showStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = "status";

    if (type) {
        statusMessage.classList.add(type);
    }
}

/* 4. STORAGE HELPERS */
function readCities() {
    try {
        const cities = JSON.parse(
            localStorage.getItem("atmosphere-cities") || "[]"
        );

        return Array.isArray(cities) ? cities : [];
    } catch {
        return [];
    }
}

function saveCities(cities) {
    try {
        localStorage.setItem("atmosphere-cities", JSON.stringify(cities));
    } catch {
        // Weather feature will still work if storage is unavailable.
    }
}

/* 5. TIME AND ICON HELPERS */
function cityDate(unixTime, offset) {
    return new Date((unixTime + offset) * 1000);
}

function formatTime(unixTime, offset) {
    return cityDate(unixTime, offset).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC"
    });
}

function formatDay(unixTime, offset) {
    return cityDate(unixTime, offset).toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC"
    });
}

function formatDateKey(unixTime, offset) {
    const date = cityDate(unixTime, offset);

    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0")
    ].join("-");
}

function iconURL(code) {
    return `https://openweathermap.org/img/wn/${code}@2x.png`;
}

/* 6. FETCH CURRENT WEATHER AND FORECAST */
async function fetchWeather(city) {
    const currentURL =
        `${BASE_URL}/weather?q=${encodeURIComponent(city)}` +
        `&appid=${API_KEY}&units=metric`;

    const forecastURL =
        `${BASE_URL}/forecast?q=${encodeURIComponent(city)}` +
        `&appid=${API_KEY}&units=metric`;

    const [currentResponse, forecastResponse] = await Promise.all([
        fetch(currentURL),
        fetch(forecastURL)
    ]);

    const current = await currentResponse.json();
    const forecast = await forecastResponse.json();

    if (!currentResponse.ok) {
        throw new Error(current.message || "Unable to get weather.");
    }

    if (!forecastResponse.ok) {
        throw new Error(forecast.message || "Unable to get forecast.");
    }

    return { current, forecast };
}

/* 7. SEARCH CITY */
async function getWeather(city) {
    city = city.trim();

    if (!city) {
        showStatus("Please enter a city name.", "error");
        return;
    }

    if (
        !API_KEY ||
        API_KEY === "YOUR_OPENWEATHERMAP_API_KEY"
    ) {
        showStatus("Please add your OpenWeatherMap API key in script.js.", "error");
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Loading...";
    showStatus(`Getting weather for ${city}...`);

    try {
        const result = await fetchWeather(city);

        displayCurrent(result.current);
        displayHourly(result.forecast);
        displayDaily(result.forecast);

        weatherSection.classList.remove("hidden");
        hourlySection.classList.remove("hidden");
        dailySection.classList.remove("hidden");

        saveRecentCity(result.current.name, result.current.sys.country);

        showStatus(
            `Weather updated for ${result.current.name}.`,
            "success"
        );
    } catch (error) {
        console.error("Weather error:", error);

        let message = error.message;

        if (error instanceof TypeError) {
            message = "Network error. Check your internet connection.";
        } else if (message === "city not found") {
            message = "City not found. Please check the spelling.";
        } else if (message === "invalid api key") {
            message = "Invalid API key. Please check your key.";
        } else if (message === "401") {
            message = "API key rejected. Check that your key is active.";
        }

        showStatus(message, "error");
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Search →";
    }
}

/* 8. DISPLAY CURRENT WEATHER */
function displayCurrent(data) {
    const offset = data.timezone || 0;
    const weather = data.weather[0];

    document.getElementById("cityName").textContent =
        `${data.name}, ${data.sys.country}`;

    document.getElementById("localTime").textContent =
        `${formatTime(Date.now() / 1000, offset)} local time`;

    document.getElementById("temperature").textContent =
        Math.round(data.main.temp);

    document.getElementById("feelsLike").textContent =
        `${Math.round(data.main.feels_like)}°C`;

    document.getElementById("description").textContent =
        weather.description;

    const icon = document.getElementById("weatherIcon");
    icon.src = iconURL(weather.icon);
    icon.alt = weather.description;

    document.getElementById("humidity").textContent =
        `${data.main.humidity}%`;

    // API wind speed is m/s; convert to km/h.
    document.getElementById("windSpeed").textContent =
        `${(data.wind.speed * 3.6).toFixed(1)} km/h`;

    document.getElementById("visibility").textContent =
        data.visibility != null
            ? `${(data.visibility / 1000).toFixed(1)} km`
            : "N/A";

    document.getElementById("pressure").textContent =
        `${data.main.pressure} hPa`;
}

/* 9. DISPLAY HOURLY FORECAST */
function displayHourly(data) {
    const container = document.getElementById("hourlyForecast");
    const offset = data.city.timezone || 0;

    container.replaceChildren();

    // The API provides forecast entries every 3 hours.
    data.list.slice(0, 6).forEach((item) => {
        const card = document.createElement("article");
        card.className = "hour-card";

        const time = document.createElement("p");
        time.textContent = formatTime(item.dt, offset);

        const icon = document.createElement("img");
        icon.src = iconURL(item.weather[0].icon);
        icon.alt = item.weather[0].description;
        icon.loading = "lazy";

        const temperature = document.createElement("strong");
        temperature.textContent = `${Math.round(item.main.temp)}°`;

        const description = document.createElement("p");
        description.className = "hour-desc";
        description.textContent = item.weather[0].description;

        card.append(time, icon, temperature, description);
        container.appendChild(card);
    });
}

/* 10. DISPLAY FIVE-DAY FORECAST */
function displayDaily(data) {
    const container = document.getElementById("dailyForecast");
    const offset = data.city.timezone || 0;
    const groupedDays = new Map();

    container.replaceChildren();

    data.list.forEach((item) => {
        const key = formatDateKey(item.dt, offset);

        if (!groupedDays.has(key)) {
            groupedDays.set(key, []);
        }

        groupedDays.get(key).push(item);
    });

    const todayKey = formatDateKey(Date.now() / 1000, offset);

    const futureDays = [...groupedDays.entries()]
        .filter(([key]) => key !== todayKey)
        .slice(0, 5);

    futureDays.forEach(([key, entries]) => {
        // Prefer an entry close to midday.
        const representative = entries.find((item) => {
            const hour = cityDate(item.dt, offset).getUTCHours();
            return hour >= 11 && hour <= 14;
        }) || entries[Math.floor(entries.length / 2)];

        const lowest = Math.min(
            ...entries.map((item) => item.main.temp_min)
        );

        const highest = Math.max(
            ...entries.map((item) => item.main.temp_max)
        );

        const row = document.createElement("article");
        row.className = "daily-row";

        const day = document.createElement("div");
        day.className = "daily-day";
        day.textContent = formatDay(representative.dt, offset);

        const condition = document.createElement("div");
        condition.className = "daily-condition";

        const icon = document.createElement("img");
        icon.src = iconURL(representative.weather[0].icon);
        icon.alt = representative.weather[0].description;
        icon.loading = "lazy";

        const description = document.createElement("span");
        description.textContent = representative.weather[0].description;

        condition.append(icon, description);

        const humidity = document.createElement("div");
        humidity.className = "daily-humidity";
        humidity.textContent = `💧 ${representative.main.humidity}%`;

        const range = document.createElement("div");
        range.className = "daily-range";

        const high = document.createElement("strong");
        high.textContent = `${Math.round(highest)}°`;

        const low = document.createElement("span");
        low.textContent = `${Math.round(lowest)}°`;

        range.append(high, low);
        row.append(day, condition, humidity, range);
        container.appendChild(row);
    });
}

/* 11. RECENT SEARCHES */
function saveRecentCity(city, country) {
    const label = `${city}, ${country}`;
    let cities = readCities();

    cities = cities.filter((item) => item.label !== label);
    cities.unshift({ label, query: city });
    cities = cities.slice(0, 6);

    saveCities(cities);
    renderRecentCities();
}

function renderRecentCities() {
    const cities = readCities();

    recentSearches.replaceChildren();

    if (cities.length === 0) {
        const message = document.createElement("p");
        message.className = "muted";
        message.textContent = "Your searched cities will appear here.";
        recentSearches.appendChild(message);
        return;
    }

    cities.forEach((city) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "recent-chip";

        const pin = document.createElement("span");
        pin.className = "recent-pin";
        pin.textContent = "📍";

        const label = document.createElement("span");
        label.textContent = city.label;

        button.append(pin, label);

        button.addEventListener("click", () => {
            cityInput.value = city.query;
            getWeather(city.query);
        });

        recentSearches.appendChild(button);
    });
}

clearHistory.addEventListener("click", () => {
    saveCities([]);
    renderRecentCities();
    showStatus("Recent searches cleared.");
});

/* 12. SEARCH FORM */
searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    getWeather(cityInput.value);
});

/* 13. DARK AND LIGHT MODE */
function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");

    themeToggle.textContent = theme === "light" ? "🌙" : "☀️";

    themeToggle.setAttribute(
        "aria-label",
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
    );
}

function loadTheme() {
    try {
        return localStorage.getItem("atmosphere-theme") || "dark";
    } catch {
        return "dark";
    }
}

applyTheme(loadTheme());

themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("light")
        ? "dark"
        : "light";

    try {
        localStorage.setItem("atmosphere-theme", nextTheme);
    } catch {
        // Theme still changes for the current page.
    }

    applyTheme(nextTheme);
});

/* 14. INITIAL SETUP */
renderRecentCities();
