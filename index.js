import express from "express";

const app = express();
app.use(express.json());

// This is the GPS webhook the GPS providers will call
app.post("/webhook/gps", (req, res) => {
  console.log("Received GPS data:", req.body);

  // Send OK response
  res.json({ status: "success" });
});

// Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
