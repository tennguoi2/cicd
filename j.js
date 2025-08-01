const express = require('express');
const mysql = require('mysql2/promise');
const client = require('prom-client');

const app = express();
const port = 3000;

// Khởi tạo Prometheus metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });


// Endpoint cho Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});