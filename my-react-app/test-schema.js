import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://bspedeaxxmzfffrsngek.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcGVkZWF4eG16ZmZmcnNuZ2VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjAzNTYsImV4cCI6MjA5MDY5NjM1Nn0.UcpnC-iiUipoaROXHmAPZNLjqh5a-4QoW_qNiuJcvfQ"
);

async function testConnection() {
  console.log("Fetching purchase_order_data...");
  const r1 = await supabase.from('purchase_order_data').select('*').limit(1);
  console.log("purchase_order_data error:", r1.error);
  console.log("purchase_order_data:", JSON.stringify(r1.data, null, 2));

  console.log("\nFetching open_po_detail...");
  const r2 = await supabase.from('open_po_detail').select('*').limit(1);
  console.log("open_po_detail error:", r2.error);
  console.log("open_po_detail:", JSON.stringify(r2.data, null, 2));

  console.log("\nFetching vendor_master...");
  const r3 = await supabase.from('vendor_master').select('*').limit(1);
  console.log("vendor_master error:", r3.error);
  console.log("vendor_master:", JSON.stringify(r3.data, null, 2));
}

testConnection();
