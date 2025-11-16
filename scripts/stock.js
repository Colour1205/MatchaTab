/* STOCK SECTION */

const STOCK_SYMBOLS = [
    { symbol: 'AAPL', label: 'AAPL' },
    { symbol: 'TSLA', label: 'TSLA' },
    { symbol: 'SPY', label: 'S&P 500' },
    { symbol: 'GOOGL', label: 'GOOGL' },
    { symbol: 'NVDA', label: 'NVDA' },
    { symbol: 'META', label: 'META' },
    { symbol: 'btc-usd', label: 'BTC/USD' },
    { symbol: 'GC=F', label: 'Gold Futures' },
];

const estimates = {};
const estimateListeners = {};
const CACHE_KEY = "stock_ai_estimates_v2";

let interval = "1d";
let range = "1y";
let currSymbol = null;
let root = null;

function todayDateStr() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function loadCachedEstimates() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return JSON.parse(raw) || {};
    } catch (e) {
        console.warn("Failed to parse cached estimates", e);
        return {};
    }
}

function saveCachedEstimate(symbol, estimateObj) {
    try {
        const all = loadCachedEstimates();
        all[symbol] = { ...estimateObj, ts: Date.now() }; // save ms timestamp
        localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    } catch (e) {
        console.warn("Failed to save cached estimate", e);
    }
}
// cache has 24 hour validity
function isFreshCached(cachedObj) {
    if (!cachedObj || !cachedObj.ts) return false;
    const ageMs = Date.now() - cachedObj.ts;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    return ageMs < 60 * 1000;
}

function notifyEstimateReady(symbol) {
    if (!symbol) return;
    const listeners = estimateListeners[symbol];
    if (!listeners || !listeners.length) return;
    // call each callback then clear the list
    listeners.slice().forEach(cb => {
        try { cb(estimates[symbol]); } catch (e) { console.error(e); }
    });
    estimateListeners[symbol] = [];
}

function onEstimateReady(symbol, cb) {
    if (!symbol || typeof cb !== "function") return;
    // if estimate already exists, call immediately
    if (estimates[symbol]) {
        try { cb(estimates[symbol]); } catch (e) { console.error(e); }
        return;
    }
    estimateListeners[symbol] = estimateListeners[symbol] || [];
    estimateListeners[symbol].push(cb);
}

(async () => {
    try {
        // load from cache first
        const cached = loadCachedEstimates();
        for (const symbol of Object.keys(cached)) {
            const val = cached[symbol];
            if (isFreshCached(val)) {
                estimates[symbol] = {
                    resistance: val.resistance,
                    support: val.support,
                    target: val.target,
                    reason: val.reason
                };
                notifyEstimateReady(symbol);
            }
        }

        // get initial data for all stocks
        const values = {};
        for (const stock of STOCK_SYMBOLS) {
            const quote = await fetchQuote(stock.symbol, "1d", "1y");
            if (quote) values[stock.symbol] = getCandles(quote);
        }

        const tasks = STOCK_SYMBOLS
            .filter(s => !(estimates[s.symbol] && estimates[s.symbol].resistance))
            .map(stock => (async () => {
                const quote = await fetchQuote(stock.symbol, "1d", "1y");
                const candles = getCandles(quote);
                console.log(`analyzing ${stock.symbol}`)
                const res = await fetch("https://myproxy.uaena.io/api", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                        {
                            type: "ai",
                            key: stock.symbol,
                            update: !isFreshCached(cached[stock.symbol]),
                            instructions: `Return exactly one line of plain text, comma-separated, with these four fields in order: resistance (number with 2 decimal places or "N/A"), support (number with 2 decimal places or "N/A"), target_rating (one word: "strong sell", "sell", "hold", "buy", or "strong buy"), and reason (a full explanatory paragraph in plain English, no commas). Separate fields with commas and do not include any extra text or labels. All numeric fields must have exactly two decimal places. If a numeric value cannot be determined, put "N/A". The target_rating must be one of: strong sell, sell, hold, buy, strong buy. The reason must be thorough, easy to understand, in plain text only, without any Markdown, code blocks, LaTeX, or bullet points. Avoid jargon and explain simply. If you cannot determine values, return: N/A,N/A,N/A, with a reason explaining why they cannot be determined. The reason should explain how resistance and support were estimated from the provided candle data and any indicators used (please use atleast two of the common indicators, compute and analyze), the market sentiment, relevant company events, and any other major factors considered. Explain the target_rating based on volatility and trend analysis. For example, if a stock is volatile, target rating should be short term, and vice versa. your estimated numbers and rating should have a time period base don the relative time interval/range of the candles given to you. if the support and resistance is too close relative to how much stock price changes, it is useless, so reanalyze on a longer period. If using dates, render them in human-readable format, for example "Oct 31, 2025". End the reason by restating the recommended action implied by the target_rating.Stock.`,
                            input: `${stock.symbol} Candles:${JSON.stringify(candles)}`
                        })
                });

                console.log(data.output_text);

                if (!res.ok) throw new Error(`AI fetch failed: ${res.status} ${res.statusText}`);
                const data = await res.json();
                if (data.error) throw new Error(`AI fetch error: ${data.error}`);

                const text = String(data.output_text).trim();
                const [resistance, support, target, reason] = text.split(",").map(s => s.trim());

                const estimateObj = { resistance, support, target, reason };
                estimates[stock.symbol] = estimateObj;

                saveCachedEstimate(stock.symbol, estimateObj);
                notifyEstimateReady(stock.symbol);
            })());
        await Promise.allSettled(tasks);
    } catch (e) {
        console.log("AI fetch error:", e);
    }
})();

document.addEventListener("DOMContentLoaded", function () {
    const stockSection = document.getElementById('stock-section');
    const stock_background = document.getElementById("stock-background");
    if (!stockSection) return;

    // create stock buttons
    STOCK_SYMBOLS.forEach(stock => {
        const card = document.createElement('button');
        card.className = 'stock-card button';
        // generate safe id based on symbol
        const safeId = `stock-${stock.symbol.replace(/[^a-z0-9]/gi, '-')}`;
        card.id = safeId;

        card.addEventListener("click", function () {
            currSymbol = stock.symbol;
            makeChart();
            const stock_container = document.querySelector(".stock.container");
            stock_container.style.opacity = 1;
            stock_container.style.zIndex = 3;
            stock_background.classList.add("show");
        });

        card.innerHTML = `
            <div class="stock-ticker">${stock.label}</div>
            <div class="stock-price"></div>
        `;
        stockSection.appendChild(card);
    });

    // helper to activate selected interval/range button
    function setActive(btns, value) {
        btns.forEach(b => {
            const on = b.dataset.target === value;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on);
        });
    }

    // interval switch
    const interval_buttons = document.querySelectorAll(".stock-container-inner.button.interval");
    interval_buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            interval = btn.dataset.target;
            const ok = await makeChart();
            if (ok) setActive(interval_buttons, interval);
        });
    });

    // range switch
    const range_buttons = document.querySelectorAll(".stock-container-inner.button.range");
    range_buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            range = btn.dataset.target;
            const ok = await makeChart();
            if (ok) setActive(range_buttons, range);
        });
    });

    // set defaults buttons to active
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
    });

    updateStockPrices(); // initial fetch
    setInterval(updateStockPrices, 10000); // refresh every 10 seconds
});


async function fetchQuote(symbol, interval, range, includePrePost = false) {
    try {
        const url = `https://myproxy.uaena.io/api?type=stock&symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&includePrePost=${encodeURIComponent(includePrePost)}`;

        const res = await fetch(url);
        const data = await res.json();
        if (!data.chart || !data.chart.result || !data.chart.result[0]) return null;
        return data.chart.result[0];
    } catch {
        return null;
    }
}


// Update all stock cards with latest prices
async function updateStockPrices() {
    await Promise.all(
        STOCK_SYMBOLS.map(async ({ symbol }) => {
            const safeId = `stock-${symbol.replace(/[^a-z0-9]/gi, '-')}`;
            const priceElem = document.querySelector(`#${safeId} .stock-price`);
            if (!priceElem) return;
            try {
                const data = await fetchQuote(symbol, "2m", "1d");
                if (data) {
                    const meta = data.meta;
                    let price = meta.regularMarketPrice ?? meta.previousClose ?? null;
                    let prevClose = meta.previousClose ?? null;
                    if (price == null || prevClose == null) return null;
                    const percentChange = getPercentageChange(prevClose, price);
                    let color = percentChange > 0 ? "#3E9D45" : percentChange < 0 ? "#CA5C5C" : "#444";
                    let sign = percentChange > 0 ? "+" : "";
                    priceElem.innerHTML = `<span style="color:${color};"> ${price.toFixed(2)}<small>(${sign}${percentChange.toFixed(2)}%)</small></span> `;
                } else {
                    priceElem.textContent = "—";
                }
            } catch {
                priceElem.textContent = "—";
            }
        })
    );
}

function getPercentageChange(prev, curr) {
    if (prev === 0) return 0;
    return ((curr - prev) / prev) * 100;
}

function getPriceChange(prev, curr) {
    return curr - prev;
}

function getHighLow(candles) {
    let high = -Infinity;
    let low = Infinity;

    candles.forEach(candle => {
        if (candle.high > high) high = candle.high;
        if (candle.low < low) low = candle.low;
    })

    return { high, low };
}

function getCandles(data) {
    const q = data.indicators?.quote?.[0] || {};
    const ts = data.timestamp || [];
    const intraday = interval.endsWith("m") || interval.endsWith("h");

    const O = q.open || [];
    const H = q.high || [];
    const L = q.low || [];
    const C = q.close || [];
    const n = Math.min(ts.length, O.length, H.length, L.length, C.length);

    const candles = [];
    for (let i = 0; i < n; i++) {
        if (![O[i], H[i], L[i], C[i]].every(Number.isFinite)) continue;

        candles.push({
            date: new Date(ts[i] * 1000),
            open: O[i],
            high: H[i],
            low: L[i],
            close: C[i]
        });
    }

    if (!candles.length) {
        console.warn("no valid candle data for", currSymbol);
        return false;
    }

    // Convert date to numeric ms timestamp and ensure OHLC numbers exist
    const formatted = candles.map(d => ({
        date: (d.date instanceof Date) ? d.date.getTime() : Number(new Date(d.date).getTime()),
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close)
    }));

    return formatted;
}
async function makeChart() {
    if (!currSymbol) return false;

    // dispose previous root if exists
    if (root) {
        try { root.dispose(); } catch (e) { console.warn("error disposing root", e); }
        root = null;
    }

    const data = await fetchQuote(currSymbol, interval, range);
    if (!data) {
        console.warn("fetchQuote returned no data for", currSymbol);
        return false;
    }
    const q = data.indicators?.quote?.[0] || {};
    const ts = data.timestamp || [];
    const intraday = interval.endsWith("m") || interval.endsWith("h");

    formatted = getCandles(data);

    /* top container init */
    const stock_name = document.getElementById("stock-name");
    const current_price = document.getElementById("current-price");
    const price_change = document.getElementById("price-change");
    const percent_change = document.getElementById("percent-change");
    const day_high = document.getElementById("day-high");
    const day_low = document.getElementById("day-low");
    const ai_support = document.getElementById("ai-support");
    const ai_resistance = document.getElementById("ai-resistance");
    const ai_target = document.getElementById("ai-target");

    // reset AI fields
    ai_support.textContent = "Analyzing stock...";
    ai_resistance.textContent = "";
    ai_target.textContent = "";

    // get prev close
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startMs = startOfToday.getTime();
    let prevClose = null;
    for (let i = formatted.length - 1; i >= 0; i--) {
        if (formatted[i].date < startMs) {
            prevClose = formatted[i].close;
            break;
        }
    }
    if (prevClose == null) prevClose = data?.meta?.chartPreviousClose;

    stock_name.textContent = data?.meta?.shortName || currSymbol.toUpperCase();
    current_price.textContent = formatted[formatted.length - 1].close.toFixed(2);
    if (prevClose != null) {
        const change = getPriceChange(prevClose, formatted[formatted.length - 1].close);
        const percent = getPercentageChange(prevClose, formatted[formatted.length - 1].close);
        const color = change > 0 ? "#3E9D45" : change < 0 ? "#CA5C5C" : "#a1a1a1ff";
        price_change.textContent = `${change > 0 ? "+" : ""}${change.toFixed(2)}`;
        percent_change.textContent = `(${percent.toFixed(2)}%)`;
        price_change.style.color = color;
        percent_change.style.color = color;
        current_price.style.color = color;
    } else {
        price_change.textContent = "—";
        percent_change.textContent = "—";
    }

    const today = new Date().toISOString().split('T')[0];
    const todayData = formatted.filter(point => {
        const dateStr = new Date(point.date).toISOString().split('T')[0];
        return dateStr === today;
    });

    const { high, low } = getHighLow(todayData.length ? todayData : formatted);
    day_high.textContent = `H: ${high.toFixed(2)}`;
    day_low.textContent = `L: ${low.toFixed(2)}`;

    /* amCharts setup */

    root = am5.Root.new("stock-chart");

    root.setThemes([
        am5themes_Animated.new(root)
    ]);

    var stockChart = root.container.children.push(am5stock.StockChart.new(root, {
        stockPositiveColor: null,
        stockNegativeColor: null,
        volumePositiveColor: null,
        volumeNegativeColor: null
    }));

    root.numberFormatter.set("numberFormat", "#,###.00");

    var mainPanel = stockChart.panels.push(am5stock.StockPanel.new(root, {
        panX: true,           // allow horizontal pan
        panY: true,           // allow vertical pan
        wheelY: "zoomX",
        height: am5.percent(100),
        pinchZoomX: true,
        pinchZoomY: false
    }));

    var valueAxis = mainPanel.yAxes.push(am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {
            pan: "zoom"
        }),
        tooltip: am5.Tooltip.new(root, {}),
        numberFormat: "#,###.00",
        maxDeviation: 0,
        extraTooltipPrecision: 2,
        strictMinMax: true,
        autoZoom: false,
        extraMax: 0.08,
        extraMin: 0.02,
    }));

    const dateMsArr = formatted.map(d => {
        if (d.date instanceof Date) return d.date.getTime();
        if (typeof d.date === "number") return d.date;
        return new Date(d.dateStr).getTime();
    });

    const intervalInfo = detectBaseIntervalFromDates(dateMsArr, intraday);
    const baseInterval = intervalInfo.baseInterval;
    const groupData = !!intervalInfo.groupData;

    var dateAxis = mainPanel.xAxes.push(am5xy.GaplessDateAxis.new(root, {
        baseInterval: baseInterval,
        groupData: groupData,
        renderer: am5xy.AxisRendererX.new(root, {
            pan: "zoom"
        }),
        maxDeviation: 1,
        tooltip: am5.Tooltip.new(root, {})
    }));

    var valueSeries = mainPanel.series.push(am5xy.CandlestickSeries.new(root, {
        name: currSymbol.toUpperCase(),
        valueXField: "date",
        valueYField: "close",
        highValueYField: "high",
        lowValueYField: "low",
        openValueYField: "open",
        calculateAggregates: true,
        xAxis: dateAxis,
        yAxis: valueAxis,
        groupData: groupData,
    }));

    var tooltip = am5.Tooltip.new(root, {
        getFillFromSprite: false,
        autoTextColor: false,
        labelText: "O: {openValueY}\nH: {highValueY}\nL: {lowValueY}\nC: {valueY}",
    });

    tooltip.get("background").setAll({
        fill: am5.color(0x000000),
        stroke: am5.color(0xffffff),
        fillOpacity: 0.7,
    });

    tooltip.label.setAll({
        fill: am5.color(0xffffff),
    })

    valueSeries.set("tooltip", tooltip);

    const riseColor = "rgba(100, 210, 92, 1)";
    const dropColor = "rgba(219, 89, 63, 1)";

    valueSeries.columns.template.states.create("riseFromOpen", {
        fill: am5.Color.fromCSS(riseColor),
        stroke: am5.Color.fromCSS(riseColor),
    });

    valueSeries.columns.template.states.create("dropFromOpen", {
        fill: am5.Color.fromCSS(dropColor),
        stroke: am5.Color.fromCSS(dropColor)
    });

    valueSeries.columns.template.setAll({
        width: am5.percent(80)
    });


    valueSeries.data.setAll(formatted);
    stockChart.set("stockSeries", valueSeries);

    var valueLegend = mainPanel.plotContainer.children.push(am5stock.StockLegend.new(root, {
        stockChart: stockChart
    }));

    let latestPriceRange;
    function updateLatestPriceLine(price) {
        if (!valueAxis) return; // ensure valueAxis exists

        // Remove old range if it exists
        if (latestPriceRange) valueAxis.axisRanges.removeValue(latestPriceRange);

        // Create new axis range at current price
        latestPriceRange = valueAxis.createAxisRange(valueAxis.makeDataItem({
            value: price
        }));

        latestPriceRange.get("grid").setAll({
            stroke: am5.color(0xFFA500), // white line for current price
            strokeWidth: 1,
            strokeDasharray: [2, 2], // optional dashed line
            strokeOpacity: 1
        });

        latestPriceRange.get("label").setAll({
            text: price.toFixed(2),
            fill: am5.color(0xFFA500),
            fontWeight: "bold",
        });
    }

    updateLatestPriceLine(formatted[formatted.length - 1].close);

    const cursor = mainPanel.set("cursor", am5xy.XYCursor.new(root, {
        behavior: "none",
        xAxis: dateAxis,
        yAxis: valueAxis,
    }));

    /* technical indicators */
    let period = [
        [9, "rgba(227, 183, 255, 0.99)"],
        [21, "rgba(208, 155, 98, 1)"],
        [50, "rgba(255, 255, 255, 1)"]
    ];

    period.forEach(([p, color]) => {
        const MA = stockChart.indicators.push(am5stock.MovingAverage.new(root, {
            stockChart: stockChart,
            stockSeries: valueSeries,
            legend: valueLegend,
            period: p,
            type: "simple",
            seriesColor: am5.Color.fromCSS(color),
        }));

        MA.series.set("tensionX", 1);
        MA.series.strokes.template.setAll({
            strokeWidth: 1 + (p / 70),
            strokeLinejoin: "round",
        })
        MA.series.set("groupData", groupData);
    })

    // const BB = stockChart.indicators.push(am5stock.BollingerBands.new(root, {
    //     stockChart: stockChart,
    //     stockSeries: valueSeries,
    //     period: 30,
    // }))

    const MACD = stockChart.indicators.push(am5stock.MACD.new(root, {
        stockChart: stockChart,
        stockSeries: valueSeries,
        shortPeriod: 12,
        longPeriod: 26,
        signalPeriod: 9,
    }))

    let resistanceRange, supportRange;

    function applyEstimatesToChart(estimateObj) {
        if (!estimateObj) return;

        const rVal = Number(estimateObj.resistance);
        const sVal = Number(estimateObj.support);

        // Remove old ranges if they exist
        if (resistanceRange) valueAxis.axisRanges.removeValue(resistanceRange);
        if (supportRange) valueAxis.axisRanges.removeValue(supportRange);

        // Resistance line
        resistanceRange = valueAxis.createAxisRange(valueAxis.makeDataItem({
            value: rVal
        }));
        resistanceRange.get("grid").setAll({
            stroke: am5.color(0xFF0000),
            strokeWidth: 2,
            strokeOpacity: 0.7
        });
        resistanceRange.get("label").setAll({
            text: rVal.toFixed(2),
            fill: am5.color(0xFF0000),
            inside: false,
            fontWeight: "bold",
        });

        // Support line
        supportRange = valueAxis.createAxisRange(valueAxis.makeDataItem({
            value: sVal
        }));
        supportRange.get("grid").setAll({
            stroke: am5.color(0x00FF00),
            strokeWidth: 2,
            strokeOpacity: 0.7
        });
        supportRange.get("label").setAll({
            text: sVal.toFixed(2),
            fill: am5.color(0x00FF00),
            inside: false,
            fontWeight: "bold",
        });

        // update UI labels if present
        ai_resistance.textContent = "Resistance: " + estimateObj.resistance;
        ai_support.textContent = "Support: " + estimateObj.support;
        ai_target.textContent = "Target: " + estimateObj.target;
    }

    // apply immediately if we already have estimates
    if (estimates[currSymbol]) {
        applyEstimatesToChart(estimates[currSymbol]);
    } else {
        // indicate waiting status
        ai_support.textContent = "Analyzing stock...";
        // register a one-time listener — will apply when notifyEstimateReady(symbol) runs
        const thisSymbol = currSymbol;
        const listener = (estimateObj) => {
            if (thisSymbol !== currSymbol) return;
            if (!root) return;
            applyEstimatesToChart(estimateObj);
        };
        onEstimateReady(currSymbol, listener);
    }

    /* set colors of chart */
    // axes - labels
    dateAxis.get("renderer").labels.template.setAll({
        fill: am5.color("#fff"),
        fontSize: 11
    });
    valueAxis.get("renderer").labels.template.setAll({
        fill: am5.color("#fff"),
        fontWeight: "bold"
    });

    MACD.xAxis.get("renderer").labels.template.setAll({
        fill: am5.color("#fff"),
        fontSize: 11
    });
    MACD.yAxis.get("renderer").labels.template.setAll({
        fill: am5.color("#fff"),
        fontWeight: "bold"
    });

    // axes - grid lines
    dateAxis.get("renderer").grid.template.setAll({
        stroke: am5.color("#fff"),
        strokeOpacity: 0.3
    });
    valueAxis.get("renderer").grid.template.setAll({
        stroke: am5.color("#fff"),
        strokeOpacity: 0.2
    });

    MACD.xAxis.get("renderer").grid.template.setAll({
        stroke: am5.color("#fff"),
        strokeOpacity: 0.3
    });
    MACD.yAxis.get("renderer").grid.template.setAll({
        stroke: am5.color("#fff"),
        strokeOpacity: 0.2
    });

    // cursor color
    cursor.lineX.setAll({
        stroke: am5.color(0xffffff), // white
        strokeWidth: 1,
        strokeOpacity: 1,
        strokeDasharray: []
    });
    cursor.lineY.setAll({
        stroke: am5.color(0xffffff), // white
        strokeWidth: 1,
        strokeOpacity: 1,
        strokeDasharray: []
    });

    MACD.panel.get("cursor").lineX.setAll({
        stroke: am5.color(0xffffff), // white
        strokeWidth: 1,
        strokeOpacity: 1
    });
    MACD.panel.get("cursor").lineY.setAll({
        stroke: am5.color(0xffffff), // white
        strokeWidth: 1,
        strokeOpacity: 1
    });
    // indicator styles

    return true;
}

// helper: choose baseInterval from array of numeric ms timestamps
function detectBaseIntervalFromDates(datesMs, intraday) {
    if (!datesMs || datesMs.length < 2) {
        return { baseInterval: { timeUnit: "day", count: 1 }, groupData: true };
    }

    // compute deltas and median delta to be robust against outliers
    const deltas = [];
    for (let i = 1; i < datesMs.length; i++) {
        deltas.push(datesMs[i] - datesMs[i - 1]);
    }
    deltas.sort((a, b) => a - b);
    const mid = Math.floor(deltas.length / 2);
    const medianDelta = deltas.length % 2 === 1 ? deltas[mid] : Math.round((deltas[mid - 1] + deltas[mid]) / 2);

    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;

    // prefer intraday granular units when intraday is true
    if (medianDelta < MINUTE) {
        // sub-minute? treat as 1 minute
        return { baseInterval: { timeUnit: "minute", count: 1 }, groupData: false };
    }
    if (medianDelta < HOUR) {
        // pick reasonable minute bucket (1,5,15,30,60)
        const mins = Math.round(medianDelta / MINUTE);
        const buckets = [1, 5, 15, 30, 60];
        const choice = buckets.reduce((best, b) => (Math.abs(b - mins) < Math.abs(best - mins) ? b : best), buckets[0]);
        return { baseInterval: { timeUnit: "minute", count: choice }, groupData: intraday ? false : true };
    }
    if (medianDelta < DAY) {
        // pick hour bucket (1,2,3,4,6,12)
        const hrs = Math.round(medianDelta / HOUR);
        const buckets = [1, 2, 3, 4, 6, 12];
        const choice = buckets.reduce((best, b) => (Math.abs(b - hrs) < Math.abs(best - hrs) ? b : best), buckets[0]);
        return { baseInterval: { timeUnit: "hour", count: choice }, groupData: intraday ? false : true };
    }
    if (medianDelta < WEEK) {
        return { baseInterval: { timeUnit: "day", count: 1 }, groupData: true };
    }
    if (medianDelta < MONTH) {
        return { baseInterval: { timeUnit: "week", count: 1 }, groupData: true };
    }
    return { baseInterval: { timeUnit: "month", count: 1 }, groupData: true };
}
