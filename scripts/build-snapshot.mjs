// Calculation entry point for the EXISTING nightly/on-demand publisher. No Sheet writes.
// node scripts/build-snapshot.mjs private/source.json private/snapshot.json
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {publicationWeather} from './weather.mjs';
export async function buildSnapshot(source,options={}){
 const rows=source.rows||source;
 if(!Array.isArray(rows)||!Array.isArray(rows[0]))throw new Error('Expected header plus rows');
 const ctx=vm.createContext({});vm.runInContext(await fs.readFile(new URL('./publisher.js',import.meta.url),'utf8'),ctx);
 // Validate/convert once, then enrich that calculated snapshot. No draft promotion on Refresh.
 const calculated=[rows[0].slice(0,20),...ctx.itinerarySnapshot(rows.slice(1))];
 const weather=await publicationWeather(calculated,options);
 if(calculated.length>1)calculated[1][8]+='\n\n[itinerary-weather:v1]\n'+JSON.stringify(weather)+'\n[/itinerary-weather]';
 return {rows:calculated,weatherFetchedAt:weather.fetchedAt};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2),root=path.resolve(import.meta.dirname,'..','private');
 if(!input||!output||![input,output].every(p=>path.resolve(p).startsWith(root+path.sep)))throw new Error('Input and output must be inside this project’s ignored private directory.');
 const source=JSON.parse(await fs.readFile(input,'utf8')),snapshot=await buildSnapshot(source);
 await fs.writeFile(output,JSON.stringify(snapshot,null,2),{mode:0o600});
 console.log('Calculated 20-column snapshot with frozen forecast. Publish through the existing workflow; no Sheet was written.');
}
