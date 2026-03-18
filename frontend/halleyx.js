const API_URL = "https://dashboard-project-181718.onrender.com/orders";

let salesCharts = [];
let dashboardContainer;
let editingOrderId = null;
let cachedOrders = [];

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE GRID CONFIG
   ═══════════════════════════════════════════════════════════ */
const GRID_COLS = { desktop: 12, tablet: 8, mobile: 4 };
const SIZE_SPANS = {
  small:  { desktop: 3,  tablet: 4, mobile: 4 },
  medium: { desktop: 6,  tablet: 8, mobile: 4 },
  large:  { desktop: 12, tablet: 8, mobile: 4 }
};

function getBreakpoint() {
  const w = window.innerWidth;
  if (w >= 1024) return "desktop";
  if (w >= 640)  return "tablet";
  return "mobile";
}

function applyGridLayout() {
  if (!dashboardContainer) return;
  const bp   = getBreakpoint();
  const cols = GRID_COLS[bp];
  dashboardContainer.style.setProperty("--grid-cols", cols);

  dashboardContainer.querySelectorAll(".widget").forEach(widget => {
    const spans = widget._spans || SIZE_SPANS.medium;
    widget.style.setProperty("--widget-span", Math.min(spans[bp], cols));
  });
}

function setWidgetSpans(widget, sizeLabel) {
  widget._spans = SIZE_SPANS[sizeLabel] || SIZE_SPANS.medium;
  applyGridLayout();
}

/* ── HELPERS ─────────────────────────────────────────────── */
function normalizeOrder(order) {
  return {
    id:            order.id,
    firstName:     order.firstName     ?? order.first_name     ?? "",
    lastName:      order.lastName      ?? order.last_name      ?? "",
    email:         order.email         ?? "",
    phone:         order.phone         ?? "",
    streetAddress: order.streetAddress ?? order.street_address ?? "",
    city:          order.city          ?? "",
    state:         order.state         ?? "",
    postalCode:    order.postalCode    ?? order.postal_code    ?? "",
    country:       order.country       ?? "",
    product:       order.product       ?? "",
    quantity:      Number(order.quantity   ?? 0),
    unitPrice:     Number(order.unitPrice  ?? order.unit_price  ?? 0),
    totalAmount:   Number(order.totalAmount ?? order.total_amount ?? 0),
    status:        order.status        ?? "Pending",
    createdBy:     order.createdBy     ?? order.created_by     ?? "",
    orderDate:     order.orderDate     ?? order.order_date     ?? ""
  };
}

function getOrderPayloadFromForm() {
  return {
    firstName:     document.getElementById("firstName").value.trim(),
    lastName:      document.getElementById("lastName").value.trim(),
    email:         document.getElementById("email").value.trim(),
    phone:         document.getElementById("phone").value.trim(),
    streetAddress: document.getElementById("streetAddress").value.trim(),
    city:          document.getElementById("city").value.trim(),
    state:         document.getElementById("state").value.trim(),
    postalCode:    document.getElementById("postalCode").value.trim(),
    country:       document.getElementById("country").value,
    product:       document.getElementById("product").value,
    quantity:      Number(document.getElementById("quantity").value),
    unitPrice:     Number(document.getElementById("unitPrice").value),
    totalAmount:   Number(document.getElementById("totalAmount").value),
    status:        document.getElementById("status").value,
    createdBy:     document.getElementById("createdBy").value
  };
}

function showMessage(msg) {
  console.log(msg);
}

/* ── INIT ───────────────────────────────────────────────── */
window.onload = async function () {
  dashboardContainer = document.querySelector(".dashboard-container");
  injectGridCSS();
  enableDrag();
  window.addEventListener("resize", applyGridLayout);
  await updateDashboardWidgets();
};

function injectGridCSS() {
  if (document.getElementById("grid-style")) return;

  const s = document.createElement("style");
  s.id = "grid-style";
  s.textContent = `
    .dashboard-container {
      display: grid;
      grid-template-columns: repeat(var(--grid-cols, 12), 1fr);
      gap: 20px;
      padding: 20px;
    }
    .widget {
      grid-column: span var(--widget-span, 6);
      min-width: 0;
      box-sizing: border-box;
      position: relative;
    }
    .widget canvas {
      width: 100% !important;
      height: 280px !important;
      display: block;
    }
    @media (max-width: 1023px) { .dashboard-container { --grid-cols: 8; } }
    @media (max-width:  639px) { .dashboard-container { --grid-cols: 4; } }

    /* ── saving / toast feedback ── */
    .widget-saving::after {
      content: "Saving…";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.55);
      font-size: 13px;
      color: #78716c;
      pointer-events: none;
      border-radius: inherit;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      z-index: 9999;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity .25s, transform .25s;
      pointer-events: none;
    }
    .toast.show  { opacity: 1; transform: translateY(0); }
    .toast.success { background: #166534; color: #dcfce7; }
    .toast.error   { background: #991b1b; color: #fee2e2; }
  `;
  document.head.appendChild(s);
}

/* ── TOAST ──────────────────────────────────────────────── */
let _toastTimer = null;
function showToast(msg, type = "success") {
  let el = document.getElementById("_toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "_toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast ${type}`;
  // force reflow
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

/* ── CONFIG ─────────────────────────────────────────────── */
function openConfig() {
  document.getElementById("configPanel").style.display = "block";
  document.getElementById("overlay").style.display     = "block";
}

function closeConfigPanel() {
  document.getElementById("configPanel").style.display = "none";
  document.getElementById("overlay").style.display     = "none";
}

function closeAll() {
  closeConfigPanel();
  closeOrderForm();
}

/* ── ORDER FORM ─────────────────────────────────────────── */
function openOrderForm(order = null) {
  const form = document.getElementById("orderForm");
  form.style.display = "block";
  document.getElementById("overlay").style.display = "block";
  document.getElementById("formTitle").textContent  = order ? "Edit Order" : "Create Order";

  if (order) {
    const o = normalizeOrder(order);
    document.getElementById("firstName").value     = o.firstName;
    document.getElementById("lastName").value      = o.lastName;
    document.getElementById("email").value         = o.email;
    document.getElementById("phone").value         = o.phone;
    document.getElementById("streetAddress").value = o.streetAddress;
    document.getElementById("city").value          = o.city;
    document.getElementById("state").value         = o.state;
    document.getElementById("postalCode").value    = o.postalCode;
    document.getElementById("country").value       = o.country;
    document.getElementById("product").value       = o.product;
    document.getElementById("quantity").value      = o.quantity || 1;
    document.getElementById("unitPrice").value     = o.unitPrice  || "";
    document.getElementById("totalAmount").value   = o.totalAmount || "";
    document.getElementById("status").value        = o.status     || "Pending";
    document.getElementById("createdBy").value     = o.createdBy  || "";
    editingOrderId = o.id;
  }
}

function closeOrderForm() {
  document.getElementById("orderForm").style.display = "none";
  document.getElementById("overlay").style.display   = "none";
  clearForm();
  clearErrors();
}

/* ── QUANTITY MINIMUM ENFORCEMENT ───────────────────────── */
function enforceMinQty(input) {
  if (parseInt(input.value) < 1 || input.value === "") input.value = 1;
}

/* ── TOTAL CALCULATION ──────────────────────────────────── */
function calculateTotal() {
  const qty   = parseFloat(document.getElementById("quantity").value)  || 0;
  const price = parseFloat(document.getElementById("unitPrice").value) || 0;
  const total = qty * price;
  document.getElementById("totalAmount").value = total > 0 ? total.toFixed(2) : "";
}

/* ── VALIDATION ─────────────────────────────────────────── */
function clearErrors() {
  document.querySelectorAll(".form-field.has-error")
    .forEach(el => el.classList.remove("has-error"));
}

function validateForm() {
  clearErrors();
  let valid = true;

  const required = [
    { id: "firstName",     fieldId: "field-firstName"     },
    { id: "lastName",      fieldId: "field-lastName"      },
    { id: "email",         fieldId: "field-email",         emailCheck: true },
    { id: "phone",         fieldId: "field-phone"         },
    { id: "streetAddress", fieldId: "field-streetAddress" },
    { id: "city",          fieldId: "field-city"          },
    { id: "state",         fieldId: "field-state"         },
    { id: "postalCode",    fieldId: "field-postalCode"    },
    { id: "country",       fieldId: "field-country"       },
    { id: "product",       fieldId: "field-product"       },
    { id: "quantity",      fieldId: "field-quantity"      },
    { id: "unitPrice",     fieldId: "field-unitPrice"     },
    { id: "status",        fieldId: "field-status"        },
    { id: "createdBy",     fieldId: "field-createdBy"     }
  ];

  required.forEach(({ id, fieldId, emailCheck }) => {
    const el    = document.getElementById(id);
    const field = document.getElementById(fieldId);
    if (!el || !field) return;

    const val    = el.value.trim();
    let   hasErr = !val;

    if (!hasErr && emailCheck)
      hasErr = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

    if (!hasErr && id === "quantity")
      hasErr = parseInt(val) < 1;

    if (!hasErr && id === "unitPrice")
      hasErr = parseFloat(val) < 0;

    if (hasErr) {
      field.classList.add("has-error");
      valid = false;
    }
  });

  return valid;
}

/* ── LOAD ORDERS (initial fetch only) ──────────────────── */
async function loadOrders() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    cachedOrders = Array.isArray(data) ? data.map(normalizeOrder) : [];
    return cachedOrders;
  } catch (error) {
    console.error("loadOrders error:", error);
    cachedOrders = [];
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   SUBMIT  —  OPTIMISTIC UPDATE
   ═══════════════════════════════════════════════════════════ */
async function submitOrder() {
  if (!validateForm()) return;

  calculateTotal();

  const order    = getOrderPayloadFromForm();
  const isEdit   = !!editingOrderId;
  const url      = isEdit ? `${API_URL}/${editingOrderId}` : API_URL;
  const method   = isEdit ? "PUT" : "POST";

  /* ── 1. Snapshot for rollback ─────────────────────────── */
  const snapshot = cachedOrders.map(o => ({ ...o }));

  /* ── 2. Optimistic mutation ───────────────────────────── */
  if (isEdit) {
    const idx = cachedOrders.findIndex(o => String(o.id) === String(editingOrderId));
    if (idx !== -1)
      cachedOrders[idx] = normalizeOrder({ ...cachedOrders[idx], ...order });
  } else {
    const tempId = -Date.now();               // negative temp id
    cachedOrders.push(normalizeOrder({ ...order, id: tempId }));
  }

  /* ── 3. Paint UI instantly (no network wait) ─────────── */
  updateTable(cachedOrders);
  updateCharts(cachedOrders);
  updateKPI(cachedOrders);

  const prevEditId = editingOrderId;
  editingOrderId   = null;
  closeOrderForm();

  /* ── 4. Background network request ───────────────────── */
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    });

    if (!res.ok) throw new Error(await res.text());

    /* ── 5. Reconcile: swap temp id → real server record ── */
    const saved = normalizeOrder(await res.json());

    if (isEdit) {
      const idx = cachedOrders.findIndex(o => String(o.id) === String(prevEditId));
      if (idx !== -1) cachedOrders[idx] = saved;
    } else {
      const tempIdx = cachedOrders.findIndex(o => o.id < 0);
      if (tempIdx !== -1) cachedOrders.splice(tempIdx, 1, saved);
    }

    /* Silent re-render so edit/delete buttons get real ids */
    updateTable(cachedOrders);
    showToast(isEdit ? "Order updated ✓" : "Order created ✓", "success");

  } catch (error) {
    console.error("submitOrder error:", error);

    /* ── 6. Rollback on failure ───────────────────────────── */
    cachedOrders = snapshot;
    updateTable(cachedOrders);
    updateCharts(cachedOrders);
    updateKPI(cachedOrders);
    showToast("Could not save order — changes reverted.", "error");
  }
}

/* ═══════════════════════════════════════════════════════════
   DELETE  —  OPTIMISTIC UPDATE
   ═══════════════════════════════════════════════════════════ */
async function deleteOrder(id) {
  if (!confirm("Delete this order?")) return;

  /* ── 1. Snapshot + optimistic remove ─────────────────── */
  const snapshot = cachedOrders.map(o => ({ ...o }));
  cachedOrders   = cachedOrders.filter(o => String(o.id) !== String(id));

  updateTable(cachedOrders);
  updateCharts(cachedOrders);
  updateKPI(cachedOrders);

  /* ── 2. Background DELETE ─────────────────────────────── */
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    showToast("Order deleted ✓", "success");
  } catch (error) {
    console.error("deleteOrder error:", error);

    /* ── 3. Rollback ─────────────────────────────────────── */
    cachedOrders = snapshot;
    updateTable(cachedOrders);
    updateCharts(cachedOrders);
    updateKPI(cachedOrders);
    showToast("Could not delete order — changes reverted.", "error");
  }
}

/* ── EDIT ───────────────────────────────────────────────── */
function editOrder(id) {
  const order = cachedOrders.find(o => String(o.id) === String(id));
  if (order) openOrderForm(order);
}

/* ── MAIN UPDATE (initial load only) ────────────────────── */
async function updateDashboardWidgets() {
  const orders = await loadOrders();
  updateTable(orders);
  updateCharts(orders);
  updateKPI(orders);
  applyGridLayout();
}

/* ── STATUS BADGE ───────────────────────────────────────── */
function statusBadge(status) {
  const normalized = status === "In progress" ? "In Progress" : status;
  const map = {
    "Pending":     "badge-pending",
    "In Progress": "badge-inprogress",
    "Completed":   "badge-completed"
  };
  const cls = map[normalized] || "badge-pending";
  return `<span class="badge ${cls}">${normalized || "Pending"}</span>`;
}

/* ── TABLE ──────────────────────────────────────────────── */
function updateTable(orders) {
  const tbody = document.querySelector("tbody");
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="13">No Orders Found</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map((o, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${o.firstName || ""} ${o.lastName || ""}</td>
      <td>${o.email    || "—"}</td>
      <td>${o.phone    || "—"}</td>
      <td>${o.city     || "—"}</td>
      <td>${o.country  || "—"}</td>
      <td>${o.product  || "—"}</td>
      <td>${o.quantity || 0}</td>
      <td>$${Number(o.unitPrice   || 0).toFixed(2)}</td>
      <td>$${Number(o.totalAmount || 0).toFixed(2)}</td>
      <td>${statusBadge(o.status)}</td>
      <td>${o.createdBy || "—"}</td>
      <td>
        <button onclick="editOrder(${o.id})">Edit</button>
        <button onclick="deleteOrder(${o.id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

/* ── WIDGET BASE ────────────────────────────────────────── */
function createWidget(size = "medium") {
  const widget = document.createElement("div");
  widget.classList.add("widget", size);
  widget.setAttribute("draggable", "true");
  setWidgetSpans(widget, size);
  return widget;
}

/* ── CHART PALETTES ─────────────────────────────────────── */
const CHART_PALETTES = {
  bar: {
    backgrounds: [
      "rgba(180,74,56,0.82)",  "rgba(205,110,80,0.82)", "rgba(220,145,95,0.82)",
      "rgba(188,98,130,0.82)", "rgba(152,90,150,0.82)", "rgba(110,82,163,0.82)",
      "rgba(80,96,168,0.82)"
    ],
    borders:   ["#b44a38","#cd6e50","#dc915f","#bc6282","#985a96","#6a52a3","#5060a8"],
    gridColor: "rgba(180,74,56,0.07)",
    tickColor: "#78716c"
  },
  line: {
    lineColor:  "#15803d",
    pointColor: "#166534",
    pointHover: "#22c55e",
    fillColor:  "rgba(21,128,61,0.06)",
    gridColor:  "rgba(21,128,61,0.09)",
    tickColor:  "#57534e"
  },
  area: {
    lineColor:  "#7c3aed",
    pointColor: "#6d28d9",
    pointHover: "#a78bfa",
    fillStart:  "rgba(124,58,237,0.30)",
    fillEnd:    "rgba(124,58,237,0.00)",
    gridColor:  "rgba(124,58,237,0.08)",
    tickColor:  "#57534e"
  },
  pie: {
    backgrounds: ["#1e40af","#065f46","#991b1b","#92400e","#0f766e","#6b21a8","#854d0e"],
    borders:     ["#fff","#fff","#fff","#fff","#fff","#fff","#fff"],
    borderWidth: 2.5
  },
  doughnut: {
    backgrounds: ["#292524","#78350f","#92400e","#a16207","#166534","#1e3a8a","#4c1d95"],
    borders:     ["#fff","#fff","#fff","#fff","#fff","#fff","#fff"],
    borderWidth: 2.5
  },
  scatter: {
    pointColor:      "rgba(194,65,12,0.72)",
    pointBorder:     "#9a3412",
    pointHoverColor: "rgba(234,88,12,0.90)",
    gridColor:       "rgba(194,65,12,0.08)",
    tickColor:       "#78716c"
  }
};

function applyChartDefaults() {
  if (typeof Chart === "undefined" || Chart._defaultsApplied) return;
  Chart.defaults.font.family = "'DM Sans', 'Arial', sans-serif";
  Chart.defaults.font.size   = 12;
  Chart.defaults.color       = "#78716c";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding       = 16;
  Chart._defaultsApplied = true;
}

function makeGradient(ctx, canvas, colorStart, colorEnd) {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 280);
  g.addColorStop(0, colorStart);
  g.addColorStop(1, colorEnd);
  return g;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#1c1917",
  titleColor:      "#fafaf9",
  bodyColor:       "#a8a29e",
  borderColor:     "#292524",
  borderWidth:     1,
  padding:         11,
  cornerRadius:    8
};

/* ── ADD CHART WIDGET ───────────────────────────────────── */
function addChart(type, size = "medium") {
  const widget = createWidget(size);
  widget.innerHTML = `
    <h3>${type.toUpperCase()} Chart</h3>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">✕</button>
    <canvas></canvas>
  `;
  dashboardContainer.appendChild(widget);
  createChart(widget.querySelector("canvas"), type);
  applyGridLayout();
}

function createChart(canvas, type) {
  applyChartDefaults();
  const orders = cachedOrders || [];

  if (canvas.chartInstance) canvas.chartInstance.destroy();

  const ctx       = canvas.getContext("2d");
  const p         = CHART_PALETTES;
  const labels    = orders.map(o => o.product);
  const values    = orders.map(o => Number(o.totalAmount || 0));
  const chartType = type === "area" ? "line" : type;

  let datasets;
  let scalesCfg = {};

  if (type === "bar") {
    const pal = p.bar;
    datasets = [{
      label:           "Sales",
      data:            values,
      backgroundColor: values.map((_, i) => pal.backgrounds[i % pal.backgrounds.length]),
      borderColor:     values.map((_, i) => pal.borders[i % pal.borders.length]),
      borderWidth:     1.5,
      borderRadius:    7,
      borderSkipped:   false
    }];
    scalesCfg = {
      x: { grid: { color: pal.gridColor }, ticks: { color: pal.tickColor } },
      y: { grid: { color: pal.gridColor }, ticks: { color: pal.tickColor } }
    };

  } else if (type === "line") {
    const pal = p.line;
    datasets = [{
      label:                    "Sales",
      data:                     values,
      borderColor:              pal.lineColor,
      backgroundColor:          pal.fillColor,
      pointBackgroundColor:     pal.pointColor,
      pointHoverBackgroundColor: pal.pointHover,
      pointRadius:              4,
      pointHoverRadius:         6,
      borderWidth:              2.5,
      tension:                  0.4,
      fill:                     false
    }];
    scalesCfg = {
      x: { grid: { color: pal.gridColor }, ticks: { color: pal.tickColor } },
      y: { grid: { color: pal.gridColor }, ticks: { color: pal.tickColor } }
    };

  } else if (type === "area") {
    const pal  = p.area;
    const grad = makeGradient(ctx, canvas, pal.fillStart, pal.fillEnd);
    datasets = [{
      label:                    "Sales",
      data:                     values,
      borderColor:              pal.lineColor,
      backgroundColor:          grad,
      pointBackgroundColor:     pal.pointColor,
      pointHoverBackgroundColor: pal.pointHover,
      pointRadius:              4,
      pointHoverRadius:         6,
      borderWidth:              2.5,
      tension:                  0.4,
      fill:                     true
    }];
    scalesCfg = {
      x: { grid: { color: pal.gridColor }, ticks: { color: pal.tickColor } },
      y: { grid: { color: pal.gridColor }, ticks: { color: pal.tickColor } }
    };

  } else if (type === "pie") {
    const pal = p.pie;
    datasets = [{
      label:           "Sales",
      data:            values,
      backgroundColor: values.map((_, i) => pal.backgrounds[i % pal.backgrounds.length]),
      borderColor:     pal.borders,
      borderWidth:     pal.borderWidth,
      hoverOffset:     7
    }];

  } else if (type === "doughnut") {
    const pal = p.doughnut;
    datasets = [{
      label:           "Sales",
      data:            values,
      backgroundColor: values.map((_, i) => pal.backgrounds[i % pal.backgrounds.length]),
      borderColor:     pal.borders,
      borderWidth:     pal.borderWidth,
      hoverOffset:     7
    }];

  } else if (type === "scatter") {
    const pal = p.scatter;
    datasets = [{
      label:              "Sales",
      data:               orders.map(o => ({
        x: Number(o.quantity    || 0),
        y: Number(o.totalAmount || 0)
      })),
      backgroundColor:          pal.pointColor,
      borderColor:              pal.pointBorder,
      hoverBackgroundColor:     pal.pointHoverColor,
      pointRadius:              6,
      pointHoverRadius:         9,
      borderWidth:              1.5
    }];
    scalesCfg = {
      x: {
        title: { display: true, text: "Quantity", color: "#78716c" },
        grid:  { color: pal.gridColor },
        ticks: { color: pal.tickColor }
      },
      y: {
        title: { display: true, text: "Total", color: "#78716c" },
        grid:  { color: pal.gridColor },
        ticks: { color: pal.tickColor }
      }
    };
  }

  const config = {
    type: chartType,
    data: {
      labels:   type === "scatter" ? undefined : labels,
      datasets
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 480, easing: "easeOutQuart" },
      plugins: {
        legend: {
          display:  ["pie", "doughnut"].includes(type),
          position: "bottom",
          labels:   { padding: 14, boxWidth: 12 }
        },
        tooltip: TOOLTIP_STYLE
      },
      scales: Object.keys(scalesCfg).length ? scalesCfg : undefined
    }
  };

  const chartInstance    = new Chart(canvas, config);
  chartInstance.customType = type;
  canvas.chartInstance   = chartInstance;
  salesCharts.push(chartInstance);
}

function updateCharts(orders) {
  /* Prune destroyed / detached charts */
  salesCharts = salesCharts.filter(chart => {
    if (!chart || !chart.canvas || !document.body.contains(chart.canvas)) {
      if (chart) chart.destroy();
      return false;
    }
    return true;
  });

  salesCharts.forEach(chart => {
    const type = chart.customType || chart.config.type;

    if (type === "scatter") {
      chart.data.datasets[0].data = orders.map(o => ({
        x: Number(o.quantity    || 0),
        y: Number(o.totalAmount || 0)
      }));
    } else {
      chart.data.labels             = orders.map(o => o.product);
      chart.data.datasets[0].data   = orders.map(o => Number(o.totalAmount || 0));
    }

    chart.update();
  });
}

/* ── KPI ────────────────────────────────────────────────── */
function addKPI(size = "small") {
  const widget = createWidget(size);
  widget.innerHTML = `
    <h3>Total Revenue</h3>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">✕</button>
    <h1 class="kpi-value">$ 0.00</h1>
  `;
  dashboardContainer.appendChild(widget);

  const total = cachedOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  widget.querySelector(".kpi-value").innerText = "$ " + total.toFixed(2);

  applyGridLayout();
}

function updateKPI(orders) {
  const total = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  document.querySelectorAll(".kpi-value").forEach(el => {
    el.innerText = "$ " + total.toFixed(2);
  });
}

/* ── DRAG ───────────────────────────────────────────────── */
function enableDrag() {
  let dragged = null;

  dashboardContainer.addEventListener("dragstart", e => {
    if (e.target.classList.contains("widget")) {
      dragged = e.target;
      setTimeout(() => e.target.classList.add("dragging"), 0);
    }
  });

  dashboardContainer.addEventListener("dragend", e => {
    if (e.target.classList.contains("widget"))
      e.target.classList.remove("dragging");
    dragged = null;
  });

  dashboardContainer.addEventListener("dragover", e => {
    e.preventDefault();
    const target = e.target.closest(".widget");
    dashboardContainer.querySelectorAll(".widget")
      .forEach(w => w.classList.remove("drag-over"));
    if (target && target !== dragged) target.classList.add("drag-over");
  });

  dashboardContainer.addEventListener("drop", e => {
    e.preventDefault();
    const target = e.target.closest(".widget");
    dashboardContainer.querySelectorAll(".widget")
      .forEach(w => w.classList.remove("drag-over"));

    if (target && dragged && target !== dragged) {
      const rect   = target.getBoundingClientRect();
      const offset = e.clientY - rect.top;
      if (offset > rect.height / 2) target.after(dragged);
      else                           target.before(dragged);
    }
  });
}

/* ── DELETE WIDGET ──────────────────────────────────────── */
function deleteWidget(btn) {
  const widget = btn.closest(".widget");
  if (!widget) return;

  const canvas = widget.querySelector("canvas");
  if (canvas && canvas.chartInstance) {
    const chart = canvas.chartInstance;
    chart.destroy();
    salesCharts = salesCharts.filter(c => c !== chart);
  }

  widget.remove();
}

/* ── RESIZE WIDGET ──────────────────────────────────────── */
function resizeWidget(widget, newSize) {
  widget.classList.remove("small", "medium", "large");
  widget.classList.add(newSize);
  setWidgetSpans(widget, newSize);
}

/* ── FILTER ─────────────────────────────────────────────── */
function applyFilter(input) {
  const val = input.value.toLowerCase();
  document.querySelectorAll("tbody tr").forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(val) ? "" : "none";
  });
}

/* ── CLEAR FORM ─────────────────────────────────────────── */
function clearForm() {
  [
    "firstName","lastName","email","phone","streetAddress",
    "city","state","postalCode","unitPrice","totalAmount"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const qty = document.getElementById("quantity");
  if (qty) qty.value = "1";

  const status = document.getElementById("status");
  if (status) status.value = "Pending";

  ["country","product","createdBy"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  editingOrderId = null;
}