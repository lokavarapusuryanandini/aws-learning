/**
 * DAY 5 - Task 2: Connect to RDS and run SQL queries
 *
 * Concepts:
 *   - pg (node-postgres) = Node.js client for PostgreSQL
 *   - SSL = RDS requires SSL by default; use sslmode=require
 *   - Connection pool vs single client = Pool reuses connections (production); Client = one connection
 *   - Parameterised queries = pass values as $1, $2 placeholders to prevent SQL injection
 *   - Transaction = group of queries that all succeed or all fail (ACID)
 */

import { Client } from "pg";
import { DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { rds, DB_INSTANCE_ID, DB_USERNAME, DB_PASSWORD, DB_NAME } from "./client";

async function getEndpoint(): Promise<{ host: string; port: number }> {
  const resp = await rds.send(
    new DescribeDBInstancesCommand({ DBInstanceIdentifier: DB_INSTANCE_ID })
  );
  const instance = resp.DBInstances?.[0];
  const endpoint = instance?.Endpoint;
  if (!endpoint?.Address) {
    throw new Error(
      `RDS instance '${DB_INSTANCE_ID}' not found or endpoint not ready. Run 'npm run db' first.`
    );
  }
  console.log(`Connecting to: ${endpoint.Address}:${endpoint.Port}`);
  return { host: endpoint.Address, port: endpoint.Port! };
}

async function runQueries(client: Client): Promise<void> {
  // --- Create table ---
  // IF NOT EXISTS makes the script safe to run multiple times
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id        SERIAL PRIMARY KEY,
      name      VARCHAR(100) NOT NULL,
      price     NUMERIC(10, 2) NOT NULL,
      stock     INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("Table 'products' ready");

  // --- INSERT with parameterised values ($1, $2, ...) ---
  // Always use parameterised queries — never interpolate user input into SQL strings
  const rows = [
    ["Laptop",     999.99, 25],
    ["Headphones", 49.99,  100],
    ["Keyboard",   79.99,  50],
  ];
  for (const [name, price, stock] of rows) {
    await client.query(
      "INSERT INTO products (name, price, stock) VALUES ($1, $2, $3)",
      [name, price, stock]
    );
  }
  console.log(`Inserted ${rows.length} products`);

  // --- SELECT all rows ---
  const allRows = await client.query(
    "SELECT id, name, price, stock FROM products ORDER BY id"
  );
  console.log("\nAll products:");
  console.table(allRows.rows);

  // --- SELECT with WHERE filter ---
  const affordable = await client.query(
    "SELECT name, price FROM products WHERE price < $1 ORDER BY price",
    [100]
  );
  console.log("Products under $100:");
  console.table(affordable.rows);

  // --- Aggregate query ---
  const stats = await client.query(
    "SELECT COUNT(*) AS total, AVG(price)::NUMERIC(10,2) AS avg_price, SUM(stock) AS total_stock FROM products"
  );
  console.log("Inventory stats:");
  console.table(stats.rows);

  // --- UPDATE ---
  const updateResult = await client.query(
    "UPDATE products SET stock = stock - $1 WHERE name = $2 RETURNING name, stock",
    [5, "Laptop"]
  );
  console.log("\nAfter selling 5 laptops:");
  console.table(updateResult.rows);

  // --- Transaction demo ---
  // Both updates succeed together or neither does
  console.log("\nTransaction demo: transfer 10 units from Keyboard to Headphones");
  await client.query("BEGIN");
  try {
    await client.query(
      "UPDATE products SET stock = stock - $1 WHERE name = $2",
      [10, "Keyboard"]
    );
    await client.query(
      "UPDATE products SET stock = stock + $1 WHERE name = $2",
      [10, "Headphones"]
    );
    await client.query("COMMIT");
    console.log("Transaction committed");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction rolled back:", err);
    throw err;
  }

  // Final state
  const final = await client.query(
    "SELECT id, name, price, stock FROM products ORDER BY id"
  );
  console.log("\nFinal product state:");
  console.table(final.rows);
}

async function main(): Promise<void> {
  console.log("=== Day 5 - Connect and Query RDS PostgreSQL ===\n");

  const { host, port } = await getEndpoint();

  // Create a single client connection with SSL
  // RDS requires SSL; rejectUnauthorized: false skips certificate validation
  // (acceptable for learning; use proper CA bundle in production)
  const client = new Client({
    host,
    port,
    database: DB_NAME,
    user: DB_USERNAME,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to RDS PostgreSQL\n");

  try {
    await runQueries(client);
  } finally {
    await client.end();
    console.log("\nConnection closed");
  }
}

main().catch(console.error);
