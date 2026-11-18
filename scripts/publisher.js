/* One pure snapshot calculation shared by Apps Script and verification. */
function itinerarySnapshot(source) {
 const ids=new Set();const output=[];
 for(const raw of source){
  if(!raw[0])continue;
  const r=Array.from({length:20},(_,i)=>raw[i]??'');
  if(!r[14])r[14]=r[0]+'|'+r[1]+'|'+r[2];
  if(ids.has(r[14]))throw new Error('Duplicate itinerary ID');ids.add(r[14]);
  // Research selections stay private until checked; deliberate tentative ideas retain ordinary IDs.
  if(String(r[14]).startsWith('private-pick:')&&!(raw[19]===true||raw[19]==='TRUE'))continue;
  if(!validLocal(r[1]+'T00:00:00'))throw new Error('Itinerary item needs Activity and valid Date');
  for(const [date,time,zone] of [[r[1],r[2],r[15]],[r[17]||r[1],r[3],r[16]||r[15]]]){
   if(time&&(!validLocal(date+'T'+time)||!['Australia/Sydney','Pacific/Auckland'].includes(zone)))throw new Error('Invalid local time or zone: '+r[0]);
  }
  if(r[4]!==''||r[9]!==''){
   if(!['Per person','Total'].includes(r[11]))throw new Error('Cost basis must be Per person or Total');
   if(r[4]!==''){if(!Number.isFinite(Number(r[4]))||Number(r[4])<0)throw new Error('Invalid NZD cost');r[4]=Number(r[4]);}
   else {const amount=Number(r[9]);if(!Number.isFinite(amount)||amount<0)throw new Error('Invalid original cost');
    if(r[10]==='NZD')r[4]=amount;
    else if(r[10]==='AUD'&&Number.isFinite(Number(r[12]))&&Number(r[12])>0&&validLocal(r[13]+'T00:00:00'))r[4]='≈ '+(Math.round(amount*Number(r[12])*100)/100).toFixed(2);
    else throw new Error('AUD needs a dated positive conversion rate; currency must be AUD or NZD');
   }
  }
  r[19]=raw[19]===true||raw[19]==='TRUE';output.push(r);
 }
 return output.sort((a,b)=>(a[1]+(a[2]||'99:99:99')).localeCompare(b[1]+(b[2]||'99:99:99')));
}
function validLocal(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(value))return false;const d=new Date(value+'Z');return !isNaN(d)&&d.toISOString().slice(0,19)===value;}
