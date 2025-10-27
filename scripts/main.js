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
const ai_chat = document.getElementById("ai-chat");
const search_container = document.querySelector(".search-container");

aiButton.addEventListener("click", () => {
    aiMode = !aiMode;
    aiButton.classList.toggle("active", aiMode);
    searchInput.placeholder = aiMode ? "How can I help you?" : "Hi, where to?";
    searchInput.classList.toggle("ai-mode", aiMode);
    if (search_container.classList.contains("expand"))
        search_container.classList.remove("expand");
    if (ai_chat.style.display == "block")
        ai_chat.style.display = "none";
});

sendButton.addEventListener("click", () => {
    sendAction();
});

searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        sendAction();
    }
});

async function sendAction() {
    const query = searchInput.value.trim();
    if (!query) return;

    if (aiMode) {
        ai_chat.style.display = "block";
        ai_chat.style.textAlign = "center";
        ai_chat.textContent = "Thinking...";
        search_container.classList.add("expand");
        const res = await fetch(`https://myproxy.uaena.io/api?type=ai&input=${encodeURIComponent(query)}`);
        const data = await res.json();
        ai_chat.style.textAlign = "left";
        ai_chat.textContent = data.output_text;
        if (window.renderMathInElement) {
            renderMathInElement(ai_chat, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false
            });
        }
        searchInput.value = "";
        searchInput.placeholder = query;
        //const chatGPTUrl = `https://chat.openai.com/?model=gpt-4&prompt=${encodeURIComponent(query)}`;
        //indow.location.assign(chatGPTUrl);
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
            // Otherwise search with default engine
            window.location.assign(getSearchUrl(query));
        }

        searchInput.value = "";
    }

    searchInput.blur();
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

function expandQuickLinkAndOpen(cardEl, url) {
    // Measure current card position/size
    const rect = cardEl.getBoundingClientRect();

    // Backdrop - fades to white
    const backdrop = document.createElement('div');
    backdrop.className = 'quick-link-backdrop';
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('show'));

    // create a clone
    const expander = document.createElement('div');
    expander.className = 'quick-link-expander center';
    const icon = cardEl.querySelector('.quick-link-icon')?.cloneNode(true);
    const label = cardEl.querySelector('.quick-link-label')?.cloneNode(true);
    const content = document.createElement('div');
    content.className = 'quick-link-content';
    if (icon) content.appendChild(icon);
    if (label) content.appendChild(label);
    expander.appendChild(content);

    // assign at the clicked quick-link position
    Object.assign(expander.style, {
        top: rect.top + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px'
    });

    document.body.appendChild(expander);

    // Next frame: animate to fullscreen
    requestAnimationFrame(() => {
        expander.classList.add('fullscreen');
        Object.assign(expander.style, {
            top: '0px',
            left: '0px',
            width: '100vw',
            height: '100vh',
            borderRadius: '35px',
            boxShadow: 'none',
        });
    });

    // After transition finishes, navigate
    const onEnd = () => {
        expander.removeEventListener('transitionend', onEnd);
        window.location.assign(url)
    };
    expander.addEventListener('transitionend', onEnd, { once: true });
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
    div.addEventListener('click', async e => {
        if (!div.classList.contains('show-context')) {
            expandQuickLinkAndOpen(div, link.url);
        }
    });

    return div;
}

// Global context menu for the entire page
document.addEventListener('contextmenu', function (e) {
    // Ctrl+RightClick shortcut: always add quick link
    if (e.ctrlKey) {
        e.preventDefault();
        closeAllContexts();
        addQuickLinkPrompt();
        return;
    }

    // Check if right-click is on an interactive element that should have its own context menu
    const interactiveElements = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'];
    if (interactiveElements.includes(e.target.tagName) ||
        e.target.closest('input, textarea, select, button, a')) {
        return; // Let the browser handle context menu for form elements and links
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
        /* fall back removed to pass chrome extension inspection */
        // `${origin}/favicon.ico`,
        // `${origin}/favicon.png`,
        // `${origin}/assets/favicon.ico`,
        // `${origin}/assets/favicon.png`,
        // `${origin}/assets/images/favicon.ico`,
        // `${origin}/assets/images/favicon.png`,
        // `${origin}/static/favicon.ico`,
        // `${origin}/static/favicon.png`,
        // `${origin}/images/favicon.ico`,
        // `${origin}/images/favicon.png`,
        // `${origin}/icons/favicon.ico`,
        // `${origin}/icons/favicon.png`
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


/* news section */
const NEWS_CACHE_TIME = 12 * 60 * 60 * 1000; // 12 hours in ms
const NEWS_CACHE_KEY = 'GNEWS_CACHE'

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
            const URL = 'https://myproxy.uaena.io/api?type=news&max=20'
            const res = await fetch(URL)
            data = await res.json();
            cacheNews(data);
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


/* ---- SETTINGS SECTION ---- */

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
}

if (blurSlider) {
    blurSlider.addEventListener('input', function () {
        const val = 50 * Math.pow(parseInt(this.value, 10) / blurSlider.max, 2);

        setBackgroundBlur(val);
        localStorage.setItem(BLUR_KEY, val);
    });
}

// search engine selector
const search_engine_key = "search"
const search_engine_select = document.getElementById("search-engine");
let default_engine = localStorage.getItem(search_engine_key)
if (!default_engine) default_engine = "https://www.bing.com/search?q="
search_engine_select.value = default_engine

search_engine_select.addEventListener("change", function () {
    default_engine = this.value
    localStorage.setItem(search_engine_key, this.value)
});

function getSearchUrl(query) {
    let url = default_engine + `${encodeURIComponent(query)}`
    return url
}


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

/**
 * Converts a Base64 data URL string into a Blob object.
 * This is essential for getting the *actual* file size.
 */
function dataURLtoBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Saves the final compressed wallpaper.
 * (Assumes setBackgroundImage and WALLPAPER_KEY are defined elsewhere)
 */
function saveWallpaper(dataUrl, blob) {
    console.log(`Final wallpaper size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

    // Assuming setBackgroundImage and WALLPAPER_KEY are defined in your script
    setBackgroundImage(dataUrl);
    localStorage.setItem(WALLPAPER_KEY, dataUrl);
}

/**
 * Asynchronously compresses a canvas image to be under 2MB.
 * It first tries lowering JPEG quality, then resorts to resizing.
 */
async function compressAndSetWallpaper(canvas) {
    const TARGET_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    console.log('Compressing wallpaper...');

    let dataUrl = '';
    let blob;

    // --- Strategy 1: Lower JPEG Quality ---
    // Try a few common quality levels first
    const qualityLevels = [1, 0.9, 0.8, 0.7, 0.6];
    for (const quality of qualityLevels) {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        blob = dataURLtoBlob(dataUrl);

        console.log(`Trying quality ${quality}: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

        if (blob.size <= TARGET_SIZE_BYTES) {
            // Success!
            saveWallpaper(dataUrl, blob);
            return;
        }
    }

    // --- Strategy 2: Resize Image ---
    // If quality reduction wasn't enough, we need to resize.
    console.log('Quality reduction not enough, resizing...');

    // We need to draw the *original* (screen-fit) canvas image repeatedly,
    // so we load its content into an Image object first.
    const originalImage = new Image();
    originalImage.src = canvas.toDataURL(); // Get the canvas content as it was passed in

    // We must wait for this image to load before we can draw it
    // This requires an 'await' which is why the function is 'async'
    await new Promise(resolve => { originalImage.onload = resolve; });

    let currentWidth = canvas.width;
    let currentHeight = canvas.height;
    let attempts = 10; // Max 10 resize attempts
    const ctx = canvas.getContext('2d');

    // We start from the last known blob size (at 0.6 quality)
    while (blob.size > TARGET_SIZE_BYTES && attempts > 0) {
        // Reduce dimensions by 10%
        currentWidth *= 0.9;
        currentHeight *= 0.9;

        // Resize canvas
        canvas.width = Math.round(currentWidth);
        canvas.height = Math.round(currentHeight);

        // Draw the *original* screen-fit image onto the *new* smaller canvas
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

        // Generate with a decent quality
        dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        blob = dataURLtoBlob(dataUrl);

        console.log(`Resizing (Attempt ${11 - attempts}): ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        attempts--;
    }

    if (blob.size <= TARGET_SIZE_BYTES) {
        // Success after resizing
        saveWallpaper(dataUrl, blob);
    } else {
        // Failed to compress under 2MB, but we'll use the smallest version we got
        console.error('Could not compress image under 2MB. Saving smallest version.');
        saveWallpaper(dataUrl, blob);
    }
}


// When file selected, read and set as background
wallpaperFileInput.addEventListener('change', function () {
    const file = this.files && this.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        console.error('File is not an image.');
        return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = function (e) {
        img.src = e.target.result;
    };

    reader.onerror = function () {
        console.error('Could not read file.');
    };

    img.onload = function () {
        const MAX_WIDTH = window.innerWidth * window.devicePixelRatio;
        const MAX_HEIGHT = window.innerHeight * window.devicePixelRatio;
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio (your original logic)
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

        // Create the canvas with the screen-fit dimensions
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Call the new async compression function
        compressAndSetWallpaper(canvas);
    };

    img.onerror = function () {
        console.error('Could not load image.');
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