import {parseItemDetails,readBlock} from './details.js?v=2026111906';
import {forecastFromRows} from './weather.js?v=2026111906';
function publishedCost(value){
 const text=value==null?'':String(value).trim();
 if(!text)return {cost:undefined,approx:false};
 const approx=text.startsWith('≈');
 const numeric=text.replace(/^≈\s*/,'');
 if(!numeric.trim())throw new Error('Published snapshot contains an invalid cost.');
 const cost=Number(numeric);
 if(!Number.isFinite(cost)||cost<0)throw new Error('Published snapshot contains an invalid cost.');
 return {cost,approx};
}
export function fromRows(rows){
 const forecast=forecastFromRows(rows);
 return rows.slice(1).filter(r=>r[0]).map((r,index)=>{
  const details=parseItemDetails(r[8]);
  return {id:r[14],title:r[0],start:r[1]+'T'+(r[2]||'00:00:00'),untimed:!r[2],zone:r[15]||'Australia/Sydney',end:r[3]?(r[17]||r[1])+'T'+r[3]:'',endZone:r[16]||r[15]||'Australia/Sydney',endDate:r[17]||r[1],from:(r[5]||'').split(' → ')[0],to:(r[5]||'').split(' → ')[1]||r[5],transport:r[6],notes:readBlock(details.text,'weather').text,detailsSummary:details.summary,stops:details.stops,link:r[7],...publishedCost(r[4]),basis:r[11],rateDate:r[13],payment:r[18],confirmed:r[19]===true||r[19]==='TRUE',...(index===0?{snapshotWeather:forecast}:{})};
 }).sort((a,b)=>(a.start.slice(0,10)+(a.untimed?'99:99:99':a.start.slice(11))).localeCompare(b.start.slice(0,10)+(b.untimed?'99:99:99':b.start.slice(11))));
}
export function localLabel(value,zone){if(!value)return '';const [date,time]=value.split('T');const d=new Date(date+'T12:00:00Z');const label=new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(d);const tz=new Intl.DateTimeFormat('en-NZ',{timeZone:zone,timeZoneName:'short'}).formatToParts(d).find(p=>p.type==='timeZoneName').value;const [h,m]=time.split(':').map(Number);return `${label} · ${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'am':'pm'} ${tz}`;}
