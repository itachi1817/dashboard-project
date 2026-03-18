const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let orders = [];
let nextId = 1;

app.get("/", (req, res) => {
  res.send("Backend running successfully");
});

app.get("/orders", (req, res) => {
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.order_date) - new Date(a.order_date)
  );
  res.json(sortedOrders);
});

app.post("/orders", (req, res) => {
  try {
    const body = req.body;

    const newOrder = {
      id: nextId++,
      first_name: body.firstName || "",
      last_name: body.lastName || "",
      email: body.email || "",
      phone: body.phone || "",
      street_address: body.streetAddress || "",
      city: body.city || "",
      state: body.state || "",
      postal_code: body.postalCode || "",
      country: body.country || "",
      product: body.product || "",
      quantity: Number(body.quantity) || 0,
      unit_price: Number(body.unitPrice) || 0,
      total_amount: Number(body.totalAmount) || 0,
      status: body.status || "Pending",
      created_by: body.createdBy || "",
      order_date: new Date().toISOString()
    };

    orders.unshift(newOrder);
    res.status(201).json(newOrder);
  } catch (err) {
    console.error("POST SERVER ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

app.put("/orders/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;

    const index = orders.findIndex(order => order.id === id);

    if (index === -1) {
      return res.status(404).json({ message: "Order not found" });
    }

    orders[index] = {
      ...orders[index],
      first_name: body.firstName || "",
      last_name: body.lastName || "",
      email: body.email || "",
      phone: body.phone || "",
      street_address: body.streetAddress || "",
      city: body.city || "",
      state: body.state || "",
      postal_code: body.postalCode || "",
      country: body.country || "",
      product: body.product || "",
      quantity: Number(body.quantity) || 0,
      unit_price: Number(body.unitPrice) || 0,
      total_amount: Number(body.totalAmount) || 0,
      status: body.status || "Pending",
      created_by: body.createdBy || ""
    };

    res.json(orders[index]);
  } catch (err) {
    console.error("UPDATE SERVER ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

app.delete("/orders/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const index = orders.findIndex(order => order.id === id);

    if (index === -1) {
      return res.status(404).json({ message: "Order not found" });
    }

    orders.splice(index, 1);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE SERVER ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});