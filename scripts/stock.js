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

let interval = "1d";
let range = "1y";
let currSymbol = null;
let root = null;

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
            makeChart(stock.symbol);
            const stock_container = document.querySelector(".stock.container");
            stock_container.style.opacity = 1;
            stock_container.style.zIndex = 3;
            const stock_name = document.getElementById("stock-name");
            stock_name.textContent = stock.label;
            currSymbol = stock.symbol;
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
            const ok = await makeChart(currSymbol);
            if (ok) setActive(interval_buttons, interval);
        });
    });

    // range switch
    const range_buttons = document.querySelectorAll(".stock-container-inner.button.range");
    range_buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            range = btn.dataset.target;
            const ok = await makeChart(currSymbol);
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
            const safeId = `stock-${symbol.replace(/[^a-z0-9]/gi, '-')} `;
            const priceElem = document.querySelector(`#${safeId} .stock-price`);
            if (!priceElem) return;
            try {
                const data = await fetchQuote(symbol, "2m", "1d");
                if (data) {
                    const meta = data.meta;
                    let price = meta.regularMarketPrice ?? meta.previousClose ?? null;
                    let prevClose = meta.previousClose ?? null;
                    if (price == null || prevClose == null) return null;
                    const percentChange = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
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

async function makeChart(symbol) {
    if (!symbol) return false;

    // dispose previous root if exists
    if (root) {
        try { root.dispose(); } catch (e) { console.warn("error disposing root", e); }
        root = null;
    }

    const data = await fetchQuote(symbol, interval, range);
    if (!data) {
        console.warn("fetchQuote returned no data for", symbol);
        return false;
    }

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
        console.warn("no valid candle data for", symbol);
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
        wheelY: "zoomX",
        panX: true,
        panY: true,
        height: am5.percent(100)
    }));

    var valueAxis = mainPanel.yAxes.push(am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {
            pan: "zoom"
        }),
        tooltip: am5.Tooltip.new(root, {}),
        numberFormat: "#,###.00",
        extraTooltipPrecision: 2
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
        renderer: am5xy.AxisRendererX.new(root, {}),
        tooltip: am5.Tooltip.new(root, {})
    }));

    var valueSeries = mainPanel.series.push(am5xy.CandlestickSeries.new(root, {
        name: symbol.toUpperCase(),
        valueXField: "date",
        valueYField: "close",
        highValueYField: "high",
        lowValueYField: "low",
        openValueYField: "open",
        calculateAggregates: true,
        xAxis: dateAxis,
        yAxis: valueAxis,
        groupData: groupData,
        legendValueText: "{valueY}",
        tooltip: am5.Tooltip.new(root, {})
    }));

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

    valueSeries.get("tooltip").label.set("text", "Open: {openValueY}\nHigh: {highValueY}\nLow: {lowValueY}\nClose: {valueY}")
    valueSeries.data.setAll(formatted);
    stockChart.set("stockSeries", valueSeries);

    var valueLegend = mainPanel.plotContainer.children.push(am5stock.StockLegend.new(root, {
        stockChart: stockChart
    }));

    const cursor = mainPanel.set("cursor", am5xy.XYCursor.new(root, {
        behvior: "zoomXY",
        yAxis: valueAxis,
        xAxis: dateAxis,
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
        strokeOpacity: 1
    });
    cursor.lineY.setAll({
        stroke: am5.color(0xffffff), // white
        strokeWidth: 1,
        strokeOpacity: 1
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
