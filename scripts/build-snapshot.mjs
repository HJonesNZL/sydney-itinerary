// Calculation helper for the EXISTING nightly/on-demand publisher. No Sheet writes.
// node scripts/build-snapshot.mjs private/source.json private/snapshot.json
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {publicationWeather} from './weather.mjs';
const [input,output]=process.argv.slice(2),root=path.resolve(import.meta.dirname,'..','private');
if(!input||!output||![input,output].every(p=>path.resolve(p).startsWith(root+path.sep)))throw new Error('Input and output must be inside this project’s ignored private directory.');
const source=JSON.parse(await fs.readFile(input,'utf8')),rows=source.rows||source;
if(!Array.isArray(rows)||!Array.isArray(rows[0]))throw new Error('Expected header plus rows');
const ctx=vm.createContext({});vm.runInContext(await fs.readFile(new URL('./publisher.js',import.meta.url),'utf8'),ctx);
// Cost conversion/validation precedes weather; calculate only once.
const calculated=[rows[0],...ctx.itinerarySnapshot(rows.slice(1))];
const weather=await publicationWeather(calculated);
if(calculated.length>1)calculated[1][8]+='\n\n[itinerary-weather:v1]\n'+JSON.stringify(weather)+'\n[/itinerary-weather]';
await fs.writeFile(output,JSON.stringify({rows:calculated,weatherFetchedAt:weather.fetchedAt},null,2),{mode:0o600});
console.log('Calculated 20-column snapshot. Publish through the existing workflow; no Sheet was written.');
