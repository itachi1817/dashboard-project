const API_URL = "https://your-backend-url.onrender.com/orders";

let salesCharts      = [];
let dashboardContainer;
let editingOrderId   = null;
let cachedOrders     = null;

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE GRID CONFIG
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
function openConfig(){
  document.getElementById("configPanel").style.display = "block";
  document.getElementById("overlay").style.display     = "block";
}
function closeConfigPanel(){
  document.getElementById("configPanel").style.display = "none";
  document.getElementById("overlay").style.display     = "none";
}

function closeAll(){
  closeConfigPanel();
  closeOrderForm();
}

/* ── ORDER FORM ─────────────────────────────────────────── */
function openOrderForm(order = null){
  const form = document.getElementById("orderForm");
  form.style.display = "block";
  document.getElementById("overlay").style.display = "block";
  document.getElementById("formTitle").textContent = order ? "Edit Order" : "Create Order";

  if(order){
    document.getElementById("firstName").value    = order.firstName    || "";
    document.getElementById("lastName").value     = order.lastName     || "";
    document.getElementById("email").value        = order.email        || "";
    document.getElementById("phone").value        = order.phone        || "";
    document.getElementById("streetAddress").value= order.streetAddress|| "";
    document.getElementById("city").value         = order.city         || "";
    document.getElementById("state").value        = order.state        || "";
    document.getElementById("postalCode").value   = order.postalCode   || "";
    document.getElementById("country").value      = order.country      || "";
    document.getElementById("product").value      = order.product      || "";
    document.getElementById("quantity").value     = order.quantity     || 1;
    document.getElementById("unitPrice").value    = order.unitPrice    || "";
    document.getElementById("totalAmount").value  = order.totalAmount  || "";
    document.getElementById("status").value       = order.status       || "Pending";
    document.getElementById("createdBy").value    = order.createdBy    || "";
    editingOrderId = order.id;
  }
}

function closeOrderForm(){
  document.getElementById("orderForm").style.display = "none";
  document.getElementById("overlay").style.display   = "none";
  clearForm();
  clearErrors();
}

/* ── QUANTITY MINIMUM ENFORCEMENT ───────────────────────── */
function enforceMinQty(input){
  if(parseInt(input.value) < 1 || input.value === "") input.value = 1;
}

/* ── TOTAL CALCULATION ──────────────────────────────────── */
function calculateTotal(){
  const qty   = parseFloat(document.getElementById("quantity").value)   || 0;
  const price = parseFloat(document.getElementById("unitPrice").value)  || 0;
  const total = qty * price;
  document.getElementById("totalAmount").value = total > 0 ? total.toFixed(2) : "";
}

/* ── VALIDATION ─────────────────────────────────────────── */
function clearErrors(){
  document.querySelectorAll(".form-field.has-error").forEach(el => el.classList.remove("has-error"));
}

function validateForm(){
  clearErrors();
  let valid = true;

  const required = [
    { id: "firstName",     fieldId: "field-firstName" },
    { id: "lastName",      fieldId: "field-lastName" },
    { id: "email",         fieldId: "field-email",     emailCheck: true },
    { id: "phone",         fieldId: "field-phone" },
    { id: "streetAddress", fieldId: "field-streetAddress" },
    { id: "city",          fieldId: "field-city" },
    { id: "state",         fieldId: "field-state" },
    { id: "postalCode",    fieldId: "field-postalCode" },
    { id: "country",       fieldId: "field-country" },
    { id: "product",       fieldId: "field-product" },
    { id: "quantity",      fieldId: "field-quantity" },
    { id: "unitPrice",     fieldId: "field-unitPrice" },
    { id: "status",        fieldId: "field-status" },
    { id: "createdBy",     fieldId: "field-createdBy" }
  ];

  required.forEach(({ id, fieldId, emailCheck }) => {
    const el    = document.getElementById(id);
    const field = document.getElementById(fieldId);
    if(!field) return;

    const val = el.value.trim();
    let hasErr = !val;

    if(!hasErr && emailCheck){
      hasErr = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }
    if(!hasErr && id === "quantity"){
      hasErr = parseInt(val) < 1;
    }

    if(hasErr){
      field.classList.add("has-error");
      valid = false;
    }
  });

  return valid;
}

/* ── LOAD ORDERS ────────────────────────────────────────── */
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

/* ── SUBMIT ─────────────────────────────────────────────── */
function submitOrder(){
  if(!validateForm()) return;

  const order = {
    id:            editingOrderId || Date.now(),
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
  if(!confirm("Delete this order?")) return;
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

/* ── STATUS BADGE ────────────────────────────────────────── */
function statusBadge(status){
  const map = {
    "Pending":     "badge-pending",
    "In Progress": "badge-inprogress",
    "Completed":   "badge-completed"
  };
  const cls = map[status] || "badge-pending";
  return `<span class="badge ${cls}">${status || "Pending"}</span>`;
}

/* ── TABLE ───────────────────────────────────────────────── */
function updateTable(orders){
  const tbody = document.querySelector("tbody");
  if(!tbody) return;
  if(!orders.length){
    tbody.innerHTML = `<tr><td colspan="13">No Orders Found</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map((o, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${o.firstName || ""} ${o.lastName || ""}</td>
      <td>${o.email || "—"}</td>
      <td>${o.phone || "—"}</td>
      <td>${o.city || "—"}</td>
      <td>${o.country || "—"}</td>
      <td>${o.product || "—"}</td>
      <td>${o.quantity || 0}</td>
      <td>$${Number(o.unitPrice || 0).toFixed(2)}</td>
      <td>$${Number(o.totalAmount || 0).toFixed(2)}</td>
      <td>${statusBadge(o.status)}</td>
      <td>${o.createdBy || "—"}</td>
      <td>
        <button onclick="editOrder(${o.id})">Edit</button>
        <button onclick="deleteOrder(${o.id})">Delete</button>
      </td>
    </tr>`).join("");
}

/* ── WIDGET BASE ─────────────────────────────────────────── */
function createWidget(size = "medium"){
  const widget = document.createElement("div");
  widget.classList.add("widget", size);
  widget.setAttribute("draggable","true");
  setWidgetSpans(widget, size);
  return widget;
}

/* ── CHART PALETTES ──────────────────────────────────────── */
const CHART_PALETTES = {
  bar: {
    backgrounds: [
      "rgba(180,74,56,0.82)","rgba(205,110,80,0.82)","rgba(220,145,95,0.82)",
      "rgba(188,98,130,0.82)","rgba(152,90,150,0.82)","rgba(110,82,163,0.82)","rgba(80,96,168,0.82)"
    ],
    borders: ["#b44a38","#cd6e50","#dc915f","#bc6282","#985a96","#6a52a3","#5060a8"],
    gridColor: "rgba(180,74,56,0.07)", tickColor: "#78716c"
  },
  line: {
    lineColor:"#15803d",pointColor:"#166534",pointHover:"#22c55e",
    fillColor:"rgba(21,128,61,0.06)",gridColor:"rgba(21,128,61,0.09)",tickColor:"#57534e"
  },
  area: {
    lineColor:"#7c3aed",pointColor:"#6d28d9",pointHover:"#a78bfa",
    fillStart:"rgba(124,58,237,0.30)",fillEnd:"rgba(124,58,237,0.00)",
    gridColor:"rgba(124,58,237,0.08)",tickColor:"#57534e"
  },
  pie: {
    backgrounds:["#1e40af","#065f46","#991b1b","#92400e","#0f766e","#6b21a8","#854d0e"],
    borders:["#fff","#fff","#fff","#fff","#fff","#fff","#fff"],borderWidth:2.5
  },
  doughnut: {
    backgrounds:["#292524","#78350f","#92400e","#a16207","#166534","#1e3a8a","#4c1d95"],
    borders:["#fff","#fff","#fff","#fff","#fff","#fff","#fff"],borderWidth:2.5
  },
  scatter: {
    pointColor:"rgba(194,65,12,0.72)",pointBorder:"#9a3412",
    pointHoverColor:"rgba(234,88,12,0.90)",gridColor:"rgba(194,65,12,0.08)",tickColor:"#78716c"
  }
};

function applyChartDefaults(){
  if(typeof Chart === "undefined" || Chart._defaultsApplied) return;
  Chart.defaults.font.family = "'DM Sans', 'Arial', sans-serif";
  Chart.defaults.font.size   = 12;
  Chart.defaults.color       = "#78716c";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding       = 16;
  Chart._defaultsApplied = true;
}

function makeGradient(ctx, canvas, colorStart, colorEnd){
  const g = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 280);
  g.addColorStop(0, colorStart);
  g.addColorStop(1, colorEnd);
  return g;
}

const TOOLTIP_STYLE = {
  backgroundColor:"#1c1917",titleColor:"#fafaf9",bodyColor:"#a8a29e",
  borderColor:"#292524",borderWidth:1,padding:11,cornerRadius:8
};

/* ── ADD CHART WIDGET ────────────────────────────────────── */
function addChart(type, size = "medium"){
  const widget = createWidget(size);
  widget.innerHTML = `
    <h3>${type.toUpperCase()} Chart</h3>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">✕</button>
    <canvas></canvas>
  `;
  dashboardContainer.appendChild(widget);
  createChart(widget.querySelector("canvas"), type);
}

function createChart(canvas, type){
  applyChartDefaults();
  const orders = cachedOrders || [];
  if(canvas.chartInstance) canvas.chartInstance.destroy();

  const ctx       = canvas.getContext("2d");
  const p         = CHART_PALETTES;
  const labels    = orders.map(o => o.product);
  const values    = orders.map(o => o.totalAmount);
  const chartType = type === "area" ? "line" : type;
  let datasets, scalesCfg = {};

  if(type === "bar"){
    const pal = p.bar;
    datasets = [{ label:"Sales", data:values,
      backgroundColor: values.map((_,i) => pal.backgrounds[i%pal.backgrounds.length]),
      borderColor:     values.map((_,i) => pal.borders[i%pal.borders.length]),
      borderWidth:1.5,borderRadius:7,borderSkipped:false }];
    scalesCfg = { x:{grid:{color:pal.gridColor},ticks:{color:pal.tickColor}}, y:{grid:{color:pal.gridColor},ticks:{color:pal.tickColor}} };
  } else if(type === "line"){
    const pal = p.line;
    datasets = [{ label:"Sales", data:values,
      borderColor:pal.lineColor, backgroundColor:pal.fillColor,
      pointBackgroundColor:pal.pointColor, pointHoverBackgroundColor:pal.pointHover,
      pointRadius:4,pointHoverRadius:6,borderWidth:2.5,tension:0.4,fill:false }];
    scalesCfg = { x:{grid:{color:pal.gridColor},ticks:{color:pal.tickColor}}, y:{grid:{color:pal.gridColor},ticks:{color:pal.tickColor}} };
  } else if(type === "area"){
    const pal = p.area;
    const grad = makeGradient(ctx, canvas, pal.fillStart, pal.fillEnd);
    datasets = [{ label:"Sales", data:values,
      borderColor:pal.lineColor, backgroundColor:grad,
      pointBackgroundColor:pal.pointColor, pointHoverBackgroundColor:pal.pointHover,
      pointRadius:4,pointHoverRadius:6,borderWidth:2.5,tension:0.4,fill:true }];
    scalesCfg = { x:{grid:{color:pal.gridColor},ticks:{color:pal.tickColor}}, y:{grid:{color:pal.gridColor},ticks:{color:pal.tickColor}} };
  } else if(type === "pie"){
    const pal = p.pie;
    datasets = [{ label:"Sales", data:values,
      backgroundColor:values.map((_,i) => pal.backgrounds[i%pal.backgrounds.length]),
      borderColor:pal.borders, borderWidth:pal.borderWidth, hoverOffset:7 }];
  } else if(type === "doughnut"){
    const pal = p.doughnut;
    datasets = [{ label:"Sales", data:values,
      backgroundColor:values.map((_,i) => pal.backgrounds[i%pal.backgrounds.length]),
      borderColor:pal.borders, borderWidth:pal.borderWidth, hoverOffset:7 }];
  } else if(type === "scatter"){
    const pal = p.scatter;
    datasets = [{ label:"Sales", data:orders.map(o=>({x:o.quantity,y:o.totalAmount})),
      backgroundColor:pal.pointColor, borderColor:pal.pointBorder,
      hoverBackgroundColor:pal.pointHoverColor, pointRadius:6,pointHoverRadius:9,borderWidth:1.5 }];
    scalesCfg = {
      x:{title:{display:true,text:"Quantity",color:"#78716c"},grid:{color:pal.gridColor},ticks:{color:pal.tickColor}},
      y:{title:{display:true,text:"Total",color:"#78716c"},grid:{color:pal.gridColor},ticks:{color:pal.tickColor}}
    };
  }

  canvas.chartInstance = new Chart(canvas, {
    type: chartType,
    data: { labels: type === "scatter" ? undefined : labels, datasets },
    options: {
      responsive:true, maintainAspectRatio:false,
      animation:{ duration:480, easing:"easeOutQuart" },
      plugins: {
        legend:{ display:["pie","doughnut"].includes(type), position:"bottom", labels:{padding:14,boxWidth:12} },
        tooltip: TOOLTIP_STYLE
      },
      scales: Object.keys(scalesCfg).length ? scalesCfg : undefined
    }
  });

  salesCharts.push(canvas.chartInstance);
}

function updateCharts(orders){
  salesCharts.forEach(chart => {
    if(chart.config.type === "scatter"){
      chart.data.datasets[0].data = orders.map(o => ({ x:o.quantity, y:o.totalAmount }));
    } else {
      chart.data.labels           = orders.map(o => o.product);
      chart.data.datasets[0].data = orders.map(o => o.totalAmount);
    }
    chart.update();
  });
}

/* ── KPI ─────────────────────────────────────────────────── */
function addKPI(size = "small"){
  const widget = createWidget(size);
  widget.innerHTML = `
    <h3>Total Revenue</h3>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">✕</button>
    <h1 class="kpi-value">$ 0</h1>
  `;
  dashboardContainer.appendChild(widget);
  const orders = cachedOrders || [];
  const total  = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  widget.querySelector(".kpi-value").innerText = "$ " + total.toFixed(2);
}

function updateKPI(orders){
  const total = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  document.querySelectorAll(".kpi-value").forEach(el => {
    el.innerText = "$ " + total.toFixed(2);
  });
}

/* ── DRAG ────────────────────────────────────────────────── */
function enableDrag(){
  let dragged = null;
  dashboardContainer.addEventListener("dragstart", e => {
    if(e.target.classList.contains("widget")){
      dragged = e.target;
      setTimeout(() => e.target.classList.add("dragging"), 0);
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
  ["firstName","lastName","email","phone","streetAddress","city","state",
   "postalCode","quantity","unitPrice","totalAmount"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = id === "quantity" ? "1" : "";
  });
  ["country","product","status","createdBy"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = id === "status" ? "Pending" : "";
  });
  editingOrderId = null;
}