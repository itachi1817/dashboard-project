const API_URL = "https://your-backend-url.onrender.com/orders";

let salesCharts = [];
let dashboardContainer;
let editingOrderId = null;

/* INIT */
window.onload = function(){
  dashboardContainer = document.querySelector(".dashboard-container");
  enableDrag();
  updateDashboardWidgets();
};

/* CONFIG */
function openConfig(){ document.getElementById("configPanel").style.display="block"; }
function closeConfigPanel(){ document.getElementById("configPanel").style.display="none"; }

/* ORDER FORM */
function openOrderForm(order=null){
  document.getElementById("orderForm").style.display="block";

  if(order){
    firstName.value = order.firstName;
    lastName.value = order.lastName;
    product.value = order.product;
    quantity.value = order.quantity;
    unitPrice.value = order.unitPrice;
    totalAmount.value = order.totalAmount;
    editingOrderId = order.id;
  }
}

function closeOrderForm(){
  document.getElementById("orderForm").style.display="none";
  clearForm();
}

/* TOTAL */
function calculateTotal(){
  totalAmount.value = (quantity.value * unitPrice.value) || "";
}

/* LOAD ORDERS */
async function loadOrders(){
  try{
    const res = await fetch(API_URL);
    const data = await res.json();
    localStorage.setItem("orders", JSON.stringify(data));
    return data;
  } catch{
    return JSON.parse(localStorage.getItem("orders")) || [];
  }
}

/* SUBMIT (ADD + UPDATE) */
async function submitOrder(){
  const order = {
    id: editingOrderId || Date.now(),
    firstName: firstName.value,
    lastName: lastName.value,
    product: product.value,
    quantity: Number(quantity.value),
    unitPrice: Number(unitPrice.value),
    totalAmount: Number(totalAmount.value)
  };

  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  if(editingOrderId){
    orders = orders.map(o => o.id === editingOrderId ? order : o);

    try{
      await fetch(`${API_URL}/${editingOrderId}`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(order)
      });
    } catch{}
  } else {
    orders.push(order);

    try{
      await fetch(API_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(order)
      });
    } catch{}
  }

  localStorage.setItem("orders", JSON.stringify(orders));

  editingOrderId = null;
  updateDashboardWidgets();
  closeOrderForm();
}

/* EDIT */
function editOrder(id){
  const orders = JSON.parse(localStorage.getItem("orders")) || [];
  const order = orders.find(o => o.id === id);
  if(order) openOrderForm(order);
}

/* MAIN UPDATE */
async function updateDashboardWidgets(){
  const orders = await loadOrders();

  updateTable(orders);
  updateCharts(orders);
  updateKPI(orders);
}

/* TABLE */
function updateTable(orders){
  const tbody = document.querySelector("tbody");
  tbody.innerHTML = "";

  if(orders.length === 0){
    tbody.innerHTML = `<tr><td colspan="7">No Orders Found</td></tr>`;
    return;
  }

  orders.forEach((o,i)=>{
    tbody.innerHTML += `
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
      </tr>
    `;
  });
}

/* DELETE */
function deleteOrder(id){
  let orders = JSON.parse(localStorage.getItem("orders")) || [];
  orders = orders.filter(o => o.id !== id);

  localStorage.setItem("orders", JSON.stringify(orders));

  fetch(`${API_URL}/${id}`,{method:"DELETE"}).catch(()=>{});

  updateDashboardWidgets();
}

/* ================= CHART ================= */

function addChart(type){
  const widget = document.createElement("div");
  widget.className="widget";
  widget.setAttribute("draggable","true");

  widget.innerHTML = `
    <h2>${type.toUpperCase()} Chart</h2>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">Delete Widget</button>
    <canvas></canvas>
  `;

  dashboardContainer.appendChild(widget);
  enableDrag();

  createChart(widget.querySelector("canvas"), type);
}

/* 🔥 FIXED CREATE CHART */
async function createChart(canvas, type){
  const orders = await loadOrders();

  let chartData;

  if(type === "scatter"){
    chartData = {
      datasets: [{
        label: "Sales",
        data: orders.map(o => ({
          x: o.quantity,
          y: o.totalAmount
        }))
      }]
    };
  } else {
    chartData = {
      labels: orders.map(o=>o.product),
      datasets:[{
        label:"Sales",
        data: orders.map(o=>o.totalAmount),
        fill: type==="area"
      }]
    };
  }

  const chart = new Chart(canvas,{
    type: type==="area" ? "line" : type,
    data: chartData,
    options: {
      scales: type === "scatter" ? {
        x: { title: { display: true, text: "Quantity" } },
        y: { title: { display: true, text: "Total Amount" } }
      } : {}
    }
  });

  salesCharts.push(chart);
}

/* 🔥 FIXED UPDATE CHART */
function updateCharts(orders){
  salesCharts.forEach(chart=>{

    if(chart.config.type === "scatter"){
      chart.data.datasets[0].data = orders.map(o => ({
        x: o.quantity,
        y: o.totalAmount
      }));
    } else {
      chart.data.labels = orders.map(o=>o.product);
      chart.data.datasets[0].data = orders.map(o=>o.totalAmount);
    }

    chart.update();
  });
}

/* KPI */
function addKPI(){
  const widget = document.createElement("div");
  widget.className="widget";

  widget.innerHTML = `
    <h2>Total Revenue</h2>
    <button class="delete-widget-btn" onclick="deleteWidget(this)">Delete Widget</button>
    <h1 class="kpi-value">₹ 0</h1>
  `;

  dashboardContainer.appendChild(widget);
  enableDrag();

  updateDashboardWidgets();
}

function updateKPI(orders){
  const total = orders.reduce((sum,o)=> sum + (o.totalAmount || 0), 0);

  document.querySelectorAll(".kpi-value").forEach(el=>{
    el.innerText = "₹ " + total.toFixed(2);
  });
}

/* DRAG */
function enableDrag(){
  const widgets = document.querySelectorAll(".widget");
  let drag=null;

  widgets.forEach(w=>{
    w.addEventListener("dragstart",()=> drag=w);
    w.addEventListener("dragover",e=>e.preventDefault());
    w.addEventListener("drop",()=> dashboardContainer.insertBefore(drag,w));
  });
}

/* DELETE WIDGET */
function deleteWidget(btn){
  btn.closest(".widget").remove();
}

/* FILTER */
function applyFilter(input){
  const val = input.value.toLowerCase();

  document.querySelectorAll("tbody tr").forEach(row=>{
    row.style.display = row.innerText.toLowerCase().includes(val) ? "" : "none";
  });
}

/* CLEAR */
function clearForm(){
  firstName.value="";
  lastName.value="";
  unitPrice.value="";
  totalAmount.value="";
}