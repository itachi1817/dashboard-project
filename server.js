const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const FILE = "orders.json";

/* READ DATA */
function readOrders(){
  try{
    const data = fs.readFileSync(FILE);
    return JSON.parse(data);
  } catch{
    return [];
  }
}

/* WRITE DATA */
function writeOrders(data){
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

/* GET */
app.get("/orders",(req,res)=>{
  res.json(readOrders());
});

/* POST */
app.post("/orders",(req,res)=>{
  const orders = readOrders();

  const newOrder = { id: Date.now(), ...req.body };
  orders.push(newOrder);

  writeOrders(orders);
  res.json(newOrder);
});

/* PUT */
app.put("/orders/:id",(req,res)=>{
  let orders = readOrders();

  orders = orders.map(o =>
    o.id == req.params.id ? { ...o, ...req.body } : o
  );

  writeOrders(orders);
  res.json({ message:"Updated" });
});

/* DELETE */
app.delete("/orders/:id",(req,res)=>{
  let orders = readOrders();

  orders = orders.filter(o => o.id != req.params.id);

  writeOrders(orders);
  res.json({ message:"Deleted" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log("Server running on port", PORT));