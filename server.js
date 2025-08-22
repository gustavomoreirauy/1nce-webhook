const express = require("express");
const app = express();

app.use(express.json());

const events = []; // Guardamos aquí los eventos recibidos

// 🔑 Auth esperada desde variables de entorno
const expectedAuth = process.env.AUTH_HEADER;

// Middleware de Basic Auth
app.use("/myapp", (req, res, next) => {
  const auth = req.headers["authorization"];
  if (!auth || auth !== expectedAuth) {
    return res.status(401).send("Unauthorized");
  }
  next();
});

// 📩 Endpoint donde 1NCE manda los eventos
app.post("/myapp", (req, res) => {
  console.log("Event received:", req.body);

  events.push({
    timestamp: new Date(),
    body: req.body,
  });

  // Mantener solo los últimos 100
  if (events.length > 100) {
    events.shift();
  }

  res.status(200).send("OK");
});

// 🌐 Página web para ver eventos
app.get("/", (req, res) => {
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>1NCE Webhook Logs</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f9fafb;
        margin: 0;
        padding: 20px;
      }
      h1 {
        text-align: center;
        color: #333;
      }
      .event {
        background: white;
        padding: 15px;
        margin: 10px auto;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        max-width: 800px;
      }
      .timestamp {
        font-size: 0.9em;
        color: #666;
        margin-bottom: 8px;
      }
      pre {
        background: #f3f4f6;
        padding: 10px;
        border-radius: 5px;
        overflow-x: auto;
      }
    </style>
  </head>
  <body>
    <h1>Últimos eventos recibidos</h1>
  `;

  for (const e of [...events].reverse()) {
    html += `
      <div class="event">
        <div class="timestamp">${e.timestamp.toISOString()}</div>
        <pre>${JSON.stringify(e.body, null, 2)}</pre>
      </div>
    `;
  }

  html += `
    </body>
    </html>
  `;

  res.send(html);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
