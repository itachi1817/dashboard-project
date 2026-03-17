const express = require("express");
const cors = require("cors");

const app = express();

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());

/* IN-MEMORY DATABASE */
let orders = [];

/* ================= GET ALL ORDERS ================= */
app.get("/orders", (req, res) => {
  res.json(orders);
});

/* ================= ADD ORDER ================= */
app.post("/orders", (req, res) => {
  const newOrder = {
    id: Date.now(),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    product: req.body.product,
    quantity: req.body.quantity,
    unitPrice: req.body.unitPrice,
    totalAmount: req.body.totalAmount
  };

  orders.push(newOrder);

  res.status(201).json(newOrder);
});

/* ================= UPDATE ORDER ================= */
app.put("/orders/:id", (req, res) => {
  const id = Number(req.params.id);

  const index = orders.findIndex(order => order.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Order not found" });
  }

  orders[index] = {
    ...orders[index],
    ...req.body
  };

  res.json(orders[index]);
});

/* ================= DELETE ORDER ================= */
app.delete("/orders/:id", (req, res) => {
  const id = Number(req.params.id);

  const exists = orders.some(order => order.id === id);

  if (!exists) {
    return res.status(404).json({ message: "Order not found" });
  }

  orders = orders.filter(order => order.id !== id);

  res.json({ message: "Order deleted successfully" });
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});