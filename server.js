const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
  "https://vpolifrhxhscpyynoyil.supabase.co",
  "sb_publishable_91q_F8NWQwykbXZ-L89Dkw_Ve6CnvWj"
);

/* ================= GET ALL ORDERS ================= */
app.get("/orders", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("order_date", { ascending: false });

  if (error) {
    console.error("GET /orders error:", error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }

  res.json(data);
});

/* ================= ADD ORDER ================= */
app.post("/orders", async (req, res) => {
  const body = req.body;

  const payload = {
    first_name: body.firstName,
    last_name: body.lastName,
    email: body.email,
    phone: body.phone,
    street_address: body.streetAddress,
    city: body.city,
    state: body.state,
    postal_code: body.postalCode,
    country: body.country,
    product: body.product,
    quantity: Number(body.quantity),
    unit_price: Number(body.unitPrice),
    total_amount: Number(body.totalAmount),
    status: body.status || "Pending",
    created_by: body.createdBy
  };

  const { data, error } = await supabase
    .from("orders")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("POST /orders error:", error);
    return res.status(500).json({ message: "Failed to create order" });
  }

  res.status(201).json(data);
});

/* ================= UPDATE ORDER ================= */
app.put("/orders/:id", async (req, res) => {
  const id = req.params.id;
  const body = req.body;

  const payload = {
    first_name: body.firstName,
    last_name: body.lastName,
    email: body.email,
    phone: body.phone,
    street_address: body.streetAddress,
    city: body.city,
    state: body.state,
    postal_code: body.postalCode,
    country: body.country,
    product: body.product,
    quantity: Number(body.quantity),
    unit_price: Number(body.unitPrice),
    total_amount: Number(body.totalAmount),
    status: body.status,
    created_by: body.createdBy
  };

  const { data, error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("PUT /orders/:id error:", error);
    return res.status(500).json({ message: "Failed to update order" });
  }

  res.json(data);
});

/* ================= DELETE ORDER ================= */
app.delete("/orders/:id", async (req, res) => {
  const id = req.params.id;

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE /orders/:id error:", error);
    return res.status(500).json({ message: "Failed to delete order" });
  }

  res.json({ message: "Order deleted successfully" });
});

/* ================= SERVER ================= */
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});