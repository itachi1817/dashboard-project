const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let orders = [];

/* GET ALL ORDERS */
app.get("/orders", (req, res) => res.json(orders));

/* ADD NEW ORDER */
app.post("/orders", (req, res) => {
  orders.push(req.body);
  res.json({ message: "Order added" });
});

/* DELETE ORDER */
app.delete("/orders/:id", (req, res) => {
  const id = Number(req.params.id);
  orders = orders.filter(o => o.id !== id);
  res.json({ message: "Order deleted" });
});

/* UPDATE ORDER */
app.put("/orders/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = orders.findIndex(o => o.id === id);
  if(index !== -1){
    orders[index] = { id, ...req.body };
    res.json({ message: "Order updated" });
  } else {
    res.status(404).json({ message: "Order not found" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));