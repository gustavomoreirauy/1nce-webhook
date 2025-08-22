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

// 📊 Función para extraer datos simplificados del evento
function extractSimplifiedEvent(event) {
  try {
    const body = event.body;
    return {
      timestamp: body.timestamp || 'N/A',
      event_type: body.event_type?.description || 'N/A',
      organisation: {
        id: body.organisation?.id || 'N/A',
        name: body.organisation?.name || 'N/A'
      },
      description: body.description || 'N/A',
      endpoint: {
        name: body.endpoint?.name || 'N/A',
        ip_address: body.endpoint?.ip_address || 'N/A',
        imei: body.endpoint?.imei || 'N/A'
      },
      detail: {
        country: {
          name: body.detail?.country?.name || 'N/A'
        },
        pdp_context: {
          mnc: body.detail?.pdp_context?.mnc || 'N/A',
          rat_type: body.detail?.pdp_context?.rat_type || 'N/A',
          mcc: body.detail?.pdp_context?.mcc || 'N/A',
          apn: body.detail?.pdp_context?.apn || 'N/A'
        },
        volume: {
          rx: body.detail?.volume?.rx || 'N/A',
          tx: body.detail?.volume?.tx || 'N/A',
          total: body.detail?.volume?.total || 'N/A'
        },
        name: body.detail?.name || 'N/A'
      }
    };
  } catch (error) {
    console.error("Error extracting simplified event:", error);
    return {
      timestamp: 'Error parsing',
      event_type: 'Error',
      organisation: { id: 'Error', name: 'Error' },
      description: 'Error parsing event data',
      endpoint: { name: 'Error', ip_address: 'Error', imei: 'Error' },
      detail: {
        country: { name: 'Error' },
        pdp_context: { mnc: 'Error', rat_type: 'Error', mcc: 'Error', apn: 'Error' },
        volume: { rx: 'Error', tx: 'Error', total: 'Error' },
        name: 'Error'
      }
    };
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
  const viewMode = req.query.view || 'table'; // 'table' o 'full'
  
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
        max-width: 1200px;
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
      .view-toggle {
        margin: 20px 0;
        text-align: center;
      }
      .view-btn {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
        margin: 0 5px;
      }
      .view-btn.active {
        background: #1d4ed8;
      }
      .view-btn:hover {
        background: #2563eb;
      }
      .event {
        background: white;
        padding: 15px;
        margin: 10px auto;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        max-width: 1200px;
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
      .table-container {
        overflow-x: auto;
        max-width: 1200px;
        margin: 0 auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
      }
      th {
        background: #f3f4f6;
        font-weight: bold;
        color: #374151;
      }
      tr:hover {
        background: #f9fafb;
      }
      .event-type {
        font-weight: bold;
        color: #059669;
      }
      .organisation {
        color: #7c3aed;
      }
      .endpoint {
        color: #dc2626;
      }
      .country {
        color: #ea580c;
      }
      .volume {
        font-family: monospace;
        color: #0891b2;
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

    <div class="view-toggle">
      <button class="view-btn ${viewMode === 'table' ? 'active' : ''}" onclick="changeView('table')">Vista Tabla</button>
      <button class="view-btn ${viewMode === 'full' ? 'active' : ''}" onclick="changeView('full')">Vista Completa</button>
    </div>
  `;

  if (events.length === 0) {
    html += `<div class="no-events">No hay eventos registrados</div>`;
  } else if (viewMode === 'table') {
    // Vista de tabla simplificada
    html += `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Tipo de Evento</th>
              <th>Organización</th>
              <th>Descripción</th>
              <th>Endpoint</th>
              <th>País</th>
              <th>PDP Context</th>
              <th>Volumen</th>
              <th>Operador</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const e of [...events].reverse()) {
      const simplified = extractSimplifiedEvent(e);
      html += `
        <tr>
          <td>${simplified.timestamp}</td>
          <td class="event-type">${simplified.event_type}</td>
          <td class="organisation">${simplified.organisation.name} (ID: ${simplified.organisation.id})</td>
          <td>${simplified.description}</td>
          <td class="endpoint">
            ${simplified.endpoint.name}<br>
            IP: ${simplified.endpoint.ip_address}<br>
            IMEI: ${simplified.endpoint.imei}
          </td>
          <td class="country">${simplified.detail.country.name}</td>
          <td>
            MNC: ${simplified.detail.pdp_context.mnc}<br>
            RAT: ${simplified.detail.pdp_context.rat_type}<br>
            MCC: ${simplified.detail.pdp_context.mcc}<br>
            APN: ${simplified.detail.pdp_context.apn}
          </td>
          <td class="volume">
            RX: ${simplified.detail.volume.rx}<br>
            TX: ${simplified.detail.volume.tx}<br>
            Total: ${simplified.detail.volume.total}
          </td>
          <td>${simplified.detail.name}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
  } else {
    // Vista completa JSON
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
      
      function changeView(view) {
        const url = new URL(window.location);
        url.searchParams.set('view', view);
        window.location.href = url.toString();
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
