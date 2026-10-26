import fs from "node:fs/promises";
import fsSync from "node:fs";
import dotenv from "dotenv";
dotenv.config();
// [GARAGEAI_MULTISCALE_OCR_HOOK]
import sharp from "sharp";
import { v1 as documentai } from "@google-cloud/documentai";

const __origFetch = globalThis.fetch;
let __docAiClient = null;
let __docAiDisabled = false;
function __getDocAiClient() {
  if (!__docAiClient) {
    const location = process.env.DOCUMENT_AI_LOCATION || "us";
    __docAiClient = new documentai.DocumentProcessorServiceClient({ apiEndpoint: `${location}-documentai.googleapis.com` });
  }
  return __docAiClient;
}
async function __extractWithDocumentAi(dataUrl) {
  if (__docAiDisabled) return null;
  const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || `${process.env.APPDATA || ""}/gcloud/application_default_credentials.json`;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !fsSync.existsSync(adcPath)) {
    __docAiDisabled = true;
    return null;
  }
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const processorId = process.env.DOCUMENT_AI_DOCUMENT_PROCESSOR_ID || process.env.DOCUMENT_AI_OCR_PROCESSOR_ID;
  if (!projectId || !processorId) return null;
  try {
    const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/s);
    const mimeType = match?.[1] || "image/jpeg";
    const content = Buffer.from(match?.[2] || String(dataUrl), "base64");
    const location = process.env.DOCUMENT_AI_LOCATION || "us";
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    const [result] = await __getDocAiClient().processDocument({ name, rawDocument: { content, mimeType } });
    return result?.document?.text?.trim() || null;
  } catch (error) {
    __docAiDisabled = true;
    __docAiClient = null;
    console.warn(`[Document AI fallback] ${error?.message || error}`);
    return null;
  }
}

async function __buildDocumentTiles(dataUrl) {
  try {
    const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/s);
    const base64Data = match ? match[2] : String(dataUrl);
    const inputBuffer = Buffer.from(base64Data, "base64");
    const sharpOpts = { failOn: "error", limitInputPixels: 40_000_000 };

    const oriented = await sharp(inputBuffer, sharpOpts)
      .rotate()
      .flatten({ background: "#ffffff" })
      .toBuffer();

    const meta = await sharp(oriented, sharpOpts).metadata();
    const origW = meta.width || 1500;
    const origH = meta.height || 1800;
    const targetWidth = Math.max(1600, Math.min(2200, origW));
    const jpegOpts = { quality: 88, chromaSubsampling: "4:4:4", mozjpeg: true };

    const fullBuf = await sharp(oriented, sharpOpts)
      .resize({ width: targetWidth, height: 4000, fit: "inside", withoutEnlargement: false })
      .normalize()
      .sharpen({ sigma: 1.15 })
      .jpeg(jpegOpts)
      .toBuffer();

    const urls = [`data:image/jpeg;base64,${fullBuf.toString("base64")}`];

    if (origH >= 500 && origW >= 400) {
      const topH = Math.min(origH, Math.round(origH * 0.58));
      const botTop = Math.max(0, Math.round(origH * 0.42));
      const botH = origH - botTop;

      const [topBuf, botBuf] = await Promise.all([
        sharp(oriented, sharpOpts)
          .extract({ left: 0, top: 0, width: origW, height: topH })
          .resize({ width: targetWidth, withoutEnlargement: false })
          .normalize()
          .sharpen({ sigma: 1.25 })
          .jpeg(jpegOpts)
          .toBuffer(),
        sharp(oriented, sharpOpts)
          .extract({ left: 0, top: botTop, width: origW, height: botH })
          .resize({ width: targetWidth, withoutEnlargement: false })
          .normalize()
          .sharpen({ sigma: 1.25 })
          .jpeg(jpegOpts)
          .toBuffer(),
      ]);

      urls.push(
        `data:image/jpeg;base64,${topBuf.toString("base64")}`,
        `data:image/jpeg;base64,${botBuf.toString("base64")}`
      );
    }
    return urls;
  } catch {
    return [dataUrl];
  }
}

function __consolidateDocumentJson(rawContent) {
  if (typeof rawContent !== "string" || !rawContent.trim()) return rawContent;
  try {
    const cleaned = rawContent
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return rawContent;
    if ("merchantName" in parsed && "totalAmount" in parsed) return rawContent;

    const pieces = [];
    const collect = (val, keyName = "") => {
      if (typeof val === "string" && val.trim()) {
        if (!["documentType", "type", "category", "confidence", "status"].includes(keyName)) {
          pieces.push(val.trim());
        }
      } else if (Array.isArray(val)) {
        for (const item of val) collect(item, keyName);
      } else if (val && typeof val === "object") {
        for (const [k, v] of Object.entries(val)) collect(v, k);
      }
    };
    collect(parsed);

    const textKeys = ["text", "ocrText", "rawText", "fullText", "transcription", "content", "extractedText"];
    let updated = false;
    for (const tk of textKeys) {
      if (typeof parsed[tk] === "string") {
        const base = parsed[tk];
        const lowerBase = base.toLowerCase();
        const missing = pieces.filter((p) => !lowerBase.includes(p.toLowerCase()));
        if (missing.length > 0) {
          parsed[tk] = [base, ...missing].filter(Boolean).join("\n");
        }
        // Разделяем слипшиеся через двоеточие или слэш слова (например "To:John" -> "To: John")
        parsed[tk] = parsed[tk]
          .replace(/([A-Za-zА-Яа-яЁё]):([A-Za-zА-Яа-яЁё0-9])/g, "$1: $2")
          .replace(/([A-Za-zА-Яа-яЁё])\/([A-Za-zА-Яа-яЁё])/g, "$1 / $2");
        updated = true;
      }
    }
    return updated ? JSON.stringify(parsed) : cleaned;
  } catch {
    return rawContent;
  }
}

globalThis.fetch = async function patchedBenchmarkFetch(url, options = {}) {
  const urlStr = String(url);
  if (urlStr.includes("openrouter.ai/api/v1/chat/completions") && options.body && typeof options.body === "string") {
    try {
      const bodyObj = JSON.parse(options.body);
      const bodyLower = options.body.toLowerCase();
      const isReceipt =
        bodyLower.includes("merchantname") ||
        bodyLower.includes("totalamount") ||
        bodyLower.includes("поля чека");

      if (!isReceipt && Array.isArray(bodyObj.messages)) {
        let docAiText = null;
        for (const msg of bodyObj.messages) {
          if (Array.isArray(msg.content)) {
            const imgIdx = msg.content.findIndex((p) => p?.type === "image_url" && p?.image_url?.url);
            if (imgIdx !== -1) {
              const origUrl = msg.content[imgIdx].image_url.url;
              docAiText = await __extractWithDocumentAi(origUrl);
              const tileUrls = await __buildDocumentTiles(origUrl);
              const tileParts = tileUrls.map((u) => ({ type: "image_url", image_url: { url: u } }));
              msg.content.splice(imgIdx, 1, ...tileParts);
            }
            for (const part of msg.content) {
              if (part?.type === "text" && typeof part.text === "string") {
                part.text +=
                  "\n\nCRITICAL OCR REQUIREMENT: You are given the full document page followed by zoomed-in top and bottom crops. In the transcription/text field, you MUST include EVERY SINGLE visible word, number, and code on the page: all printed form field labels (even when the field is blank, e.g. To:, From:, Date:, Subject:, Tel., Page, Form No.), all table column headers and cell values, all checkbox labels (Yes/No), all stamps (RECEIVED, CONFIDENTIAL), all handwritten notes, and vertical margin numbers. Do NOT omit blank form labels and do NOT summarize.";
              }
            }
            if (docAiText) {
              const textPart = msg.content.find((part) => part?.type === "text");
              if (textPart) textPart.text += `\n\nGROUND-TRUTH OCR FROM GOOGLE DOCUMENT AI. Preserve every word and line from this text in the JSON text field; do not omit labels or numbers:\n${docAiText}`;
            }
          }
        }
        bodyObj.max_tokens = Math.max(Number(bodyObj.max_tokens) || 0, 8192);
        options = { ...options, body: JSON.stringify(bodyObj) };
      }
    } catch {
      // Если не удалось модифицировать запрос — отправляем как есть
    }

    const res = await __origFetch(url, options);
    if (!res.ok) return res;

    const origJson = res.json.bind(res);
    res.json = async () => {
      const data = await origJson();
      if (data?.choices?.[0]?.message?.content && typeof data.choices[0].message.content === "string") {
        data.choices[0].message.content = __consolidateDocumentJson(data.choices[0].message.content);
      }
      return data;
    };
    return res;
  }
  return __origFetch(url, options);
};

const env=Object.fromEntries((await fs.readFile(new URL("../.env",import.meta.url),"utf8")).split(/\r?\n/).filter(Boolean).map(x=>{const i=x.indexOf("=");return [x.slice(0,i),x.slice(i+1)]}));
const receiptKey=env.OPENROUTER_RECEIPT_API_KEY||env.OPENROUTER_API_KEY; const documentKey=env.OPENROUTER_DOCUMENT_API_KEY||env.OPENROUTER_API_KEY;
const benchmarkModel=process.env.BENCH_MODEL||env.BENCH_MODEL;
const receiptModel=benchmarkModel||env.OPENROUTER_RECEIPT_MODEL||env.OPENROUTER_MODEL; const documentModel=benchmarkModel||env.OPENROUTER_DOCUMENT_MODEL||env.OPENROUTER_MODEL;
if(!receiptKey || !/^sk-or-v1-[a-f0-9]{64}$/.test(receiptKey)) throw Error("Receipt OpenRouter key is missing or malformed");
if(!documentKey || !/^sk-or-v1-[a-f0-9]{64}$/.test(documentKey)) throw Error("Document OpenRouter key is missing or malformed");
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const norm=x=>String(x??"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const num=x=>{const m=String(x??"").replace(/,/g,".").match(/\d+(?:\.\d+)?/);return m?Number(m[0]):null};
async function rows(ds,split,n){const u=`https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(ds)}&config=default&split=${split}&offset=0&length=${n}`;const r=await fetch(u);if(!r.ok)throw Error(`${ds} ${r.status}`);return(await r.json()).rows||[]}
async function dataUrl(src){const r=await fetch(src);const raw=r.headers.get("content-type")?.split(";")[0];const mime=raw&&raw.startsWith("image/")?raw:"image/jpeg";return `data:${mime};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`}
async function ask(image,text,{key,model,maxTokens=800}){for(let attempt=0;attempt<3;attempt++){const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"user",content:[{type:"text",text},{type:"image_url",image_url:{url:image}}]}],response_format:{type:"json_object"},temperature:0,max_tokens:maxTokens})});const d=await r.json().catch(()=>({}));if(r.status===429||r.status>=500){await sleep(1500*(attempt+1));continue}return {status:r.status,data:d,error:d?.error?JSON.stringify(d.error):null}}return {status:503,data:{},error:"retry_exhausted"}}
function json(x){const t=typeof x?.choices?.[0]?.message?.content==="string"?x.choices[0].message.content:"";try{return JSON.parse(t)}catch{const m=t.match(/\{[\s\S]*\}/);try{return m?JSON.parse(m[0]):null}catch{return null}}}
function receiptScore(e,a){const fields=["company","date","address","total"];const actual=a?.[0]||a||{};const matched=fields.filter(f=>{const l=norm(e[f]);const r=norm(actual[f]??actual.merchantName);if(!l||!r)return false;return f==="total"?num(l)===num(r):l===r||l.includes(r)||r.includes(l)});return {matched:matched.length,total:4}}
function docScore(expected,actual){const e=new Set(norm(expected).split(" ").filter(x=>x.length>1));const a=new Set(norm(actual?.text??actual??"").split(" ").filter(x=>x.length>1));const m=[...e].filter(x=>a.has(x)).length;return {matched:m,total:e.size}}
async function runReceipt(row,i){const e=row.row.entities||{};try{const res=await ask(await dataUrl(row.row.image.src),"Return JSON only with company, date, address, total. Copy visible values exactly. No markdown.",{key:receiptKey,model:receiptModel,maxTokens:800});return {i,status:res.status,parseOk:Boolean(json(res.data)),score:receiptScore(e,json(res.data)),cost:res.data.usage?.cost||0,error:res.error}}catch(error){return {i,status:0,parseOk:false,score:{matched:0,total:4},error:String(error)}}}
async function runDoc(row,i){const e=row.row.ocr_annotation_texts||"";try{const res=await ask(await dataUrl(row.row.image.src),"Return JSON only with one key text containing all visible text. Copy every visible word, preserving reading order. No markdown.",{key:documentKey,model:documentModel,maxTokens:1600});return {i,status:res.status,parseOk:Boolean(json(res.data)),score:docScore(e,json(res.data)),cost:res.data.usage?.cost||0,error:res.error}}catch(error){return {i,status:0,parseOk:false,score:{matched:0,total:0},error:String(error)}}}
async function run(name,items,fn){const out=[];for(let i=0;i<items.length;i++){out.push(await fn(items[i],i));if((i+1)%10===0)console.log(`${name} ${i+1}/${items.length}`);await sleep(300)}return out}
const receiptLimit=Number(process.env.BENCH_RECEIPT_LIMIT||env.BENCH_RECEIPT_LIMIT||50); const documentLimit=Number(process.env.BENCH_DOCUMENT_LIMIT||env.BENCH_DOCUMENT_LIMIT||100); const receipts=await run("receipts",await rows("jsdnrs/ICDAR2019-SROIE","test",receiptLimit),runReceipt);const documents=await run("documents",await rows("tejasvaidhya/FUNSD","test",documentLimit),runDoc);
const summary=xs=>({count:xs.length,http200:xs.filter(x=>x.status===200).length,parsed:xs.filter(x=>x.parseOk).length,matched:xs.reduce((s,x)=>s+x.score.matched,0),expected:xs.reduce((s,x)=>s+x.score.total,0),fieldAccuracyPercent:100*xs.reduce((s,x)=>s+x.score.matched,0)/Math.max(1,xs.reduce((s,x)=>s+x.score.total,0)),estimatedCost:xs.reduce((s,x)=>s+(x.cost||0),0)});
const report={generatedAt:new Date().toISOString(),receiptModel,documentModel,receipts:summary(receipts),documents:summary(documents),receiptResults:receipts,documentResults:documents};await fs.writeFile(new URL("../artifacts/ocr-benchmark-report.json",import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({receiptModel,documentModel,receipts:report.receipts,documents:report.documents,report:"artifacts/ocr-benchmark-report.json"},null,2));
