import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.cwd(), "artifacts", "scanner-fixtures");
const headers = { "User-Agent": "GarageAI-scanner-fixtures/1.0" };
async function api(term) {
  const p = new URLSearchParams({ action:"query", generator:"search", gsrsearch:term, gsrnamespace:"6", gsrlimit:"50", prop:"imageinfo", iiprop:"url|mime|extmetadata", format:"json" });
  const d = await (await fetch("https://commons.wikimedia.org/w/api.php?"+p,{headers})).json();
  return Object.values(d.query?.pages||{}).map(x=>({title:x.title,url:x.imageinfo?.[0]?.url,mime:x.imageinfo?.[0]?.mime,meta:x.imageinfo?.[0]?.extmetadata||{}})).filter(x=>x.url);
}
async function run(type, terms, count, ok) {
  const all=[]; for (const t of terms) all.push(...await api(t)); const seen=new Set(); const c=all.filter(x=>ok(x)&&!seen.has(x.url)&&(seen.add(x.url))).slice(0,count);
  if(c.length<count) throw Error(type+" candidates "+c.length);
  const dir=path.join(root,type); await fs.rm(dir,{recursive:true,force:true}); await fs.mkdir(dir,{recursive:true}); const out=[];
  for(let i=0;i<c.length;i+=5){ await Promise.all(c.slice(i,i+5).map(async(x,j)=>{const n=i+j+1; const ext=x.mime==='application/pdf'?'pdf':(x.mime?.split('/')[1]||'jpg').replace('jpeg','jpg'); const name=String(n).padStart(3,'0')+'-'+path.basename(x.title).replace(/[^\w.-]+/g,'_')+'.'+ext; const r=await fetch(x.url,{headers}); if(!r.ok) throw Error(r.status+' '+x.url); const b=Buffer.from(await r.arrayBuffer()); await fs.writeFile(path.join(dir,name),b); out.push({filename:path.posix.join(type,name),source:x.url,title:x.title,mime:x.mime,license:x.meta.LicenseShortName?.value||x.meta.License?.value||null,bytes:b.length}); })); }
  return out;
}
const sts=await run('sts',['vehicle registration certificate','motor vehicle register certificate','vehicle registration document','PTS automobile registration certificate'],50,x=>/vehicle|motor|automobile|car|PTS|ORV|Fahrzeug|Certificado|Potvrda/i.test(x.title)&&!/(voter|draft|election)/i.test(x.title)&&/image\/(jpeg|png)/.test(x.mime));
const vin=await run('vin',['VIN plate','VIN number','vehicle identification plate','chassis number'],50,x=>/(VIN|chassis|identification plate)/i.test(x.title)&&/image\/(jpeg|png)/.test(x.mime));
const service=await run('service',['automobile repair manual','automotive wiring manual','battery service manual','vehicle maintenance manual','automobile laboratory manual'],50,x=>/(automobile|automotive|vehicle|battery|repair|service)/i.test(x.title)&&/^(application\/pdf|image\/(jpeg|png))$/.test(x.mime));
const manifest={generatedAt:new Date().toISOString(),sourceBacked:true,counts:{receipt:50,sts:sts.length,vin:vin.length,service:service.length},documents:[...sts,...vin,...service]};
await fs.writeFile(path.join(root,'internet-sources.json'),JSON.stringify(manifest,null,2)+'\n'); console.log(JSON.stringify(manifest.counts));
