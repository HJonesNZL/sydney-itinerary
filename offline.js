// Browser-local private snapshot only. Never store Google access/refresh tokens.
const DATABASE='itinerary-private-v1';let queue=Promise.resolve();
function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshot');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function transaction(mode,operation){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('snapshot',mode),request=operation(tx.objectStore('snapshot'));let value;request.onsuccess=()=>value=request.result;tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
export async function readSavedSnapshot(){try{return await transaction('readonly',store=>store.get('last-good'));}catch{return null;}}
export function saveSnapshot(rows,{syncedAt=new Date().toISOString(),kind='published'}={}){
 const record={rows:rows.slice(0,1000).map(r=>r.slice(0,20)),syncedAt,kind};
 queue=queue.catch(()=>{}).then(()=>transaction('readwrite',store=>store.put(record,'last-good')));
 return queue.then(()=>record);
}
export function clearSavedSnapshot(){queue=queue.catch(()=>{}).then(()=>transaction('readwrite',store=>store.clear()));return queue;}
export async function prepareOfflineShell(){if(!('serviceWorker' in navigator))return false;try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;return true;}catch{return false;}}
