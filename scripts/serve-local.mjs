// Local Mac origin only. External HTTPS routing requires separate explicit approval.
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=new Set(['index.html','style.css','app.js','model.js','config.js','details.js','weather.js','offline.js','sw.js','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
export function localServer({directory=root,releasePath=path.join(directory,'private/public-release.json'),approvalPath=path.join(directory,'private/public-release.approval.json')}={}){
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const url=new URL(req.url,'http://localhost');
  try{
   if(url.pathname==='/api/published'){
    const bytes=await fs.readFile(releasePath),approval=JSON.parse(await fs.readFile(approvalPath,'utf8'));
    if(approval.sha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('Unreviewed release');
    const data=JSON.parse(bytes);if(!Array.isArray(data.rows)||!Number.isFinite(Date.parse(data.publishedAt)))throw Error('Invalid release');
    // Reconstruct the envelope: no internal approval notes or metadata can leak.
    const body=JSON.stringify({rows:data.rows,publishedAt:data.publishedAt});res.writeHead(200,{'Content-Type':'application/json'});res.end(req.method==='HEAD'?'':body);return;
   }
   const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
   if(!assets.has(name)){res.writeHead(404);res.end();return;}
   const bytes=await fs.readFile(path.join(directory,'web',name));res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream'});res.end(req.method==='HEAD'?'':bytes);
  }catch{res.writeHead(url.pathname==='/api/published'?503:404);res.end(url.pathname==='/api/published'?'Reviewed publication not ready':'Not found');}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))localServer().listen(4180,'127.0.0.1',()=>console.log('Local-only origin http://127.0.0.1:4180 — no external exposure enabled'));
