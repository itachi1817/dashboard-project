const API_URL = "https://your-backend-url.onrender.com/orders";

let salesCharts      = [];
let dashboardContainer;
let editingOrderId   = null;
let cachedOrders     = null;

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE GRID CONFIG
   Desktop ≥1024px → 12 cols
   Tablet  640–1023 →  8 cols
   Mobile   <640px  →  4 cols
   ═══════════════════════════════════════════════════════════ */
const GRID_COLS  = { desktop: 12, tablet: 8, mobile: 4 };
const SIZE_SPANS = {
  small:  { desktop: 3,  tablet: 4, mobile: 4 },
  medium: { desktop: 6,  tablet: 8, mobile: 4 },
  large:  { desktop: 12, tablet: 8, mobile: 4 }
};

function getBreakpoint(){
  const w = window.innerWidth;
  if(w >= 1024) return "desktop";
  if(w >= 640)  return "tablet";
  return "mobile";
}

function applyGridLayout(){
  const bp   = getBreakpoint();
  const cols = GRID_COLS[bp];
  dashboardContainer.style.setProperty("--grid-cols", cols);
  dashboardContainer.querySelectorAll(".widget").forEach(widget => {
    const spans = widget._spans || SIZE_SPANS.medium;
    widget.style.setProperty("--widget-span", Math.min(spans[bp], cols));
  });
}

function setWidgetSpans(widget, sizeLabel){
  widget._spans = SIZE_SPANS[sizeLabel] || SIZE_SPANS.medium;
  applyGridLayout();
}

/* ── INIT ───────────────────────────────────────────────── */
window.onload = function(){
  dashboardContainer = document.querySelector(".dashboard-container");
  injectGridCSS();
  enableDrag();
  updateDashboardWidgets();
  window.addEventListener("resize", applyGridLayout);
};

function injectGridCSS(){
  if(document.getElementById("grid-style")) return;
  const s = document.createElement("style");
  s.id = "grid-style";
  s.textContent = `
    .dashboard-container{
      display:grid;
      grid-template-columns:repeat(var(--grid-cols,12),1fr);
      gap:20px; padding:20px;
    }
    .widget{ grid-column:span var(--widget-span,6); min-width:0; box-sizing:border-box; }
    @media(max-width:1023px){ .dashboard-container{ --grid-cols:8; } }
    @media(max-width:639px){  .dashboard-container{ --grid-cols:4; } }
  `;
  document.head.appendChild(s);
}

/* ── CONFIG ─────────────────────────────────────────────── */
function openConfig(){ document.getElementById("configPanel").style.display="block"; }
function closeConfigPanel(){ document.getElementById("configPanel").style.display="none"; }

/* ── ORDER FORM ─────────────────────────────────────────── */
function openOrderForm(order=null){
  document.getElementById("orderForm").style.display="block";
  if(order){
    firstName.value   = order.firstName;
    lastName.value    = order.lastName;
    product.value     = order.product;
    quantity.value    = order.quantity;
    unitPrice.value   = order.unitPrice;
    totalAmount.value = order.totalAmount;
    editingOrderId    = order.id;
  }
}
function closeOrderForm(){
  document.getElementById("orderForm").style.display="none";
  clearForm();
}
function calculateTotal(){
  totalAmount.value = (quantity.value * unitPrice.value) || "";
}

/* ── LOAD ORDERS (stale-while-revalidate) ───────────────── */
async function loadOrders(){
  if(cachedOrders !== null) return cachedOrders;
  cachedOrders = JSON.parse(localStorage.getItem("orders")) || [];
  fetch(API_URL)
    .then(r => r.json())
    .then(data => {
      cachedOrders = data;
      localStorage.setItem("orders", JSON.stringify(data));
      updateTable(data); updateCharts(data); updateKPI(data);
    })
    .catch(()=>{});
  return cachedOrders;
}

/* ── SUBMIT (fully synchronous — zero latency) ──────────── */
function submitOrder(){
  const order = {
    id:          editingOrderId || Date.now(),
    firstName:   firstName.value,
    lastName:    lastName.value,
    product:     product.value,
    quantity:    Number(quantity.value),
    unitPrice:   Number(unitPrice.value),
    totalAmount: Number(totalAmount.value)
  };

  let orders = cachedOrders !== null
    ? [...cachedOrders]
    : JSON.parse(localStorage.getItem("orders")) || [];

  const isEdit = !!editingOrderId;
  if(isEdit){
    orders = orders.map(o => o.id === editingOrderId ? order : o);
  } else {
    orders.push(order);
  }

  cachedOrders = orders;
  localStorage.setItem("orders", JSON.stringify(orders));
  editingOrderId = null;

  closeOrderForm();
  updateTable(orders); updateCharts(orders); updateKPI(orders);

  // Fire-and-forget
  fetch(isEdit ? `${API_URL}/${order.id}` : API_URL, {
    method:  isEdit ? "PUT" : "POST",
    headers: { "Content-Type":"application/json" },
    body:    JSON.stringify(order)
  }).catch(()=>{});
}

/* ── EDIT ────────────────────────────────────────────────── */
function editOrder(id){
  const orders = cachedOrders || JSON.parse(localStorage.getItem("orders")) || [];
  const order  = orders.find(o => o.id === id);
  if(order) openOrderForm(order);
}

/* ── DELETE ─────────────────────────────────────────────── */
function deleteOrder(id){
  let orders = cachedOrders !== null
    ? [...cachedOrders]
    : JSON.parse(localStorage.getItem("orders")) || [];
  orders = orders.filter(o => o.id !== id);
  cachedOrders = orders;
  localStorage.setItem("orders", JSON.stringify(orders));
  updateTable(orders); updateCharts(orders); updateKPI(orders);
  fetch(`${API_URL}/${id}`,{method:"DELETE"}).catch(()=>{});
}

/* ── MAIN UPDATE ─────────────────────────────────────────── */
async function updateDashboardWidgets(){
  const orders = await loadOrders();
  updateTable(orders); updateCharts(orders); updateKPI(orders);
}

/* ── TABLE ───────────────────────────────────────────────── */
function updateTable(orders){
  const tbody = document.querySelector("tbody");
  if(!tbody) return;
  if(!orders.length){
    tbody.innerHTML = `<tr><td colspan="7">No Orders Found</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map((o,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${o.firstName} ${o.lastName}</td>
      <td>${o.product}</td>
      <td>${o.quantity}</td>
      <td>${o.unitPrice}</td>
      <td>${o.totalAmount}</td>
      <td>
        <button onclick="editOrder(${o.id})">Edit</button>
        <button onclick="deleteOrder(${o.id})">Delete</button>
      </td>
    </tr>`).join("");
}

/* ── WIDGET BASE ─────────────────────────────────────────── */
function createWidget(size="medium"){
  const widget = document.createElement("div");
  widget.classList.add("widget", size);
  widget.setAttribute("draggable","true");
  setWidgetSpans(widget, size);
  return widget;
}

/* ═══════════════════════════════════════════════════════════
   PROFESSIONAL CHART COLOR PALETTES
   ─────────────────────────────────────────────────────────
   Each chart type gets its own distinct, harmonious palette.
   Philosophy:
     • Bar      — earthy terracotta → mauve gradient (warm depth)
     • Line     — crisp forest green (clean, financial feel)
     • Area     — deep violet gradient fill (sophisticated)
     • Pie      — jewel tones: sapphire, ruby, jade, amber
     • Doughnut — warm neutrals: charcoal, clay, copper, sand
     • Scatter  — rich burnt orange with warm grid
   ═══════════════════════════════════════════════════════════ */
const CHART_PALETTES = {

  bar: {
    // Warm terracotta → dusty rose → muted mauve — earthy professionalism
    backgrounds: [
      "rgba(180, 74,  56, 0.82)",   // terracotta
      "rgba(205,110,  80, 0.82)",   // warm sienna
      "rgba(220,145,  95, 0.82)",   // amber clay
      "rgba(188, 98, 130, 0.82)",   // dusty rose
      "rgba(152, 90, 150, 0.82)",   // muted mauve
      "rgba(110, 82, 163, 0.82)",   // deep lavender
      "rgba( 80, 96, 168, 0.82)",   // slate blue
    ],
    borders: [
      "#b44a38","#cd6e50","#dc915f","#bc6282","#985a96","#6a52a3","#5060a8"
    ],
    gridColor: "rgba(180,74,56,0.07)",
    tickColor: "#78716c"
  },

  line: {
    // Forest green — trustworthy, financial, precise
    lineColor:  "#15803d",
    pointColor: "#166534",
    pointHover: "#22c55e",
    fillColor:  "rgba(21,128,61,0.06)",
    gridColor:  "rgba(21,128,61,0.09)",
    tickColor:  "#57534e"
  },

  area: {
    // Deep violet to transparent — rich, premium feel
    lineColor:  "#7c3aed",
    pointColor: "#6d28d9",
    pointHover: "#a78bfa",
    fillStart:  "rgba(124,58,237,0.30)",
    fillEnd:    "rgba(124,58,237,0.00)",
    gridColor:  "rgba(124,58,237,0.08)",
    tickColor:  "#57534e"
  },

  pie: {
    // Jewel tones — sapphire, emerald, ruby, amber, teal, plum, gold
    backgrounds: [
      "#1e40af",   // sapphire
      "#065f46",   // deep emerald
      "#991b1b",   // ruby
      "#92400e",   // deep amber
      "#0f766e",   // teal
      "#6b21a8",   // plum
      "#854d0e",   // warm gold-brown
    ],
    borders:     ["#fff","#fff","#fff","#fff","#fff","#fff","#fff"],
    borderWidth: 2.5
  },

  doughnut: {
    // Warm neutrals — sophisticated, editorial feel
    backgrounds: [
      "#292524",   // near-black charcoal
      "#78350f",   // dark chocolate
      "#92400e",   // copper brown
      "#a16207",   // warm gold
      "#166534",   // deep forest
      "#1e3a8a",   // midnight blue
      "#4c1d95",   // deep violet
    ],
    borders:     ["#fff","#fff","#fff","#fff","#fff","#fff","#fff"],
    borderWidth: 2.5
  },

  scatter: {
    // Burnt orange — warm, energetic, precise
    pointColor:      "rgba(194, 65, 12, 0.72)",
    pointBorder:     "#9a3412",
    pointHoverColor: "rgba(234,88,12,0.90)",
    gridColor:       "rgba(194,65,12,0.08)",
    tickColor:       "#78716c"
  }
};

/* ── Chart.js global defaults (once) ────────────────────── */
function applyChartDefaults(){
  if(typeof Chart === "undefined" || Chart._defaultsApplied) return;
  Chart.defaults.font.family  = "'DM Sans', 'Arial', sans-serif";
  Chart.defaults.font.size    = 12;
  Chart.defaults.color        = "#78716c";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding       = 16;
  Chart._defaultsApplied = true;
}

/* ── Gradient helper ─────────────────────────────────────── */
function makeGradient(ctx, canvas, colorStart, colorEnd){
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 280);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

/* ── Shared tooltip style ────────────────────────────────── */
const TOOLTIP_STYLE = {
  backgroundColor: "#1c1917",
  titleColor:      "#fafaf9",
  bodyColor:       "#a8a29e",
  borderColor:     "#292524",
  borderWidth:     1,
  padding:         11,
  cornerRadius:    8
};

/* ── ADD CHART WIDGET ────────────────────────────────────── */
function addChart(type, size="medium"){
  const widget = createWidget(size);
  widget.innerHTML = `
    <h3>${type.toUpperCase()} Chart</h3>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">✕</button>
    <canvas></canvas>
  `;
  dashboardContainer.appendChild(widget);
  createChart(widget.querySelector("canvas"), type);
}

/* ── CREATE CHART ────────────────────────────────────────── */
function createChart(canvas, type){
  applyChartDefaults();

  const orders = cachedOrders || [];
  if(canvas.chartInstance) canvas.chartInstance.destroy();

  const ctx    = canvas.getContext("2d");
  const p      = CHART_PALETTES;
  const labels = orders.map(o => o.product);
  const values = orders.map(o => o.totalAmount);
  const chartType = type === "area" ? "line" : type;

  let datasets, scalesCfg = {};

  /* ── BAR ── */
  if(type === "bar"){
    const pal = p.bar;
    datasets = [{
      label: "Sales",
      data:  values,
      backgroundColor: values.map((_,i) => pal.backgrounds[i % pal.backgrounds.length]),
      borderColor:     values.map((_,i) => pal.borders[i % pal.borders.length]),
      borderWidth: 1.5,
      borderRadius: 7,
      borderSkipped: false
    }];
    scalesCfg = {
      x: { grid:{ color: pal.gridColor }, ticks:{ color: pal.tickColor } },
      y: { grid:{ color: pal.gridColor }, ticks:{ color: pal.tickColor } }
    };

  /* ── LINE ── */
  } else if(type === "line"){
    const pal = p.line;
    datasets = [{
      label: "Sales",
      data:  values,
      borderColor:               pal.lineColor,
      backgroundColor:           pal.fillColor,
      pointBackgroundColor:      pal.pointColor,
      pointHoverBackgroundColor: pal.pointHover,
      pointRadius: 4, pointHoverRadius: 6,
      borderWidth: 2.5, tension: 0.4, fill: false
    }];
    scalesCfg = {
      x: { grid:{ color: pal.gridColor }, ticks:{ color: pal.tickColor } },
      y: { grid:{ color: pal.gridColor }, ticks:{ color: pal.tickColor } }
    };

  /* ── AREA ── */
  } else if(type === "area"){
    const pal  = p.area;
    const grad = makeGradient(ctx, canvas, pal.fillStart, pal.fillEnd);
    datasets = [{
      label: "Sales",
      data:  values,
      borderColor:               pal.lineColor,
      backgroundColor:           grad,
      pointBackgroundColor:      pal.pointColor,
      pointHoverBackgroundColor: pal.pointHover,
      pointRadius: 4, pointHoverRadius: 6,
      borderWidth: 2.5, tension: 0.4, fill: true
    }];
    scalesCfg = {
      x: { grid:{ color: pal.gridColor }, ticks:{ color: pal.tickColor } },
      y: { grid:{ color: pal.gridColor }, ticks:{ color: pal.tickColor } }
    };

  /* ── PIE ── */
  } else if(type === "pie"){
    const pal = p.pie;
    datasets = [{
      label: "Sales",
      data:  values,
      backgroundColor: values.map((_,i) => pal.backgrounds[i % pal.backgrounds.length]),
      borderColor:     pal.borders,
      borderWidth:     pal.borderWidth,
      hoverOffset: 7
    }];

  /* ── DOUGHNUT ── */
  } else if(type === "doughnut"){
    const pal = p.doughnut;
    datasets = [{
      label: "Sales",
      data:  values,
      backgroundColor: values.map((_,i) => pal.backgrounds[i % pal.backgrounds.length]),
      borderColor:     pal.borders,
      borderWidth:     pal.borderWidth,
      hoverOffset: 7
    }];

  /* ── SCATTER ── */
  } else if(type === "scatter"){
    const pal = p.scatter;
    datasets = [{
      label: "Sales",
      data:  orders.map(o => ({ x: o.quantity, y: o.totalAmount })),
      backgroundColor:      pal.pointColor,
      borderColor:          pal.pointBorder,
      hoverBackgroundColor: pal.pointHoverColor,
      pointRadius: 6, pointHoverRadius: 9, borderWidth: 1.5
    }];
    scalesCfg = {
      x: { title:{ display:true, text:"Quantity", color:"#78716c" }, grid:{ color: pal.gridColor }, ticks:{ color: pal.tickColor } },
      y: { title:{ display:true, text:"Total",    color:"#78716c" }, grid:{ color: pal.gridColor }, ticks:{ color: pal.tickColor } }
    };
  }

  canvas.chartInstance = new Chart(canvas, {
    type: chartType,
    data: { labels: type === "scatter" ? undefined : labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 480, easing: "easeOutQuart" },
      plugins: {
        legend: {
          display: ["pie","doughnut"].includes(type),
          position: "bottom",
          labels: { padding: 14, boxWidth: 12 }
        },
        tooltip: TOOLTIP_STYLE
      },
      scales: Object.keys(scalesCfg).length ? scalesCfg : undefined
    }
  });

  salesCharts.push(canvas.chartInstance);
}

/* ── CHARTS UPDATE ───────────────────────────────────────── */
function updateCharts(orders){
  salesCharts.forEach(chart => {
    if(chart.config.type === "scatter"){
      chart.data.datasets[0].data = orders.map(o => ({ x: o.quantity, y: o.totalAmount }));
    } else {
      chart.data.labels           = orders.map(o => o.product);
      chart.data.datasets[0].data = orders.map(o => o.totalAmount);
    }
    chart.update();
  });
}

/* ── KPI ─────────────────────────────────────────────────── */
function addKPI(size="small"){
  const widget = createWidget(size);
  widget.innerHTML = `
    <h3>Total Revenue</h3>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">✕</button>
    <h1 class="kpi-value">₹ 0</h1>
  `;
  dashboardContainer.appendChild(widget);
  const orders = cachedOrders || [];
  const total  = orders.reduce((s,o) => s + (o.totalAmount||0), 0);
  widget.querySelector(".kpi-value").innerText = "₹ " + total.toFixed(2);
}

function updateKPI(orders){
  const total = orders.reduce((s,o) => s + (o.totalAmount||0), 0);
  document.querySelectorAll(".kpi-value").forEach(el => {
    el.innerText = "₹ " + total.toFixed(2);
  });
}

/* ── DRAG ────────────────────────────────────────────────── */
function enableDrag(){
  let dragged = null;
  dashboardContainer.addEventListener("dragstart", e => {
    if(e.target.classList.contains("widget")){
      dragged = e.target;
      setTimeout(()=> e.target.classList.add("dragging"), 0);
    }
  });
  dashboardContainer.addEventListener("dragend", e => {
    e.target.classList.remove("dragging");
    dragged = null;
  });
  dashboardContainer.addEventListener("dragover", e => {
    e.preventDefault();
    const target = e.target.closest(".widget");
    dashboardContainer.querySelectorAll(".widget").forEach(w => w.classList.remove("drag-over"));
    if(target && target !== dragged) target.classList.add("drag-over");
  });
  dashboardContainer.addEventListener("drop", e => {
    const target = e.target.closest(".widget");
    dashboardContainer.querySelectorAll(".widget").forEach(w => w.classList.remove("drag-over"));
    if(target && dragged && target !== dragged){
      const rect   = target.getBoundingClientRect();
      const offset = e.clientY - rect.top;
      offset > rect.height / 2 ? target.after(dragged) : target.before(dragged);
    }
  });
}

/* ── DELETE WIDGET ───────────────────────────────────────── */
function deleteWidget(btn){ btn.closest(".widget").remove(); }

/* ── RESIZE WIDGET ───────────────────────────────────────── */
function resizeWidget(widget, newSize){
  widget.classList.remove("small","medium","large");
  widget.classList.add(newSize);
  setWidgetSpans(widget, newSize);
}

/* ── FILTER ──────────────────────────────────────────────── */
function applyFilter(input){
  const val = input.value.toLowerCase();
  document.querySelectorAll("tbody tr").forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(val) ? "" : "none";
  });
}

/* ── CLEAR FORM ──────────────────────────────────────────── */
function clearForm(){
  firstName.value = ""; lastName.value = "";
  product.value   = ""; quantity.value = "";
  unitPrice.value = ""; totalAmount.value = "";
}