const API_URL = "https://your-backend.onrender.com/orders"; // ✅ CHANGE HERE

let salesCharts = [];
const dashboardContainer = document.querySelector(".dashboard-container");
let editingOrderId = null;

/* CONFIG PANEL */
function openConfig(){
  document.getElementById("configPanel").style.display="block";
}
function closeConfigPanel(){
  document.getElementById("configPanel").style.display="none";
}

/* ORDER FORM */
function openOrderForm(order = null){
  document.getElementById("orderForm").style.display="block";
  document.querySelector(".validation-msg").style.display = "none";

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
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const product = document.getElementById("product").value;
  const quantity = Number(document.getElementById("quantity").value);
  const unitPrice = Number(document.getElementById("unitPrice").value);
  const totalAmount = Number(document.getElementById("totalAmount").value);

  if(!firstName || !lastName || !product || !quantity || !unitPrice){
    document.querySelector(".validation-msg").style.display="block";
    return;
  }

  const orderData = { firstName, lastName, product, quantity, unitPrice, totalAmount };

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
  document.querySelector(".validation-msg").style.display="none";
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
  const container = dashboardContainer;
  let drag = null;

  widgets.forEach(w => {
    w.addEventListener("dragstart", () => { drag = w; });
    w.addEventListener("dragover", e => e.preventDefault());
    w.addEventListener("drop", () => {
      container.insertBefore(drag, w);
    });
  });
}

/* DELETE WIDGET */
function deleteWidget(button){
  const widget = button.closest(".widget");
  if(widget && confirm("Delete this widget?")){
    widget.remove();
  }
}

/* (rest of your code unchanged...) */

window.onload = function(){
  enableDrag();
  updateDashboardWidgets();
};