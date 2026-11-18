// Invoked by the existing publication workflow only; never a separate scheduler.
import {fromRows} from '../web/model.js';
import {WEATHER_ZONES,weatherLocation,weatherCondition} from '../web/weather.js';
export async function publicationWeather(rows,{fetcher=fetch,now=new Date()}={}){
 const items=fromRows(rows),days={};
 if(!items.length)return {timeZone:'Australia/Sydney',provider:'Open-Meteo',fetchedAt:now.toISOString(),days};
 const first=items[0].start.slice(0,10),last=items.map(i=>i.endDate).sort().at(-1),dates=[];
 for(let date=new Date(first+'T12:00:00Z'),n=0;date.toISOString().slice(0,10)<=last&&n<60;n++,date=new Date(+date+86400000))dates.push(date.toISOString().slice(0,10));
 const locations=new Map(dates.map(date=>[date,weatherLocation(items,date).key]));
 await Promise.all([...new Set(locations.values())].filter(Boolean).map(async key=>{
  const zone=WEATHER_ZONES[key],url=new URL('https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({latitude:String(zone.latitude),longitude:String(zone.longitude),daily:'temperature_2m_max,temperature_2m_min,weather_code',timezone:'Australia/Sydney',forecast_days:'16'});
  try{const response=await fetcher(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)return;const data=await response.json(),daily=data.daily;
   if(!Array.isArray(daily?.time))return;
   daily.time.forEach((date,n)=>{const high=daily.temperature_2m_max?.[n],low=daily.temperature_2m_min?.[n],code=daily.weather_code?.[n];if(locations.get(date)===key&&typeof high==='number'&&typeof low==='number'&&Number.isFinite(high)&&Number.isFinite(low)&&high>=low&&low>=-80&&high<=65&&weatherCondition(code))days[date]={location:key,high,low,code};});
  }catch{} // A missing forecast must not prevent publishing the itinerary.
 }));
 return {timeZone:'Australia/Sydney',provider:'Open-Meteo',fetchedAt:now.toISOString(),days};
}
