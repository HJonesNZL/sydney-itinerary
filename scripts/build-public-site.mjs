// Package only an explicitly reviewed release for static hosting. No upload/deploy.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function buildPublicSite({releasePath=path.join(root,'private/public-release.json'),approvalPath=path.join(root,'private/public-release.approval.json'),output=path.join(root,'private/public-site')}={}){
 const privateRoot=path.join(root,'private')+path.sep;
 if(!path.resolve(output).startsWith(privateRoot))throw Error('Build output must stay in ignored private directory');
 const bytes=await fs.readFile(releasePath),approval=JSON.parse(await fs.readFile(approvalPath,'utf8'));
 if(approval.sha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('Release changed or not approved');
 const release=JSON.parse(bytes);if(!Array.isArray(release.rows)||!Number.isFinite(Date.parse(release.publishedAt)))throw Error('Invalid reviewed release');
 await fs.mkdir(output,{recursive:true});
 for(const name of await fs.readdir(path.join(root,'web')))await fs.copyFile(path.join(root,'web',name),path.join(output,name));
 await fs.writeFile(path.join(output,'config.js'),"// Deliberately reviewed public snapshot only.\nexport const config = {snapshotUrl:'./published.json',autoLoad:true};\n");
 const html=await fs.readFile(path.join(output,'index.html'),'utf8');await fs.writeFile(path.join(output,'index.html'),html.replace('Private itinerary','Our itinerary').replace('<span class="private-label"><span data-icon="lock"','<span class="private-label"><span data-icon="route"').replace('<title>Our itinerary</title>','<title>Sydney · Our itinerary</title>').replace('<h1>Our trip.</h1>','<h1>Sydney.</h1>'));
 await fs.writeFile(path.join(output,'published.json'),JSON.stringify({rows:release.rows,publishedAt:release.publishedAt}));
 await fs.writeFile(path.join(output,'.nojekyll'),'');
 return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await buildPublicSite());
