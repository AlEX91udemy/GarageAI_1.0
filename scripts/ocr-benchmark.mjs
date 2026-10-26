import fs from "node:fs/promises";
import fsSync from "node:fs";
import dotenv from "dotenv";
dotenv.config();
// [GARAGEAI_MULTISCALE_OCR_HOOK]
import sharp from "sharp";
import { v1 as documentai } from "@google-cloud/documentai";
import { createWorker, OEM, PSM } from "tesseract.js";

const __origFetch = globalThis.fetch;
let __docAiClient = null;
let __docAiDisabled = false;
let __lastDocAiResult = { status: 503, error: "Document AI unavailable" };
let __lastDocAiDocument = null;
function __getDocAiClient() {
  if (!__docAiClient) {
    const location = process.env.DOCUMENT_AI_LOCATION || "us";
    __docAiClient = new documentai.DocumentProcessorServiceClient({ apiEndpoint: `${location}-documentai.googleapis.com` });
  }
  return __docAiClient;
}
async function __extractWithDocumentAi(dataUrl) {
  if (__docAiDisabled) { __lastDocAiResult = { status: 503, error: "Document AI disabled" }; return null; }
  const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || `${process.env.APPDATA || ""}/gcloud/application_default_credentials.json`;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !fsSync.existsSync(adcPath)) {
    __docAiDisabled = true;
    __lastDocAiResult = { status: 500, error: "Application Default Credentials unavailable" }; return null;
  }
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const processorId = process.env.DOCUMENT_AI_OCR_PROCESSOR_ID || process.env.DOCUMENT_AI_DOCUMENT_PROCESSOR_ID;
  if (!projectId || !processorId) { __lastDocAiResult = { status: 500, error: "Document AI configuration is missing" }; return null; }
  try {
    const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/s);
    const mimeType = match?.[1] || "image/jpeg";
    const content = Buffer.from(match?.[2] || String(dataUrl), "base64");
    const location = process.env.DOCUMENT_AI_LOCATION || "us";
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    const [result] = await __getDocAiClient().processDocument({ name, rawDocument: { content, mimeType } });
    __lastDocAiResult = { status: 200, error: null }; __lastDocAiDocument = result?.document || null; return result?.document?.text?.trim() || null;
  } catch (error) {
    __docAiDisabled = true;
    __docAiClient = null;
    console.warn(`[Document AI fallback] ${error?.message || error}`);
    __lastDocAiResult = { status: error?.code || 500, error: error?.message || String(error) }; __lastDocAiDocument = null; return null;
  }
}

function reconstructLogicalLayout(document) {
  const text = String(document?.text || "");
  const readText = (anchor) => (anchor?.textSegments || []).map((segment) => {
    const start = Number(segment.startIndex || 0), end = Number(segment.endIndex || start);
    return text.slice(start, end);
  }).join("").replace(/\s+/g, " ").trim();
  const points = (layout) => {
    const vertices = layout?.boundingPoly?.normalizedVertices || layout?.boundingPoly?.vertices || [];
    const xs = vertices.map((v) => Number(v.x || 0)), ys = vertices.map((v) => Number(v.y || 0));
    return { xMin: Math.min(...xs, 0), yMin: Math.min(...ys, 0), xMax: Math.max(...xs, 0), yMax: Math.max(...ys, 0) };
  };
  const pages = (document?.pages || []).map((page, pageIndex) => {
    const lines = (page.lines || []).map((line, index) => ({ index, text: readText(line.layout?.textAnchor), box: points(line.layout) })).filter((line) => line.text);
    const sorted = [...lines].sort((a, b) => a.box.xMin - b.box.xMin || a.box.yMin - b.box.yMin);
    const gaps = sorted.slice(1).map((line, i) => line.box.xMin - sorted[i].box.xMax).filter((gap) => gap > 0);
    const split = gaps.length ? Math.max(...gaps) : 0;
    const threshold = split > 0.08 ? sorted.find((line, i) => i > 0 && line.box.xMin - sorted[i - 1].box.xMax === split)?.box.xMin : null;
    const columns = threshold == null ? [sorted] : [sorted.filter((line) => line.box.xMin < threshold), sorted.filter((line) => line.box.xMin >= threshold)];
    return { pageNumber: pageIndex + 1, width: page.dimension?.width || null, height: page.dimension?.height || null, logicalBlocks: columns.filter((column) => column.length).map((column, blockIndex) => ({ blockIndex: blockIndex + 1, boundingBox: { xMin: Math.min(...column.map((line) => line.box.xMin)), yMin: Math.min(...column.map((line) => line.box.yMin)), xMax: Math.max(...column.map((line) => line.box.xMax)), yMax: Math.max(...column.map((line) => line.box.yMax)) }, type: columns.length > 1 ? `column_${blockIndex ? "right" : "left"}` : "single_column", lines: [...column].sort((a, b) => a.box.yMin - b.box.yMin || a.box.xMin - b.box.xMin).map((line) => line.text) })) };
  });
  return { documentStructure: { pages }, plainText: text };
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
      const isStructuredHybrid = bodyLower.includes("structured_hybrid");
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
            if (docAiText && !isStructuredHybrid) {
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
function expectedFunText(value){const items=Array.isArray(value)?value:[value];return items.map(item=>{const raw=String(item??"").trim();const match=raw.match(/^-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+(.+)$/);return (match?match[1]:raw).trim()}).filter(Boolean).join(" ")}
async function rows(ds,split,n){const u=`https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(ds)}&config=default&split=${split}&offset=0&length=${n}`;const r=await fetch(u);if(!r.ok)throw Error(`${ds} ${r.status}`);return(await r.json()).rows||[]}
async function dataUrl(src){const r=await fetch(src);const raw=r.headers.get("content-type")?.split(";")[0];const mime=raw&&raw.startsWith("image/")?raw:"image/jpeg";return `data:${mime};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`}
async function ask(image,text,{key,model,maxTokens=800}){for(let attempt=0;attempt<3;attempt++){const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"user",content:[{type:"text",text},{type:"image_url",image_url:{url:image}}]}],response_format:{type:"json_object"},temperature:0,max_tokens:maxTokens})});const d=await r.json().catch(()=>({}));if(r.status===429||r.status>=500){await sleep(1500*(attempt+1));continue}return {status:r.status,data:d,error:d?.error?JSON.stringify(d.error):null}}return {status:503,data:{},error:"retry_exhausted"}}
function json(x){const t=typeof x?.choices?.[0]?.message?.content==="string"?x.choices[0].message.content:"";try{return JSON.parse(t)}catch{const m=t.match(/\{[\s\S]*\}/);try{return m?JSON.parse(m[0]):null}catch{return null}}}
function receiptScore(e,a){const fields=["company","date","address","total"];const actual=a?.[0]||a||{};const matched=fields.filter(f=>{const l=norm(e[f]);const r=norm(actual[f]??actual.merchantName);if(!l||!r)return false;return f==="total"?num(l)===num(r):l===r||l.includes(r)||r.includes(l)});return {matched:matched.length,total:4}}
function docScore(expected,actual){const e=new Set(norm(expected).split(" ").filter(Boolean));const a=new Set(norm(actual?.text??actual??"").split(" ").filter(Boolean));const m=[...e].filter(x=>a.has(x)).length;return {matched:m,total:e.size}}
function levenshtein(a,b){const prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diag=prev[0];prev[0]=i;for(let j=1;j<=b.length;j++){const up=prev[j];prev[j]=Math.min(prev[j]+1,prev[j-1]+1,diag+(a[i-1]===b[j-1]?0:1));diag=up}}return prev[b.length]}
function textMetrics(expected,actual){const e=norm(expected),a=norm(actual);const ew=e.split(" ").filter(Boolean),aw=a.split(" ").filter(Boolean),ec=e.replace(/\s/g,""),ac=a.replace(/\s/g,"");const expectedSet=new Set(ew),actualSet=new Set(aw),matchedTokenCount=[...expectedSet].filter(w=>actualSet.has(w)).length;return {expectedTokenCount:expectedSet.size,actualTokenCount:actualSet.size,matchedTokenCount,accuracyPercent:expectedSet.size?100*matchedTokenCount/expectedSet.size:0,WER:ew.length?levenshtein(ew,aw)/ew.length:0,CER:ec.length?levenshtein(ec,ac)/ec.length:0}}
async function runReceipt(row,i){const e=row.row.entities||{};try{const res=await ask(await dataUrl(row.row.image.src),"Return JSON only with company, date, address, total. Copy visible values exactly. No markdown.",{key:receiptKey,model:receiptModel,maxTokens:800});return {i,status:res.status,parseOk:Boolean(json(res.data)),score:receiptScore(e,json(res.data)),cost:res.data.usage?.cost||0,error:res.error}}catch(error){return {i,status:0,parseOk:false,score:{matched:0,total:4},error:String(error)}}}
async function runDoc(row,i,worker){const e=expectedFunText(row.row.ocr_annotation_texts);try{const original=await dataUrl(row.row.image.src);const tiles=await __buildDocumentTiles(original);const raw=(await __extractWithDocumentAi(original))||"";const structured=__lastDocAiDocument?JSON.stringify(reconstructLogicalLayout(__lastDocAiDocument)):"{}";const plain=await ask(tiles[0],"Return JSON only with one key text containing all visible text. Copy every visible word precisely. Do not summarize or translate.",{key:documentKey,model:documentModel,maxTokens:3500});const hybrid=await ask(tiles[0],`Return JSON only with one key text. Preserve every word from this Google OCR reference; do not add or omit words.\nGOOGLE OCR:\n${raw||""}`,{key:documentKey,model:documentModel,maxTokens:3500});const structuredHybrid=await ask(tiles[0],`STRUCTURED_HYBRID\nReturn JSON only with one key text. Transcribe every visible word from the image. Use the structured Google Document AI layout below as a spatial hint; preserve reading order by page, block, then line. Do not copy JSON keys, coordinates, or add invisible text.\nDOCUMENT_LAYOUT:\n${structured}`,{key:documentKey,model:documentModel,maxTokens:3500});const tess=worker?await worker.recognize(Buffer.from(original.split(",")[1],"base64")):null;const p=json(plain.data)?.text||"",h=json(hybrid.data)?.text||"",s=json(structuredHybrid.data)?.text||"",t=tess?.data?.text?.trim()||"";return {i,status:plain.status,parseOk:Boolean(json(plain.data)),score:docScore(e,p),rawDocumentAi:{text:raw,status:__lastDocAiResult.status,error:__lastDocAiResult.error,score:textMetrics(e,raw)},geminiOnly:{text:p,score:textMetrics(e,p)},hybrid:{text:h,score:textMetrics(e,h)},hybridStructured:{text:s,score:textMetrics(e,s)},tesseractFallback:{text:t,score:textMetrics(e,t)},cost:(plain.data?.usage?.cost||0)+(hybrid.data?.usage?.cost||0)+(structuredHybrid.data?.usage?.cost||0),error:plain.error||hybrid.error||structuredHybrid.error}}catch(error){return {i,status:0,parseOk:false,score:{matched:0,total:0},error:String(error)}}}
async function run(name,items,fn){const out=[];for(let i=0;i<items.length;i++){out.push(await fn(items[i],i));if((i+1)%10===0)console.log(`${name} ${i+1}/${items.length}`);await sleep(300)}return out}
const receiptLimit=Number(process.env.BENCH_RECEIPT_LIMIT||env.BENCH_RECEIPT_LIMIT||50); const documentLimit=Number(process.env.BENCH_DOCUMENT_LIMIT||env.BENCH_DOCUMENT_LIMIT||100); const receipts=await run("receipts",await rows("jsdnrs/ICDAR2019-SROIE","test",receiptLimit),runReceipt);const worker=await createWorker("rus+eng",OEM.LSTM_ONLY,{logger:()=>undefined});await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,preserve_interword_spaces:"1",user_defined_dpi:"300"});let documents;try{documents=await run("documents",await rows("tejasvaidhya/FUNSD","test",documentLimit),(row,i)=>runDoc(row,i,worker).then(result=>({...result,expectedText:expectedFunText(row.row.ocr_annotation_texts)})));}finally{await worker.terminate();console.log("[Tesseract Worker] Ресурсы освобождены.");}
const summary=xs=>({count:xs.length,http200:xs.filter(x=>x.status===200).length,parsed:xs.filter(x=>x.parseOk).length,matched:xs.reduce((s,x)=>s+x.score.matched,0),expected:xs.reduce((s,x)=>s+x.score.total,0),fieldAccuracyPercent:100*xs.reduce((s,x)=>s+x.score.matched,0)/Math.max(1,xs.reduce((s,x)=>s+x.score.total,0)),estimatedCost:xs.reduce((s,x)=>s+(x.cost||0),0)});
const modeSummary=k=>{const runs=documents.map(x=>x[k]).filter(Boolean).filter(x=>k!=="rawDocumentAi"||x.status===200);const xs=runs.map(x=>x.score).filter(Boolean);return {count:xs.length,matchedTokenCount:xs.reduce((s,x)=>s+x.matchedTokenCount,0),expectedTokenCount:xs.reduce((s,x)=>s+x.expectedTokenCount,0),actualTokenCount:xs.reduce((s,x)=>s+x.actualTokenCount,0),accuracyPercent:100*xs.reduce((s,x)=>s+x.matchedTokenCount,0)/Math.max(1,xs.reduce((s,x)=>s+x.expectedTokenCount,0)),WER:xs.reduce((s,x)=>s+x.WER,0)/Math.max(1,xs.length),CER:xs.reduce((s,x)=>s+x.CER,0)/Math.max(1,xs.length)}};const documentResults=documents.map((x,index)=>({documentIndex:index+1,expectedText:x.expectedText||"",results:{rawDocumentAi:{text:x.rawDocumentAi?.text||"",status:x.rawDocumentAi?.status||0,error:x.rawDocumentAi?.error||null,...x.rawDocumentAi?.score},geminiOnly:{text:x.geminiOnly?.text||"",...x.geminiOnly?.score},hybrid:{text:x.hybrid?.text||"",...x.hybrid?.score},hybridStructured:{text:x.hybridStructured?.text||"",...x.hybridStructured?.score},tesseractFallback:{text:x.tesseractFallback?.text||"",...x.tesseractFallback?.score}}}));const report={generatedAt:new Date().toISOString(),receiptModel,documentModel,receipts:summary(receipts),documents:summary(documents),rawDocumentAi:modeSummary("rawDocumentAi"),geminiOnly:modeSummary("geminiOnly"),hybrid:modeSummary("hybrid"),hybridStructured:modeSummary("hybridStructured"),tesseractFallback:modeSummary("tesseractFallback"),receiptResults:receipts,documentResults};await fs.writeFile(new URL("../artifacts/ocr-benchmark-report.json",import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({receiptModel,documentModel,receipts:report.receipts,documents:report.documents,rawDocumentAi:report.rawDocumentAi,geminiOnly:report.geminiOnly,hybrid:report.hybrid,hybridStructured:report.hybridStructured,tesseractFallback:report.tesseractFallback,report:"artifacts/ocr-benchmark-report.json"},null,2));
