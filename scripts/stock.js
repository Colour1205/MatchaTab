/* STOCK SECTION */

const STOCK_SYMBOLS = [
    { symbol: 'AAPL', elemId: 'stock-aapl', label: 'AAPL' },
    { symbol: 'TSLA', elemId: 'stock-tsla', label: 'TSLA' },
    { symbol: 'SPY', elemId: 'stock-spy', label: 'S&P 500' },
    { symbol: 'GOOGL', elemId: 'stock-googl', label: 'GOOGL' },
    { symbol: 'NVDA', elemId: 'stock-nvda', label: 'NVDA' },
    { symbol: 'META', elemId: 'stock-meta', label: 'META' },
    { symbol: 'btc-usd', elemId: 'stock-btc', label: 'BTC/USD' },
    { symbol: 'GC=F', elemId: 'stock-gold', label: 'Gold Futures' },

];

let interval = "1d";
let range = "6mo";
let currSymbol = null;

document.addEventListener("DOMContentLoaded", function () {
    const stockSection = document.getElementById('stock-section');
    const stock_background = document.getElementById("stock-background");
    if (!stockSection) return;

    STOCK_SYMBOLS.forEach(stock => {
        const card = document.createElement('button');
        card.className = 'stock-card button';
        card.id = stock.elemId;

        card.addEventListener("click", function () {
            makeChart(stock.symbol)
            const stock_container = document.querySelector(".stock.container")
            stock_container.style.opacity = 1
            stock_container.style.zIndex = 3
            const stock_name = document.getElementById("stock-name");
            stock_name.textContent = stock.label;
            currSymbol = stock.symbol;
            stock_background.classList.add("show");
        })

        card.innerHTML = `
      <div class="stock-ticker">${stock.label}</div>
      <div class="stock-price"></div>
    `;
        stockSection.appendChild(card);
    });

    // helpers to set only selected active
    function setActive(btns, value) {
        btns.forEach(b => {
            const on = b.dataset.target === value;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on);
        });
    }

    const interval_buttons = document.querySelectorAll(".stock-container-inner.button.interval");
    interval_buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            interval = btn.dataset.target;
            const ok = await makeChart(currSymbol)
            if (ok) setActive(interval_buttons, interval);
        });
    })

    const range_buttons = document.querySelectorAll(".stock-container-inner.button.range");
    range_buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            range = btn.dataset.target;
            const ok = await makeChart(currSymbol)
            if (ok) setActive(range_buttons, range);
        });
    })

    // set defaults buttons to active first
    setActive(interval_buttons, interval);
    setActive(range_buttons, range);

    const close_btn = document.getElementById("stock-close-button");
    close_btn.addEventListener("click", () => {
        const stock_container = document.querySelector(".stock.container");
        stock_container.style.opacity = 0;
        stock_container.style.zIndex = -1;
        stock_background.classList.remove("show");
    });

    stock_background.addEventListener("click", () => {
        const stock_container = document.querySelector(".stock.container");
        stock_container.style.opacity = 0;
        stock_container.style.zIndex = -1;
        stock_background.classList.remove("show");
    })

    updateStockPrices(); // initial fetch
    // Refresh prices every 10 seconds
    setInterval(updateStockPrices, 10000);
});






async function fetchQuote(symbol, interval, range, includePrePost = true) {
    try {
        const url = `https://myproxy.uaena.io/api?type=stock&symbol=${symbol}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
        const res = await fetch(url);
        const data = await res.json();
        // Defensive checks for data
        if (!data.chart || !data.chart.result || !data.chart.result[0]) return null;

        return data.chart.result[0];
    } catch {
        return null;
    }
}

// Update all stock cards with latest prices
async function updateStockPrices() {
    await Promise.all(
        STOCK_SYMBOLS.map(async ({ symbol, elemId }) => {
            const priceElem = document.querySelector(`#${elemId} .stock-price`);
            try {
                const data = await fetchQuote(symbol, "2m", "1d");
                if (data) {
                    const meta = data.meta;
                    // Try to use regularMarketPrice or previousClose as fallback
                    let price = meta.regularMarketPrice ?? meta.previousClose ?? null;
                    let prevClose = meta.previousClose ?? null;
                    if (price == null || prevClose == null) return null;
                    // Calculate percent change
                    const percentChange = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
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

function isIntraday(iv) {
    const s = String(iv).toLowerCase();
    return /m$/.test(s) || s === '60m' || s === '90m' || s === '1h';
}

function sanitizeAndClamp(ts, q, gmtoffsetSec, symbol, intraday) {
    const O = q.open || [], H = q.high || [], L = q.low || [], C = q.close || [];
    const n = Math.min(ts.length, O.length, H.length, L.length, C.length);
    const SYM = (symbol || '').toUpperCase();
    const isCrypto = SYM.endsWith('-USD');

    const closes = [];
    const atrWin = 20;
    const atr = [];
    const pushATR = (c) => {
        closes.push(c);
        const m = closes.length;
        if (m >= 2) {
            const d = Math.abs(closes[m - 1] - closes[m - 2]);
            atr.push(d);
            if (atr.length > atrWin) atr.shift();
        }
    };

    const out = [];
    for (let i = 0; i < n; i++) {
        const t = ts[i], o = O[i], h = H[i], l = L[i], c = C[i];
        if (![o, h, l, c].every(Number.isFinite)) continue;

        // only filter by session for INTRADAY
        if (intraday && !inRegularSession(t, gmtoffsetSec, isCrypto)) continue;

        let hi = Math.max(o, h, c);
        let lo = Math.min(o, l, c);

        if (intraday) {
            // intraday: robust clamp
            const avgMove = atr.length ? (atr.reduce((a, b) => a + b, 0) / atr.length) : 0;
            const ref = closes.length ? closes[closes.length - 1] : c || o;
            const softBand = Math.max(1, ref * 0.015, avgMove * 6);
            const upperGuard = Math.max(o, c) + softBand;
            const lowerGuard = Math.min(o, c) - softBand;
            if (hi > upperGuard) hi = upperGuard;
            if (lo < lowerGuard) lo = lowerGuard;
            const span = (hi - lo) / Math.max(1e-9, ref);
            if (span > 0.20) { pushATR(c); continue; }
        } else {
            // daily/weekly/monthly: light sanity
            if (hi < Math.max(o, c)) hi = Math.max(o, c);
            if (lo > Math.min(o, c)) lo = Math.min(o, c);
        }

        out.push({ date: new Date(t * 1000), open: o, high: hi, low: lo, close: c });
        pushATR(c);
    }
    return out;
}


function inRegularSession(tSec, gmtoffsetSec, isCrypto = false) {
    if (isCrypto) return true; // 24/7
    const local = new Date((tSec + gmtoffsetSec) * 1000);
    const d = local.getUTCDay();           // after offset applied
    if (d === 0 || d === 6) return false;  // Sun/Sat
    const h = local.getUTCHours(), m = local.getUTCMinutes();

    // 09:30–16:00 local time (inclusive start, exclusive end)
    const afterOpen = (h > 9) || (h === 9 && m >= 30);
    const beforeClose = (h < 16) || (h === 16 && m === 0);
    return afterOpen && beforeClose;
}


// returns false if unsuccessful
// true otherwise
async function makeChart(symbol) {

    //fetch complete stock json for data
    const data = await fetchQuote(symbol, interval, range);
    if (!data) return false;


    const ts = data.timestamp || [];
    const q = data.indicators?.quote?.[0] || {};
    const gmtoffsetSec = data.meta?.gmtoffset ?? 0;
    const intraday = isIntraday(interval);

    const candles = sanitizeAndClamp(ts, q, gmtoffsetSec, symbol, intraday);
    if (!candles.length) return;
    var chart = AmCharts.makeChart("stock-chart", {
        "type": "serial",
        "theme": "light",
        "valueAxes": [{
            "position": "left",
            "gridColor": "#FFFFFF",   // horizontal grid white
            "color": "#FFFFFF",       // label text white
            "axisColor": "#FFFFFF"    // Y-axis line white
        }],
        "creditsPosition": "bottom-right",  // you can move it
        "hideCredits": true,                 // v3 specific flag
        "graphs": [{
            "id": "g1",
            "proCandlesticks": false, // set hollow sticks
            "balloonColor": "#100f1fff",
            "balloonText": "Open:<b>[[open]]</b><br>Low:<b>[[low]]</b><br>High:<b>[[high]]</b><br>Close:<b>[[close]]</b><br>",
            "closeField": "close",
            "fillColors": "#3E9D45",
            "highField": "high",
            "lineColor": "#3E9D45",
            "lineAlpha": 1,
            "lowField": "low",
            "fillAlphas": 1,
            "negativeFillColors": "#CA5C5C",
            "negativeLineColor": "#CA5C5C",
            "openField": "open",
            "title": "Price:",
            "type": "candlestick",
            "valueField": "close",
            "precision": 2
        }],
        chartCursor: {
            valueLineEnabled: true,
            valueLineBalloonEnabled: true,
            categoryBalloonDateFormat: "MMM DD, YYYY JJ:NN",
            "color": "#FFFFFF",
        },
        mouseWheelZoomEnabled: true,  // desktop zoom
        "categoryField": "date",
        categoryAxis: {
            parseDates: true,
            equalSpacing: true,
            "minPeriod": "mm",
            "gridColor": "#FFFFFF",   // grid lines white
            "color": "#FFFFFF",       // labels white
            "axisColor": "#FFFFFF"    // axis line white
        },
        "balloon": {
            "fillAlpha": 0.6,              // background opacity
            "borderThickness": 0,
            "color": "#FFFFFF",          // text color
            "fontSize": 12,              // text size
            "cornerRadius": 15,           // rounded corners
            "horizontalPadding": 12,
            "verticalPadding": 8,
            "adjustBorderColor": false,  // don’t auto-match line color
            "showBullet": true
        },
        "dataProvider": candles
    });

    const zoom = () => {
        const n = chart.dataProvider.length;
        if (!n) return;

        // Zoom to full dataset
        chart.zoomToIndexes(0, n - 1);
    };
    chart.addListener("rendered", zoom);
    zoom();
    return true
}


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