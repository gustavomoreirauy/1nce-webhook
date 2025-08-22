const express = require("express");
const app = express();

app.use(express.json());

// Read the expected header from environment
const expectedAuth = process.env.AUTH_HEADER;

app.use("/myapp", (req, res, next) => {
  const auth = req.headers['authorization'];
  if (!auth || auth !== expectedAuth) {
    return res.status(401).send("Unauthorized");
  }
  next();
});

app.post("/myapp", (req, res) => {
  console.log("Event received:", req.body);
  res.status(200).send("OK");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
