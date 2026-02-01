/**
 * Cloud Function (2nd gen) triggered by Pub/Sub: operational-events-to-bigquery.
 * Parses the message as OperationalEvent JSON and inserts one row into BigQuery events table.
 *
 * Deploy (from this directory):
 *   gcloud functions deploy operational-events-to-bq \
 *     --gen2 --runtime nodejs20 --trigger-topic operational-events-dev \
 *     --entry-point onMessage --set-env-vars BIGQUERY_DATASET=operational_metrics_dev,BIGQUERY_EVENTS_TABLE=events \
 *     --region us-central1 --project YOUR_PROJECT
 */

const { BigQuery } = require("@google-cloud/bigquery");

const bigquery = new BigQuery();
const datasetId = process.env.BIGQUERY_DATASET || "operational_metrics_dev";
const tableId = process.env.BIGQUERY_EVENTS_TABLE || "events";

exports.onMessage = async (event, context) => {
  const message = event.data
    ? Buffer.from(event.data, "base64").toString("utf8")
    : null;
  if (!message) {
    console.warn("Empty message");
    return;
  }

  let payload;
  try {
    payload = JSON.parse(message);
  } catch (e) {
    console.error("Invalid JSON:", e);
    return;
  }

  const row = {
    event_id: payload.event_id || null,
    organization_id: payload.organization_id,
    user_id: payload.user_id ?? null,
    event_type: payload.event_type,
    event_category: payload.event_category ?? null,
    platform: payload.platform ?? null,
    event_time: payload.event_time,
    event_date: payload.event_date || (payload.event_time && payload.event_time.slice(0, 10)) || null,
    payload: payload.payload ? JSON.stringify(payload.payload) : null,
    inserted_at: new Date().toISOString(),
  };

  try {
    await bigquery.dataset(datasetId).table(tableId).insert([row]);
  } catch (e) {
    console.error("BigQuery insert failed:", e);
    throw e;
  }
};
