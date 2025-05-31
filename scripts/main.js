function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false  // 24-hour format
    });
    document.getElementById('clock').textContent = time;
}

setInterval(updateClock, 1000);
updateClock();

let aiMode = false;

const aiButton = document.getElementById("toggle-ai");
const searchInput = document.getElementById("search-input");
const sendButton = document.getElementById("send-button");

aiButton.addEventListener("click", () => {
    aiMode = !aiMode;
    aiButton.classList.toggle("active", aiMode);
    searchInput.placeholder = aiMode ? "How can I help you?" : "Hi, where to?";
    searchInput.classList.toggle("ai-mode", aiMode);
});

sendButton.addEventListener("click", () => {
    sendAction();
});

searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        sendAction();
    }
});

function sendAction() {
    const query = searchInput.value.trim();
    if (!query) return;

    if (aiMode) {
        const chatGPTUrl = `https://chat.openai.com/?model=gpt-4&prompt=${encodeURIComponent(query)}`;
        window.open(chatGPTUrl, "_blank");
    } else {

        // Regex to detect if input looks like a URL
        const isLikelyUrl = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-z]{2,}(\S*)?$/.test(query);

        if (isLikelyUrl) {
            // If no protocol, add http://
            const url = query.startsWith("http://") || query.startsWith("https://")
                ? query
                : "http://" + query;
            window.open(url, "_blank");
        } else {
            // Otherwise search with Bing
            const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
            window.open(bingUrl, "_blank");
        }
    }
}

// --- QUICK LINKS LOGIC ---

const quickLinksSection = document.getElementById('quick-links-section');
const QUICK_LINKS_KEY = 'userQuickLinksV1';

const DEFAULT_QUICK_LINKS = [
    {
        name: "YouTube",
        url: "https://www.youtube.com",
        faviconUrl: "https://www.google.com/s2/favicons?sz=128&domain_url=youtube.com"
    },
    {
        name: "Instagram",
        url: "https://www.instagram.com",
        faviconUrl: "https://www.google.com/s2/favicons?sz=128&domain_url=instagram.com"
    },
    {
        name: "Reddit",
        url: "https://www.reddit.com",
        faviconUrl: "https://www.google.com/s2/favicons?sz=128&domain_url=reddit.com"
    },
    {
        name: "Discord",
        url: "https://discord.com",
        faviconUrl: "https://www.google.com/s2/favicons?sz=128&domain_url=discord.com"
    },
    {
        name: "Amazon",
        url: "https://www.amazon.ca",
        faviconUrl: "https://www.google.com/s2/favicons?sz=128&domain_url=amazon.ca"
    },
    {
        name: "Bilibili",
        url: "https://www.bilibili.com",
        faviconUrl: "https://www.google.com/s2/favicons?sz=128&domain_url=bilibili.com"
    },
    {
        name: "uaena.io",
        url: "https://uaena.io",
        faviconUrl: "/assets/images/favicon.ico"
    }
];

function getStoredQuickLinks() {
    try {
        const stored = JSON.parse(localStorage.getItem(QUICK_LINKS_KEY));
        if (stored && Array.isArray(stored)) return stored;
        return null;
    } catch {
        return null;
    }
}
function storeQuickLinks(links) {
    localStorage.setItem(QUICK_LINKS_KEY, JSON.stringify(links));
}

// Set defaults only if first time (or storage is empty/corrupted)
if (!getStoredQuickLinks()) {
    storeQuickLinks(DEFAULT_QUICK_LINKS);
}

function renderQuickLinks() {
    let links = getStoredQuickLinks();
    let minVisible = Math.max(links.length, 8);
    quickLinksSection.innerHTML = '';

    links.forEach((link, idx) => {
        quickLinksSection.appendChild(createQuickLinkElement(link, idx));
    });

    // For grid min 4 columns x 2 rows = 8, pad with empty placeholders (hidden but preserve grid structure)
    for (let i = links.length; i < minVisible; i++) {
        let div = document.createElement('div');
        div.style.visibility = 'hidden';
        div.style.height = '58px';
        quickLinksSection.appendChild(div);
    }
}

function createQuickLinkElement(link, idx) {
    let div = document.createElement('div');
    div.className = 'quick-link';
    div.tabIndex = 0;

    // ICON
    let icon = document.createElement('div');
    icon.className = 'quick-link-icon';
    if (link.faviconUrl) {
        let img = document.createElement('img');
        img.src = link.faviconUrl;
        img.alt = link.name[0];
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '33%';
        icon.appendChild(img);
    } else {
        icon.textContent = link.name[0].toUpperCase();
    }

    // LABEL
    let label = document.createElement('div');
    label.className = 'quick-link-label';
    label.textContent = link.name;

    div.appendChild(icon);
    div.appendChild(label);

    // Go to link on click
    div.addEventListener('click', e => {
        if (!div.classList.contains('show-context')) {
            window.open(link.url, '_blank');
        }
    });

    return div;
}

// Unified context menu logic: right-click on quick-link = menu for that link, empty = add menu
quickLinksSection.addEventListener('contextmenu', function (e) {
    // Ctrl+RightClick shortcut: always add quick link
    if (e.ctrlKey) {
        e.preventDefault();
        closeAllContexts();
        addQuickLinkPrompt();
        return;
    }

    closeAllContexts();
    const quickLink = e.target.closest('.quick-link');
    e.preventDefault();

    if (quickLink) {
        // Find index of the clicked quick link (skip placeholders)
        const allQuickLinks = Array.from(quickLinksSection.children).filter(x => x.classList && x.classList.contains('quick-link'));
        const idx = allQuickLinks.indexOf(quickLink);
        showQuickLinkContextMenu(idx, e, false);
    } else {
        showQuickLinkContextMenu(null, e, true);
    }
});

function showQuickLinkContextMenu(idx, e, isEmptyArea = false) {
    closeAllContexts(); // Remove any old menus

    const menu = document.createElement('div');
    menu.className = 'quick-link-context show';
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';
    menu.style.top = `${e.clientY}px`;
    menu.style.left = `${e.clientX}px`;

    // Add appropriate buttons
    if (isEmptyArea) {
        // Only "Add Quick Link" when right-clicking empty area
        const addBtn = document.createElement('button');
        addBtn.textContent = 'New Quick Link';
        addBtn.onclick = (ev) => {
            ev.stopPropagation();
            closeAllContexts();
            addQuickLinkPrompt();
        };
        menu.appendChild(addBtn);
    } else {
        // "Edit Quick Link" + "Remove This Link" for quick link item
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.onclick = (ev) => {
            ev.stopPropagation();
            closeAllContexts();
            editQuickLinkPrompt(idx);
        };
        menu.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Delete';
        removeBtn.onclick = (ev) => {
            ev.stopPropagation();
            let links = getStoredQuickLinks();
            links.splice(idx, 1);
            storeQuickLinks(links);
            closeAllContexts();
            renderQuickLinks();
        };
        menu.appendChild(removeBtn);
    }

    document.body.appendChild(menu);

    setTimeout(() => {
        document.addEventListener('click', closeAllContexts, { once: true });
    }, 0);
}

function closeAllContexts() {
    document.querySelectorAll('.quick-link-context').forEach(ctx => ctx.remove());
    document.querySelectorAll('.quick-link.show-context').forEach(el => el.classList.remove('show-context'));
}

// Edit quick link flow
async function editQuickLinkPrompt(idx) {
    let links = getStoredQuickLinks();
    let current = links[idx];
    let url = prompt('Enter new URL:', current.url);
    if (!url) return;
    url = url.trim();
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;

    try {
        let name = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
        let faviconUrl = await fetchFavicon(url);
        let dataUrl = await fetchAndCacheFavicon(faviconUrl);
        links[idx] = { url, name: capitalize(name), faviconUrl: dataUrl || faviconUrl };
        storeQuickLinks(links);
        renderQuickLinks();
    } catch {
        alert('Invalid URL.');
    }
}


// Add quick link flow
async function addQuickLinkPrompt() {
    let url = prompt('Enter URL: ');
    if (!url) return;
    url = url.trim();
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    try {
        let name = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
        let faviconUrl = await fetchFavicon(url);
        let dataUrl = await fetchAndCacheFavicon(faviconUrl);
        let newLink = { url, name: capitalize(name), faviconUrl: dataUrl || faviconUrl };
        let links = getStoredQuickLinks();
        links.push(newLink);
        storeQuickLinks(links);
        renderQuickLinks();
    } catch {
        alert('Invalid URL.');
    }
}


// Try to get favicon, else null
async function fetchFavicon(url) {
    let { origin, hostname } = new URL(url);
    const candidates = [
        `https://www.google.com/s2/favicons?sz=128&domain_url=${hostname}`,
        `${origin}/favicon.ico`,
        `${origin}/favicon.png`,
        `${origin}/assets/favicon.ico`,
        `${origin}/assets/favicon.png`,
        `${origin}/assets/images/favicon.ico`,
        `${origin}/assets/images/favicon.png`,
        `${origin}/static/favicon.ico`,
        `${origin}/static/favicon.png`,
        `${origin}/images/favicon.ico`,
        `${origin}/images/favicon.png`,
        `${origin}/icons/favicon.ico`,
        `${origin}/icons/favicon.png`
    ];
    function imageExists(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(null);
            img.src = src + '?v=' + Date.now();
        });
    }
    for (let candidate of candidates) {
        let result = await imageExists(candidate);
        if (result) return result;
    }
    return null;
}

// New function to fetch and cache favicon as Base64
async function fetchAndCacheFavicon(faviconUrl) {
    const cacheKey = "favicon_" + btoa(faviconUrl);
    let cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
    try {
        const response = await fetch(faviconUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        return await new Promise((resolve) => {
            reader.onloadend = () => {
                localStorage.setItem(cacheKey, reader.result);
                resolve(reader.result);
            };
            reader.readAsDataURL(blob);
        });
    } catch {
        return faviconUrl; // Fallback to URL
    }
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Initialize
renderQuickLinks();

window.addEventListener('resize', renderQuickLinks);

/* stock section */
// Stock prices using Twelve Data API

const AV_API_KEY = 'BKNCBQBE3RO0VAE7';

const STOCK_SYMBOLS = [
    { symbol: 'AAPL', elemId: 'stock-aapl', label: 'AAPL' },
    { symbol: 'TSLA', elemId: 'stock-tsla', label: 'TSLA' },
    { symbol: 'SPY', elemId: 'stock-spy', label: 'S&P 500' }
];

// Cache helpers
function getLastFetchInfo() {
    const s = localStorage.getItem("stockFetchCache");
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
}
function setLastFetchInfo(pricesObj) {
    localStorage.setItem("stockFetchCache", JSON.stringify(pricesObj));
}

// Market open helper (NY time)
function isMarketOpen() {
    const now = new Date();
    const nowNY = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = nowNY.getDay(); // 0=Sun, 6=Sat
    const h = nowNY.getHours(), m = nowNY.getMinutes();
    if (day === 0 || day === 6) return false;
    if (h < 9 || (h === 9 && m < 30)) return false;
    if (h > 16 || (h === 16 && m > 0)) return false;
    return true;
}

// Render function
function renderQuote(symbol, elemId, q) {
    const priceElem = document.querySelector(`#${elemId} .stock-price`);
    if (!q || !priceElem || !q["05. price"]) {
        if (priceElem) priceElem.textContent = "—";
        return;
    }
    const price = parseFloat(q["05. price"]);
    let percentChange = parseFloat((q["10. change percent"] || "0").replace("%", ""));
    let color = percentChange > 0 ? "#16b67b" : percentChange < 0 ? "#e65c54" : "#444";
    let sign = percentChange > 0 ? "+" : "";
    if (isNaN(percentChange)) {
        // fallback: calculate from close/open if possible
        const open = parseFloat(q["02. open"]);
        const prevClose = parseFloat(q["08. previous close"]);
        if (!isNaN(open) && !isNaN(prevClose)) {
            percentChange = ((prevClose - open) / open) * 100;
        } else {
            percentChange = 0;
        }
    }
    if (price && !isNaN(price)) {
        priceElem.innerHTML =
            `<span style="color:${color};">${price.toFixed(2)} <small>(${sign}${percentChange.toFixed(2)}%)</small></span>`;
    } else {
        priceElem.textContent = "—";
    }
}

// Alpha Vantage fetch (per symbol; batch not supported for change %)
async function fetchAlphaVantageQuote(symbol, elemId) {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const q = data["Global Quote"];
        renderQuote(symbol, elemId, q);
    } catch {
        const priceElem = document.querySelector(`#${elemId} .stock-price`);
        if (priceElem) priceElem.textContent = "—";
    }
}

// Main update/caching logic
async function updateStockPrices(force = false) {
    const cache = getLastFetchInfo();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    const marketOpen = isMarketOpen();
    let canFetch = force;

    if (!force && cache) {
        const lastFetch = cache.timestamp || 0;
        const isSameDay = (new Date(lastFetch)).toDateString() === (new Date()).toDateString();
        if (marketOpen) {
            if (now - lastFetch > tenMinutes || !isSameDay) canFetch = true;
        } else {
            if (!cache.marketClosed || !isSameDay) canFetch = true;
        }
    } else {
        canFetch = true;
    }

    // Use cache if fetch not needed
    if (!canFetch && cache && cache.data) {
        STOCK_SYMBOLS.forEach(({ elemId, symbol }) => {
            const cached = cache.data[symbol];
            const priceElem = document.querySelector(`#${elemId} .stock-price`);
            if (priceElem && cached) {
                priceElem.innerHTML = cached;
            } else if (priceElem) {
                priceElem.textContent = "—";
            }
        });
        return;
    }

    // --- Fetch new data
    let dataForCache = {};
    for (const { symbol, elemId } of STOCK_SYMBOLS) {
        await fetchAlphaVantageQuote(symbol, elemId);
        // Save what's rendered
        const priceElem = document.querySelector(`#${elemId} .stock-price`);
        dataForCache[symbol] = priceElem ? priceElem.innerHTML : "—";
    }
    setLastFetchInfo({
        timestamp: Date.now(),
        data: dataForCache,
        marketClosed: !marketOpen
    });
}

updateStockPrices();

/* news section */

const GNEWS_API_KEY = 'b5e186a46d4cb2c489f5671c639fc1b8';
const NEWS_CACHE_KEY = 'news_cache_gnews_v1';
const NEWS_CACHE_TIME = 12 * 60 * 60 * 1000; // 12 hours in ms

async function fetchNewsFromGNews() {
    const url = `https://gnews.io/api/v4/top-headlines?token=${GNEWS_API_KEY}&lang=en&country=us&max=10`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

function cacheNews(data) {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
        data: data,
        timestamp: Date.now()
    }));
}

function getCachedNews() {
    const cached = localStorage.getItem(NEWS_CACHE_KEY);
    if (!cached) return null;
    try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < NEWS_CACHE_TIME) {
            return parsed.data;
        } else {
            // Expired
            return null;
        }
    } catch {
        return null;
    }
}

async function loadNews() {
    const newsSection = document.getElementById('news-section');
    newsSection.innerHTML = '<div class="news-card"><div class="news-title">Loading news...</div></div>';

    let data = getCachedNews();

    if (!data) {
        try {
            data = await fetchNewsFromGNews();
            if (data && data.articles && Array.isArray(data.articles)) {
                cacheNews(data);
            }
        } catch (err) {
            newsSection.innerHTML = '<div class="news-card"><div class="news-title">Failed to load news.</div></div>';
            return;
        }
    }

    if (!data || !data.articles || data.articles.length === 0) {
        newsSection.innerHTML = '<div class="news-card"><div class="news-title">No news available.</div></div>';
        return;
    }

    newsSection.innerHTML = '';
    data.articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'news-card';

        // Only show image if it exists
        const imgHtml = article.image
            ? `<img class="news-image" src="${article.image}" alt="" loading="lazy">`
            : '';

        // truncate description to 120 characters
        let desc = article.description ? article.description.trim() : '';
        if (desc.length > 120) {
            desc = desc.substring(0, 120) + '...';
        }

        card.innerHTML = `
            ${imgHtml}
            <div class="news-title">${article.title ? article.title : ''}</div>
            <div class="news-summary">${desc}</div>
            <a href="${article.url}" target="_blank" style="margin-top: 5px; font-size: 0.93rem; color: #6251c5; text-decoration: none;">Read more</a>
        `;
        newsSection.appendChild(card);
    });
}

// On page load
window.addEventListener('DOMContentLoaded', loadNews);

// Refresh news every 12 hours (refreshes the cache and UI)
setInterval(loadNews, NEWS_CACHE_TIME);