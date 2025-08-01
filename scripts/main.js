// --- Background Blur Slider ---
const BLUR_KEY = 'userBgBlurV1';
const blurSlider = document.getElementById('blur-slider');
const blurValueLabel = document.getElementById('blur-value');

function setBackgroundBlur(px) {
    const bgElem = document.querySelector('.background');
    if (bgElem) {
        bgElem.style.filter = `blur(${px}px)`;
    }
}

// On page load, set blur from storage or default
let storedBlur = parseInt(localStorage.getItem(BLUR_KEY), 10);
if (isNaN(storedBlur)) storedBlur = 0;
setBackgroundBlur(storedBlur);
if (blurSlider) {
    blurSlider.value = storedBlur;
    blurValueLabel.textContent = storedBlur;
}

if (blurSlider) {
    blurSlider.addEventListener('input', function () {
        const val = parseInt(this.value, 10);
        setBackgroundBlur(val);
        blurValueLabel.textContent = val;
        localStorage.setItem(BLUR_KEY, val);
    });
}

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
        window.location.assign(chatGPTUrl);
    } else {

        // Regex to detect if input looks like a URL
        const isLikelyUrl = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-z]{2,}(\S*)?$/.test(query);

        if (isLikelyUrl) {
            // If no protocol, add http://
            const url = query.startsWith("http://") || query.startsWith("https://")
                ? query
                : "http://" + query;
            window.location.assign(url);
        } else {
            // Otherwise search with Bing
            const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
            window.location.assign(bingUrl);
        }
    }
}

// --- QUICK LINKS SECTION ---

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
            window.location.assign(link.url);
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

/* STOCK SECTION : yahoo API */

const STOCK_SYMBOLS = [
    { symbol: 'AAPL', elemId: 'stock-aapl', label: 'AAPL' },
    { symbol: 'TSLA', elemId: 'stock-tsla', label: 'TSLA' },
    { symbol: 'SPY', elemId: 'stock-spy', label: 'S&P 500' },
    { symbol: 'GOOGL', elemId: 'stock-googl', label: 'GOOGL' },
    { symbol: 'NVDA', elemId: 'stock-nvda', label: 'NVDA' },
    { symbol: 'META', elemId: 'stock-meta', label: 'META' },
    { symbol: 'btc-usd', elemId: 'stock-btc', label: 'BTC/USD' },
];

document.addEventListener("DOMContentLoaded", function () {
    const stockSection = document.getElementById('stock-section');
    if (!stockSection) return;

    STOCK_SYMBOLS.forEach(stock => {
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.id = stock.elemId;

        card.innerHTML = `
      <div class="stock-ticker">${stock.label}</div>
      <div class="stock-price"></div>
    `;
        stockSection.appendChild(card);
    });

    updateStockPricesYahoo(); // initial fetch after DOM load
});

// Helper function to fetch price from Yahoo Finance
async function fetchYahooQuote(symbol) {
    try {
        const url = `https://yahoo-proxy-colour1205s-projects.vercel.app/api/yahoo?symbol=${symbol}`;
        const res = await fetch(url);
        const data = await res.json();
        // Defensive checks for data
        if (!data.chart || !data.chart.result || !data.chart.result[0]) return null;
        const meta = data.chart.result[0].meta;
        // Try to use regularMarketPrice or previousClose as fallback
        let price = meta.regularMarketPrice ?? meta.previousClose ?? null;
        let prevClose = meta.previousClose ?? null;
        if (price == null || prevClose == null) return null;
        // Calculate percent change
        const percentChange = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
        return { price, percentChange };
    } catch {
        return null;
    }
}

// Update all stock cards with latest prices from Yahoo (fetch in parallel)
async function updateStockPricesYahoo() {
    await Promise.all(
        STOCK_SYMBOLS.map(async ({ symbol, elemId }) => {
            const priceElem = document.querySelector(`#${elemId} .stock-price`);
            try {
                const result = await fetchYahooQuote(symbol);
                if (result) {
                    const { price, percentChange } = result;
                    let color = percentChange > 0 ? "#3E9D45" : percentChange < 0 ? "#CA5C5C" : "#444";
                    let sign = percentChange > 0 ? "+" : "";
                    priceElem.innerHTML = `<span style="color:${color};">${price.toFixed(2)} <small>(${sign}${percentChange.toFixed(2)}%)</small></span>`;
                } else {
                    priceElem.textContent = "—";
                }
            } catch {
                priceElem.textContent = "—";
            }
        })
    );
}

// Refresh prices every 60 seconds
setInterval(updateStockPricesYahoo, 60000);


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

// horizontal scroll for stock section
const stockSection = document.getElementById('stock-section');

stockSection.addEventListener('wheel', function (e) {
    // Only handle vertical wheel events
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        // Figure out if we can scroll further
        const atStart = stockSection.scrollLeft === 0;
        const atEnd = Math.ceil(stockSection.scrollLeft + stockSection.clientWidth) >= stockSection.scrollWidth;

        // User is scrolling left (negative delta)
        if (e.deltaY < 0 && !atStart) {
            e.preventDefault();
            stockSection.scrollLeft += e.deltaY;
        }
        // User is scrolling right (positive delta)
        else if (e.deltaY > 0 && !atEnd) {
            e.preventDefault();
            stockSection.scrollLeft += e.deltaY;
        }
        // At edge: do nothing, allow normal page scrolling
    }
    // If horizontal wheel, let browser handle it natively!
}, { passive: false });

/* settings button */

const settingsBtn = document.getElementById('settings-button');
const infoWrapper = document.querySelector('.information-wrapper');
const settingsPanel = document.querySelector('.settings-panel');
const settingsContainer = document.getElementById('settings-container');
const wallpaperBtn = document.getElementById('wallpaper-button');
const wallpaperFileInput = document.getElementById('wallpaper-file-input');
const backgroundWrapper = document.querySelector('.background-wrapper');
const closeBtn = document.getElementById('close-settings-button');

settingsBtn.addEventListener('click', () => {
    const isOpen = settingsContainer.classList.contains('show');

    if (isOpen) {
        closeSettingsPanel();
    } else {
        showSettingsPanel();
    }
});

closeBtn.addEventListener('click', () => {
    closeSettingsPanel();
});

function closeSettingsPanel() {
    settingsPanel.classList.remove('show');
    infoWrapper.classList.remove('scaled');
    settingsContainer.classList.add('close');
    settingsContainer.classList.remove('show');
    backgroundWrapper.classList.remove('scaled');
    setTimeout(() => {
        settingsContainer.classList.remove('close');
    }, 900); // Match the CSS transition duration
}
function showSettingsPanel() {
    if (settingsContainer.classList.contains('close')) {
        settingsContainer.classList.remove('close');
    }
    backgroundWrapper.classList.add('scaled');
    settingsContainer.classList.add('show');
    infoWrapper.classList.add('scaled');
    settingsPanel.classList.add('show');
}

// Wallpaper change logic
const WALLPAPER_KEY = 'userWallpaperV1';

// Helper to set background image
function setBackgroundImage(imageDataUrl) {
    // .background is the element for wallpaper
    const bgElem = document.querySelector('.background');
    if (bgElem) {
        bgElem.style.backgroundImage = imageDataUrl ? `url('${imageDataUrl}')` : '';
    }
}

// On page load, check for stored wallpaper
const storedWallpaper = localStorage.getItem(WALLPAPER_KEY);
if (storedWallpaper) {
    setBackgroundImage(storedWallpaper);
}

// Button click opens file selector
wallpaperBtn.addEventListener('click', () => {
    wallpaperFileInput.value = '';
    wallpaperFileInput.click();
});

// When file selected, read and set as background
wallpaperFileInput.addEventListener('change', function () {
    const file = this.files && this.files[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = function (e) {
        img.src = e.target.result;
    };

    img.onload = function () {
        const MAX_WIDTH = window.innerWidth * window.devicePixelRatio;
        const MAX_HEIGHT = window.innerHeight * window.devicePixelRatio;
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const aspectRatio = width / height;
            if (width > height) {
                width = MAX_WIDTH;
                height = Math.round(MAX_WIDTH / aspectRatio);
            } else {
                height = MAX_HEIGHT;
                width = Math.round(MAX_HEIGHT * aspectRatio);
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try JPEG first (compressed)
        let dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        let sizeMB = (dataUrl.length * 2) / 1024 / 1024;
        console.log(`JPEG size: ${sizeMB.toFixed(2)} MB`);

        if (sizeMB > 2) {
            // Try PNG fallback (may be larger or smaller depending on image)
            dataUrl = canvas.toDataURL('image/png');
            sizeMB = (dataUrl.length * 2) / 1024 / 1024;
            console.log(`PNG fallback size: ${sizeMB.toFixed(2)} MB`);
        }

        if (sizeMB > 2) {
            alert('Image size too large, might not be cached properly');
        }

        setBackgroundImage(dataUrl);
        localStorage.setItem(WALLPAPER_KEY, dataUrl);
    };

    reader.readAsDataURL(file);
});


/* light dark theme switch */
// Get the link element
const themeLink = document.getElementById('theme-style');

function setThemeBySystem() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    themeLink.href = prefersDark ? 'styles/dark.css' : 'styles/light.css';
}

// Initial check
setThemeBySystem();

// Listen for changes in system theme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setThemeBySystem);