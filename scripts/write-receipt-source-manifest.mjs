import fs from "node:fs/promises";
const url = "https://datasets-server.huggingface.co/first-rows?dataset=CC1984%2Fmall_receipt_extraction_dataset&config=default&split=test";
const data = await (await fetch(url)).json();
const documents = (data.rows || []).slice(0, 50).map((row, index) => ({
  filename: `receipt/receipt-${String(index + 1).padStart(3, "0")}.png`,
  source: row.row.image.src,
  dataset: "CC1984/mall_receipt_extraction_dataset",
  license: "MIT",
}));
await fs.writeFile("artifacts/scanner-fixtures/internet-sources.json", JSON.stringify({ generatedAt: new Date().toISOString(), sourceBacked: true, counts: { receipt: documents.length, sts: 0, vin: 0, service: 0 }, documents }, null, 2) + "\n");
console.log(JSON.stringify({ documents: documents.length }));
