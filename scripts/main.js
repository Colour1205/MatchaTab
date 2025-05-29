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

const searchInput = document.getElementById("search-input");

searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        const input = searchInput.value.trim();
        if (!input) return;

        // Regex to detect if input looks like a URL
        const isLikelyUrl = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-z]{2,}(\S*)?$/.test(input);

        if (isLikelyUrl) {
            // If no protocol, add http://
            const url = input.startsWith("http://") || input.startsWith("https://")
                ? input
                : "http://" + input;
            window.open(url, "_blank");
        } else {
            // Otherwise search with Bing
            const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(input)}`;
            window.open(bingUrl, "_blank");
        }
    }
});