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
        url: "https://www.amazon.com",
        faviconUrl: "https://www.google.com/s2/favicons?sz=128&domain_url=amazon.com"
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
    // Ensure minimum 8 empty slots for grid, if <4 cols, add invisible placeholder
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

    // Context menu (right-click)
    div.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        showQuickLinkContextMenu(idx, e, false);
    });

    return div;
}

function closeAllContexts() {
    document.querySelectorAll('.quick-link-context').forEach(ctx => ctx.remove());
    document.querySelectorAll('.quick-link.show-context').forEach(el => el.classList.remove('show-context'));
}

// Context menu logic
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
        addBtn.textContent = 'Add Quick Link';
        addBtn.onclick = (ev) => {
            ev.stopPropagation();
            closeAllContexts();
            addQuickLinkPrompt();
        };
        menu.appendChild(addBtn);
    } else {
        // "Add Quick Link" + "Remove This Link" for quick link item
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Add Quick Link';
        addBtn.onclick = (ev) => {
            ev.stopPropagation();
            closeAllContexts();
            addQuickLinkPrompt();
        };
        menu.appendChild(addBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove This Link';
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

// Close all context menus
function closeAllContexts() {
    document.querySelectorAll('.quick-link-context').forEach(ctx => ctx.remove());
}

// Add quick link flow
async function addQuickLinkPrompt() {
    let url = prompt('Enter the URL for the quick link:');
    if (!url) return;
    url = url.trim();
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    try {
        let name = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
        // Try to fetch favicon
        let faviconUrl = await fetchFavicon(url);
        let newLink = { url, name: capitalize(name), faviconUrl };
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

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Keyboard: add with Ctrl+RightClick on any quick link
quickLinksSection.addEventListener('contextmenu', function (e) {
    if (e.ctrlKey) {
        e.preventDefault();
        closeAllContexts();
        addQuickLinkPrompt();
    }
});

// Initialize
renderQuickLinks();

window.addEventListener('resize', renderQuickLinks);

// Context menu for empty quick links area
quickLinksSection.addEventListener('contextmenu', function (e) {
    if (e.target.closest('.quick-link')) return;
    e.preventDefault();
    closeAllContexts();
    let menu = document.createElement('div');
    menu.className = 'quick-link-context show';
    menu.style.position = 'fixed';
    menu.style.top = `${e.clientY}px`;
    menu.style.left = `${e.clientX}px`;
    let addBtn = document.createElement('button');
    addBtn.textContent = 'Add Quick Link';
    addBtn.onclick = (ev) => {
        ev.stopPropagation();
        closeAllContexts();
        addQuickLinkPrompt();
    };
    menu.appendChild(addBtn);
    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener('click', closeAllContexts, { once: true });
    }, 0);
});

function closeAllContexts() {
    document.querySelectorAll('.quick-link-context').forEach(ctx => ctx.remove());
    document.querySelectorAll('.quick-link.show-context').forEach(el => el.classList.remove('show-context'));
}

