require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

/* 🔥 DEBUG (VERY IMPORTANT) */
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SECRET KEY LOADED:", !!process.env.SUPABASE_SECRET_KEY);

/* ✅ USE SECRET KEY (NOT PUBLISHABLE) */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

/* ================= GET ALL ORDERS ================= */
app.get("/orders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("order_date", { ascending: false });

    console.log("GET DATA:", data);
    console.log("GET ERROR:", error);

    if (error) {
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

    console.log("REQ BODY:", body);

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

    console.log("POST PAYLOAD:", payload);

    const { data, error } = await supabase
      .from("orders")
      .insert([payload])
      .select()
      .single();

    console.log("POST DATA:", data);
    console.log("POST ERROR:", error);

    if (error) {
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

/* ================= UPDATE ================= */
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

    console.log("UPDATE ERROR:", error);

    if (error) {
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

/* ================= DELETE ================= */
app.delete("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);

    console.log("DELETE ERROR:", error);

    if (error) {
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