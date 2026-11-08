// Coordinates stay in memory. Only a user-confirmed city/SCG region is saved.
export const CITIES=[
 ['astana','Астана','Astana','Астана',51.1694,71.4491,'Север'],['almaty','Алматы','Almaty','Алматы',43.2389,76.8897,'Юг'],['shymkent','Шымкент','Shymkent','Шымкент',42.3155,69.5869,'Юг'],
 ['karaganda','Караганда','Karaganda','Қарағанды',49.8047,73.1094,'Центр'],['aktobe','Актобе','Aktobe','Ақтөбе',50.2839,57.167,'Запад'],['atyrau','Атырау','Atyrau','Атырау',47.0945,51.9238,'Запад'],['aktau','Актау','Aktau','Ақтау',43.6532,51.1975,'Запад'],['oral','Уральск','Oral','Орал',51.2278,51.3865,'Запад'],
 ['oskemen','Усть-Каменогорск','Oskemen','Өскемен',49.9483,82.6275,'Восток'],['semey','Семей','Semey','Семей',50.4111,80.2275,'Восток'],['pavlodar','Павлодар','Pavlodar','Павлодар',52.2873,76.9674,'Север'],['petropavl','Петропавловск','Petropavl','Петропавл',54.8753,69.1623,'Север'],['kostanay','Костанай','Kostanay','Қостанай',53.2198,63.6354,'Север'],['kokshetau','Кокшетау','Kokshetau','Көкшетау',53.2833,69.3833,'Север'],
 ['taraz','Тараз','Taraz','Тараз',42.9,71.3667,'Юг'],['turkistan','Туркестан','Turkistan','Түркістан',43.3019,68.2692,'Юг'],['kyzylorda','Кызылорда','Kyzylorda','Қызылорда',44.8488,65.4823,'Юг'],['taldykorgan','Талдыкорган','Taldykorgan','Талдықорған',45.0156,78.3739,'Юг'],['konaev','Конаев','Konaev','Қонаев',43.868,77.063,'Юг'],['zhezkazgan','Жезказган','Zhezkazgan','Жезқазған',47.8043,67.7144,'Центр'],
 ['temirtau','Темиртау','Temirtau','Теміртау',50.0549,72.9646,'Центр'],['ekibastuz','Экибастуз','Ekibastuz','Екібастұз',51.7298,75.3266,'Север'],['rudny','Рудный','Rudny','Рудный',52.9729,63.1168,'Север'],['balkhash','Балхаш','Balkhash','Балқаш',46.8481,74.995,'Центр'],['ridder','Риддер','Ridder','Риддер',50.3441,83.5129,'Восток'],['zhetisay','Жетысай','Zhetisay','Жетісай',40.775,68.327,'Юг'],['zhanaozen','Жанаозен','Zhanaozen','Жаңаөзен',43.3412,52.8619,'Запад'],['kaskelen','Каскелен','Kaskelen','Қаскелең',43.199,76.622,'Юг']
];
export const REGIONS={'Север':['North','Солтүстік'],'Юг':['South','Оңтүстік'],'Запад':['West','Батыс'],'Восток':['East','Шығыс'],'Центр':['Central','Орталық']};
export function cityName(c,lang){return c?.[lang==='en'?2:lang==='kk'?3:1]||'';}
export function regionName(region,lang){return lang==='ru'?region:REGIONS[region]?.[lang==='en'?0:1]||region;}
export function nearestCity(lat,lon,accuracy=0){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(accuracy)||accuracy<0||accuracy>15000||lat<40||lat>56||lon<46||lon>88)return null;
 const rad=x=>x*Math.PI/180;
 const distance=c=>{const a=Math.sin(rad(c[4]-lat)/2)**2+Math.cos(rad(lat))*Math.cos(rad(c[4]))*Math.sin(rad(c[5]-lon)/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));};
 const sorted=CITIES.map(c=>({city:c,km:distance(c)})).sort((a,b)=>a.km-b.km);
 // Suggest only nearby cities, never claim an exact address or rural administrative region.
 return sorted[0].km<=25?sorted[0]:null;
}
export function savedLocation(){try{const x=JSON.parse(localStorage.getItem('scg-location')||'null');return x&&typeof x.city==='string'&&x.city.length<=100&&Object.hasOwn(REGIONS,x.region)?{city:x.city,region:x.region}:null;}catch{return null;}}
export function saveLocation(city,region){if(!city?.trim()||city.length>100||!Object.hasOwn(REGIONS,region))throw Error('LOCATION_INVALID');const x={city:city.trim(),region};try{localStorage.setItem('scg-location',JSON.stringify(x));}catch{}window.dispatchEvent(new CustomEvent('scg:location',{detail:x}));return x;}
