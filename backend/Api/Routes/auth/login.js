import express from "express";

const router = express.Router();

router.get("/login", (req, res) => {
  res.json({
    message: "login is running 1",
  });
});

export default router;
