// Build a localhost-only review copy. No credentials, Sheet writes or publication.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fromRows} from '../web/model.js';
const root=path.resolve(import.meta.dirname,'..');
const source=JSON.parse(await fs.readFile(path.join(root,'private/draft-source.json'),'utf8'));
if(!Array.isArray(source.rows)||!source.rows[0])throw new Error('Read the private Sheet into private/draft-source.json first.');
const ctx=vm.createContext({});
vm.runInContext(await fs.readFile(path.join(root,'scripts/publisher.js'),'utf8'),ctx);
const rows=source.mode==='published'?source.rows:[source.rows[0],...ctx.itinerarySnapshot(source.rows.slice(1))];
fromRows(rows); // Validate snapshot costs before replacing the local preview.
const dest=path.join(root,'private/draft');
await fs.mkdir(dest,{recursive:true});
for(const name of await fs.readdir(path.join(root,'web')))await fs.copyFile(path.join(root,'web',name),path.join(dest,name));
const stamp=Date.now();
let html=await fs.readFile(path.join(dest,'index.html'),'utf8');
html=html.replace(/<script src="https:\/\/accounts\.google\.com\/gsi\/client" async defer><\/script>/,'')
 .replace(/app\.js\?v=\d+/g,'app.js?v='+stamp).replace(/style\.css\?v=\d+/g,'style.css?v='+stamp)
 .replace('<title>Our itinerary</title>','<title>Sydney · private draft</title>')
 .replace('<h1>Our trip.</h1>','<h1>Sydney.</h1>');
await fs.writeFile(path.join(dest,'index.html'),html);
await fs.writeFile(path.join(dest,'draft-data.json'),JSON.stringify(rows));
const app=(await fs.readFile(path.join(dest,'app.js'),'utf8')).replace(/\.js\?v=\d+/g,'.js?v='+stamp);
const extension=`
// This extension exists only in ignored private/draft, never in web/.
if(!['127.0.0.1','localhost'].includes(location.hostname))throw new Error('Draft preview is localhost only.');
const draftRows=await (await fetch('./draft-data.json',{cache:'no-store'})).json();
render(fromRows(draftRows),{draft:true});
$('#status').textContent=${JSON.stringify(source.mode==='published'?'Private app draft · saved Published snapshot':'Private draft · not published')};
$('#plan .empty-note').textContent=${JSON.stringify(source.mode==='published'?'Saved Published snapshot · Sheet edits appear after the next publish.':'Unpublished draft · changes stay in the Sheet until publishing.')};
$('#budget .eyebrow').textContent=${JSON.stringify(source.mode==='published'?'Known costs':'Draft costs')};
$('#connect').replaceChildren(document.createTextNode('Open Google Sheet'),icon('arrow'));
$('#connect').onclick=()=>window.open(${JSON.stringify(source.sheetUrl)},'_blank','noopener');
$('#edit').href=${JSON.stringify(source.sheetUrl)};$('#edit').hidden=false;
const draftInfo=document.createElement('p');draftInfo.textContent='This local review shows saved Sheet values. It does not update Published or the shared app.';document.querySelector('.info-card').append(draftInfo);
`;
await fs.writeFile(path.join(dest,'app.js'),app+extension);
console.log('Prepared private/draft with '+(rows.length-1)+' items. Serve only on 127.0.0.1. Published is unchanged.');
