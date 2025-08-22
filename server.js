const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());

// 📁 Archivo para persistir eventos
const EVENTS_FILE = path.join(__dirname, "events.json");

// 🔄 Función para cargar eventos desde disco
function loadEvents() {
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const data = fs.readFileSync(EVENTS_FILE, "utf8");
      const events = JSON.parse(data);
      // Convertir timestamps de string a Date
      return events.map(event => ({
        ...event,
        timestamp: new Date(event.timestamp)
      }));
    }
  } catch (error) {
    console.error("Error loading events from disk:", error);
  }
  return [];
}

// 💾 Función para guardar eventos en disco
function saveEvents(events) {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
  } catch (error) {
    console.error("Error saving events to disk:", error);
  }
}

// 📊 Cargar eventos existentes al iniciar
let events = loadEvents();
console.log(`Loaded ${events.length} events from disk`);

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

  const newEvent = {
    timestamp: new Date(),
    body: req.body,
  };

  events.push(newEvent);

  // Mantener solo los últimos 100
  if (events.length > 100) {
    events.shift();
  }

  // 💾 Guardar en disco después de cada evento
  saveEvents(events);

  res.status(200).send("OK");
});

// 🗑️ Endpoint para limpiar eventos (opcional, para debugging)
app.delete("/myapp/events", (req, res) => {
  events = [];
  saveEvents(events);
  res.status(200).send("Events cleared");
});

// 📊 Endpoint para obtener estadísticas
app.get("/myapp/stats", (req, res) => {
  res.json({
    totalEvents: events.length,
    lastEvent: events.length > 0 ? events[events.length - 1].timestamp : null,
    firstEvent: events.length > 0 ? events[0].timestamp : null
  });
});

// 🌐 Página web para ver eventos
app.get("/", (req, res) => {
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>1NCE Webhook Logs</title>
    <meta charset="utf-8">
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
      .stats {
        background: #e5f3ff;
        padding: 15px;
        margin: 20px auto;
        border-radius: 8px;
        max-width: 800px;
        text-align: center;
      }
      .controls {
        text-align: center;
        margin: 20px 0;
      }
      .btn {
        background: #dc2626;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin: 0 10px;
      }
      .btn:hover {
        background: #b91c1c;
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
      .no-events {
        text-align: center;
        color: #666;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <h1>1NCE Webhook Logs</h1>
    
    <div class="stats">
      <strong>Total de eventos:</strong> ${events.length} | 
      <strong>Último evento:</strong> ${events.length > 0 ? events[events.length - 1].timestamp.toLocaleString() : 'N/A'}
    </div>
    
    <div class="controls">
      <button class="btn" onclick="clearEvents()">Limpiar Eventos</button>
      <button class="btn" onclick="location.reload()">Actualizar</button>
    </div>
  `;

  if (events.length === 0) {
    html += `<div class="no-events">No hay eventos registrados</div>`;
  } else {
    for (const e of [...events].reverse()) {
      html += `
        <div class="event">
          <div class="timestamp">${e.timestamp.toLocaleString()}</div>
          <pre>${JSON.stringify(e.body, null, 2)}</pre>
        </div>
      `;
    }
  }

  html += `
    <script>
      function clearEvents() {
        if (confirm('¿Estás seguro de que quieres limpiar todos los eventos?')) {
          fetch('/myapp/events', { method: 'DELETE' })
            .then(() => location.reload())
            .catch(err => alert('Error: ' + err.message));
        }
      }
    </script>
  </body>
  </html>
  `;

  res.send(html);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📁 Events will be persisted to: ${EVENTS_FILE}`);
  console.log(`📊 Loaded ${events.length} events from disk`);
});
