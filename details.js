// Versioned optional metadata travels inside the existing Notes column.
export function readBlock(note,kind){
 const text=String(note??''),start='[itinerary-'+kind+':v1]',end='[/itinerary-'+kind+']';
 const from=text.indexOf(start),to=text.indexOf(end,from+start.length);
 if(from<0||to<0)return {text,value:null};
 let value=null;try{value=JSON.parse(text.slice(from+start.length,to));}catch{}
 return {text:(text.slice(0,from)+text.slice(to+end.length)).trim(),value};
}
export function writeBlock(note,kind,value){const clean=readBlock(note,kind).text;return clean+'\n\n[itinerary-'+kind+':v1]\n'+JSON.stringify(value)+'\n[/itinerary-'+kind+']';}
export function appleMapLink(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='maps.apple.com'||u.username||u.password||u.href.length>1800)return null;
 const status=u.searchParams.has('place-id')||u.searchParams.has('auid')?'place':u.searchParams.has('coordinate')||u.searchParams.has('ll')||u.searchParams.has('address')?'address':'search';
 return {url:u.href,mapStatus:status};}catch{return null;}
}
export function parseItemDetails(note){
 const block=readBlock(note,'details'),data=block.value;
 const clean=(value,max)=>typeof value==='string'?value.slice(0,max):'';
 function stop(s,depth=0){if(!s||typeof s!=='object'||depth>1)return null;const name=clean(s.name,120),address=clean(s.address,220),link=appleMapLink(s.url);
 const children=Array.isArray(s.children)&&depth===0?s.children.slice(0,6).map(x=>stop(x,1)).filter(Boolean):[];
 if(!name||(!link&&!children.length))return null;
 return {name,address,hint:clean(s.hint,100),...(link||{}),children};}
 const stops=data&&Array.isArray(data.stops)?data.stops.slice(0,20).map(s=>stop(s)).filter(Boolean):[];
 return {text:block.text,summary:clean(data?.summary,300),stops};
}
