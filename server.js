require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

/* ✅ Check env variables */
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

/* ✅ Supabase client */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send("Backend running successfully");
});

/* ================= GET ALL ORDERS ================= */
app.get("/orders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("order_date", { ascending: false });

    if (error) {
      console.error("GET /orders error:", error);
      return res.status(500).json({
        message: "Failed to fetch orders",
        error: error.message
      });
    }

    res.json(data || []);
  } catch (err) {
    console.error("GET SERVER ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

/* ================= ADD ORDER ================= */
app.post("/orders", async (req, res) => {
  try {
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
      return res.status(500).json({
        message: "Insert failed",
        error: error.message
      });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("POST SERVER ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

/* ================= UPDATE ORDER ================= */
app.put("/orders/:id", async (req, res) => {
  try {
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
      status: body.status || "Pending",
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
      return res.status(500).json({
        message: "Update failed",
        error: error.message
      });
    }

    res.json(data);
  } catch (err) {
    console.error("UPDATE SERVER ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

/* ================= DELETE ORDER ================= */
app.delete("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE /orders/:id error:", error);
      return res.status(500).json({
        message: "Delete failed",
        error: error.message
      });
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE SERVER ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});