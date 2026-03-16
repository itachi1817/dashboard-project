const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
app.use(cors());
app.use(bodyParser.json());

let orders = [];

app.get("/orders", (req,res)=>{ res.json(orders); });
app.post("/orders", (req,res)=>{
  const order={id:Date.now(),...req.body};
  orders.push(order);
  res.json(order);
});
app.put("/orders/:id",(req,res)=>{
  const idx = orders.findIndex(o=>o.id==req.params.id);
  if(idx!==-1) orders[idx]={...orders[idx],...req.body};
  res.json(orders[idx]);
});
app.delete("/orders/:id",(req,res)=>{
  orders=orders.filter(o=>o.id!=req.params.id);
  res.json({message:"Deleted"});
});

app.listen(5000,()=>console.log("Server running on port 5000"));