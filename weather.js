import {readBlock} from './details.js?v=2026111907';
export const WEATHER_ZONES={sydney:{name:'Sydney',latitude:-33.8688,longitude:151.2093},copacabana:{name:'Copacabana',latitude:-33.48692,longitude:151.43587}};
export function weatherLocation(items,date){
 const stays=items.filter(i=>i.start.slice(0,10)<=date&&i.endDate>=date&&i.endDate>i.start.slice(0,10)&&/beach|coast|copacabana|killcare/i.test(i.title+' '+i.from));
 if(stays.length){const stay=stays[0];if(date===stay.endDate)return {key:null,reason:'Return day: forecast location varies'};
 if(/copacabana/i.test(stay.from)&&!/\bor\b|killcare|hardys/i.test(stay.from))return {key:'copacabana'};
 return {key:null,reason:'Beach location not settled'};}
 return {key:'sydney'};
}
export function weatherCondition(code){
 if(code===0||code===1)return {icon:'sun',label:code===0?'Clear':'Mainly clear'};
 if([2,3,45,48].includes(code))return {icon:'cloud',label:code===2?'Partly cloudy':code===3?'Cloudy':'Fog'};
 if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return {icon:'rain',label:'Rain'};
 if([71,73,75,77,85,86].includes(code))return {icon:'snow',label:'Snow'};
 if([95,96,97,99].includes(code))return {icon:'storm',label:'Thunderstorms'};
 return null;
}
export function forecastFromRows(rows){
 for(const r of rows.slice(1)){const value=readBlock(r[8],'weather').value;
 if(value&&value.timeZone==='Australia/Sydney'&&typeof value.fetchedAt==='string'&&Number.isFinite(Date.parse(value.fetchedAt))&&value.days&&typeof value.days==='object')return value;}
 return null;
}
export function weatherForDay(forecast,items,date){
 const location=weatherLocation(items,date);if(!location.key)return {available:false,label:location.reason};
 const d=forecast?.days?.[date],condition=weatherCondition(d?.code);
 if(!d||d.location!==location.key||typeof d.high!=='number'||typeof d.low!=='number'||!Number.isFinite(d.high)||!Number.isFinite(d.low)||d.high<d.low||d.low< -80||d.high>65||!condition)return {available:false,label:'Forecast unavailable'};
 return {available:true,...condition,high:Math.round(d.high),low:Math.round(d.low),location:WEATHER_ZONES[location.key].name,asOf:forecast.fetchedAt};
}
