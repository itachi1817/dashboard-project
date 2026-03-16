const API_URL = "http://localhost:5000/orders";
let salesCharts = []; 
const dashboardContainer = document.querySelector(".dashboard-container");
let editingOrderId = null; 

/* CONFIG PANEL */
function openConfig(){ document.getElementById("configPanel").style.display="block"; }
function closeConfigPanel(){ document.getElementById("configPanel").style.display="none"; }

/* ORDER FORM */
function openOrderForm(order = null){ 
  document.getElementById("orderForm").style.display="block"; 
  if(order){
    document.getElementById("firstName").value = order.firstName;
    document.getElementById("lastName").value = order.lastName;
    document.getElementById("product").value = order.product;
    document.getElementById("quantity").value = order.quantity;
    document.getElementById("unitPrice").value = order.unitPrice;
    document.getElementById("totalAmount").value = order.totalAmount.toFixed(2);
    editingOrderId = order.id;
    document.querySelector("#orderForm button.submit-btn").innerText = "Update Order";
  } else {
    clearOrderForm();
  }
}

function closeOrderForm(){ 
  document.getElementById("orderForm").style.display="none"; 
  clearOrderForm();
}

function calculateTotal(){
  const q = Number(document.getElementById("quantity").value || 0);
  const p = Number(document.getElementById("unitPrice").value || 0);
  document.getElementById("totalAmount").value = q && p ? (q*p).toFixed(2) : "";
}

/* FETCH ORDERS */
async function loadOrders(){
  try{
    const res = await fetch(API_URL);
    return await res.json();
  } catch(err){
    console.error("Error fetching orders:", err);
    return [];
  }
}

/* ADD / UPDATE ORDER */
async function submitOrder(){
  const orderData = {
    firstName: document.getElementById("firstName").value,
    lastName: document.getElementById("lastName").value,
    product: document.getElementById("product").value,
    quantity: Number(document.getElementById("quantity").value),
    unitPrice: Number(document.getElementById("unitPrice").value),
    totalAmount: Number(document.getElementById("totalAmount").value)
  };

  if(editingOrderId){ 
    await fetch(`${API_URL}/${editingOrderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });
  } else {
    orderData.id = Date.now();
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });
  }

  updateDashboardWidgets();
  closeOrderForm();
}

/* CLEAR FORM */
function clearOrderForm(){ 
  document.getElementById("firstName").value = "";
  document.getElementById("lastName").value = "";
  document.getElementById("product").value = "";
  document.getElementById("quantity").value = 1;
  document.getElementById("unitPrice").value = "";
  document.getElementById("totalAmount").value = "";
  editingOrderId = null;
  document.querySelector("#orderForm button.submit-btn").innerText = "Submit";
}

/* DELETE ORDER */
async function deleteOrder(id){
  if(!confirm("Delete this order?")) return;
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  updateDashboardWidgets();
}

/* EDIT ORDER */
async function editOrder(id){
  const orders = await loadOrders();
  const order = orders.find(o => o.id === id || o.id === Number(id));
  if(order) openOrderForm(order);
}

/* DRAG WIDGETS */
function enableDrag(){
  const widgets = document.querySelectorAll(".widget");
  const container = document.querySelector(".dashboard-container");
  let drag = null;
  widgets.forEach(w => {
    w.addEventListener("dragstart", () => { drag = w; });
    w.addEventListener("dragover", e => e.preventDefault());
    w.addEventListener("drop", () => { container.insertBefore(drag, w); });
  });
}

/* DELETE WIDGET */
function deleteWidget(button){
  const widget = button.closest(".widget");
  if(widget && confirm("Delete this widget?")){
    widget.remove();
  }
}

/* UPDATE TABLE WIDGET */
async function updateTable(){
  const tableDiv = document.querySelector(".dashboard-container .widget.table-widget");
  if(!tableDiv) return;
  const tbody = tableDiv.querySelector("tbody");
  const orders = await loadOrders();

  if(orders.length === 0){
    tbody.innerHTML = "<tr><td colspan='7'>No Orders Found</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  orders.forEach((o, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i+1}</td>
      <td>${o.firstName} ${o.lastName}</td>
      <td>${o.product}</td>
      <td>${o.quantity}</td>
      <td>${o.unitPrice.toFixed(2)}</td>
      <td>${o.totalAmount.toFixed(2)}</td>
      <td>
        <button onclick="editOrder(${o.id})">Edit</button>
        <button onclick="deleteOrder(${o.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/* UPDATE KPI WIDGETS */
async function updateKPIs(){
  const orders = await loadOrders();
  const kpiWidgets = document.querySelectorAll(".widget.kpi-widget");
  kpiWidgets.forEach(kpiDiv => {
    kpiDiv.querySelector(".totalOrders").innerText = orders.length;
    kpiDiv.querySelector(".totalRevenue").innerText = orders.reduce((sum,o) => sum + o.totalAmount,0).toFixed(2);
  });
}

/* UPDATE CHART WIDGETS */
async function updateCharts(){
  const orders = await loadOrders();
  salesCharts.forEach(chart => {
    if(chart.config.type === "scatter"){
      chart.data.datasets[0].data = orders.map(o => ({ x: o.quantity, y: o.totalAmount }));
    } else {
      chart.data.labels = orders.map(o => o.product);
      chart.data.datasets[0].data = orders.map(o => o.quantity);
    }
    chart.update();
  });
}

/* UPDATE DASHBOARD */
function updateDashboardWidgets(){
  updateTable();
  updateKPIs();
  updateCharts();
}

/* ADD CHART WIDGET */
function addChart(type){
  const id = "chart_" + Date.now();
  const chartDiv = document.createElement("div");
  chartDiv.className = "widget";
  chartDiv.draggable = true;
  chartDiv.innerHTML = `
    <h2>${type.charAt(0).toUpperCase()+type.slice(1)} Chart</h2>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">Delete Widget</button>
    <canvas id="${id}"></canvas>
  `;
  dashboardContainer.appendChild(chartDiv);
  enableDrag();

  loadOrders().then(orders => {
    let data, labels;
    if(type === "scatter"){
      data = orders.map(o => ({ x: o.quantity, y: o.totalAmount }));
    } else {
      labels = orders.map(o => o.product);
      data = orders.map(o => o.quantity);
    }

    const chart = new Chart(document.getElementById(id), {
      type: type,
      data: {
        labels: labels,
        datasets: [{
          label: type==="scatter"?"Quantity vs Total":"Quantity Sold",
          data: data,
          backgroundColor: "rgba(75,192,192,0.6)"
        }]
      },
      options: { responsive:true, scales: type==="scatter" ? {
        x: { title: { display:true, text:"Quantity" } },
        y: { title: { display:true, text:"Total Amount" } }
      } : {} }
    });

    salesCharts.push(chart);
  });

  closeConfigPanel();
}

/* ADD KPI WIDGET */
function addKPI(){
  const kpiDiv = document.createElement("div");
  kpiDiv.className = "widget kpi-widget";
  kpiDiv.draggable = true;
  kpiDiv.innerHTML = `
    <h2>KPI Widget</h2>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">Delete Widget</button>
    <p>Total Orders: <span class="totalOrders">0</span></p>
    <p>Total Revenue: ₹<span class="totalRevenue">0</span></p>
  `;
  dashboardContainer.appendChild(kpiDiv);
  enableDrag();
  updateKPIs();
  closeConfigPanel();
}

/* PAGE LOAD */
window.onload = function(){
  enableDrag();
  updateDashboardWidgets();
}