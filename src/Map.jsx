import {useEffect,useRef,useState} from 'react'
import {Map as LibreMap,AttributionControl,NavigationControl,setWorkerUrl} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {openingStatus} from './model'
import {icons,categoryIcon} from './Icon'
import Icon from './Icon'
setWorkerUrl(import.meta.env.BASE_URL+'assets/map-worker.mjs')
const bounds={'全香港':[[114.12,22.26],[114.215,22.39]],'港島':[[114.115,22.255],[114.215,22.30]],'九龍':[[114.145,22.287],[114.216,22.35]],'新界及離島':[[113.88,22.20],[114.34,22.51]]}
function data(places,now,selected){return {type:'FeatureCollection',features:places.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{id:p.id,image:p.id+(openingStatus(p,now).closed?'-closed':''),selected:p.id===selected?.id}}))}}
function drawMarker(p,closed,photo) {
 const canvas=document.createElement('canvas');canvas.width=100;canvas.height=120
 const c=canvas.getContext('2d'),ink=closed?'#676967':p.kind==='attraction'?'#205247':'#ba3b30',cream='#fffbf0'
 c.fillStyle=ink;c.beginPath();c.moveTo(34,87);c.lineTo(50,116);c.lineTo(66,87);c.fill()
 c.fillStyle=cream;c.beginPath();c.roundRect(4,4,92,92,p.kind==='attraction'?16:44);c.fill()
 c.save();c.beginPath();c.roundRect(10,10,80,80,p.kind==='attraction'?12:40);c.clip()
 if(photo){c.filter=closed?'grayscale(1)':'none';const s=Math.max(80/photo.width,80/photo.height);c.drawImage(photo,50-photo.width*s/2,50-photo.height*s/2,photo.width*s,photo.height*s)}else{c.fillStyle=ink;c.fillRect(10,10,80,80);c.save();c.translate(26,25);c.scale(2,2);c.fillStyle=cream;c.fill(new Path2D(icons[p.kind==='attraction'?'landmark':categoryIcon(p.category)]));c.restore()}
 c.restore()
 if(p.michelin){c.beginPath();c.arc(83,14,14,0,Math.PI*2);c.fillStyle=closed?'#777':'#eac25d';c.fill();c.fillStyle='#282923';c.font='bold 19px serif';c.textAlign='center';c.fillText('M',83,21)}
 return c.getImageData(0,0,100,120)
}
export default function Map({places,selected,onSelect,location,region,now,onLocate}) {
 const container=useRef(null),mapRef=useRef(null),latest=useRef({places,selected,onSelect,location,now}),syncVersion=useRef(0)
 const [error,setError]=useState('')
 latest.current={places,selected,onSelect,location,now}
 useEffect(()=>{
  let disposed=false
  let map
  try{map=new LibreMap({container:container.current,style:{version:8,glyphs:'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'base',type:'raster',source:'osm',paint:{'raster-saturation':-.5,'raster-contrast':-.12}}]},center:[114.167,22.297],zoom:12.1,attributionControl:false})}catch{setError('此瀏覽器未能開啟地圖，請使用清單查看地點。');return}
  mapRef.current=map
  map.addControl(new AttributionControl({compact:true}),'bottom-left');map.addControl(new NavigationControl({showCompass:false}),'top-right')
  const ro=new ResizeObserver(()=>map.resize());ro.observe(container.current)
  map.on('error',()=>{if(!disposed)setError('部分地圖資料未能載入；地點清單仍可使用。')})
  const sync=async()=>{
   if(!map.getSource('places'))return
   const current=latest.current,version=++syncVersion.current
   await Promise.all(current.places.map(async p=>{
    if(map.hasImage(p.id)&&map.hasImage(p.id+'-closed'))return
    let photo=null
    if(p.kind==='attraction'&&p.photo?.url){try{photo=(await map.loadImage(import.meta.env.BASE_URL+p.photo.url)).data}catch{}}
    if(disposed)return
    for(const closed of [false,true]){const id=p.id+(closed?'-closed':'');if(!map.hasImage(id))map.addImage(id,drawMarker(p,closed,photo),{pixelRatio:2})}
   }))
   if(disposed||version!==syncVersion.current)return
   const source=map.getSource('places');source?.setData(data(latest.current.places,latest.current.now,latest.current.selected))
   if(container.current){container.current.dataset.ready='true';container.current.dataset.count=String(latest.current.places.length)}
  }
  map.once('load',()=>{
   map.addSource('places',{type:'geojson',data:data([],new Date(),null),cluster:true,clusterRadius:42,clusterMaxZoom:13})
   map.addLayer({id:'clusters',type:'circle',source:'places',filter:['has','point_count'],paint:{'circle-color':'#244e44','circle-radius':24,'circle-stroke-color':'#fffbf0','circle-stroke-width':3}})
   map.addLayer({id:'counts',type:'symbol',source:'places',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Noto Sans Regular'],'text-size':14},paint:{'text-color':'#fffbf0'}})
   map.addLayer({id:'pins',type:'symbol',source:'places',filter:['!',['has','point_count']],layout:{'icon-image':['get','image'],'icon-size':['case',['get','selected'],1.2,1],'icon-anchor':'bottom','icon-allow-overlap':true}})
   map.addSource('location',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
   map.addLayer({id:'location-dot',type:'circle',source:'location',paint:{'circle-radius':8,'circle-color':'#2777a4','circle-stroke-width':4,'circle-stroke-color':'white'}})
   map.on('click','pins',e=>{const p=latest.current.places.find(p=>p.id===e.features?.[0]?.properties.id);if(p)latest.current.onSelect(p)})
   map.on('click','clusters',async e=>{try{const f=e.features[0],zoom=await map.getSource('places').getClusterExpansionZoom(f.properties.cluster_id);if(!disposed)map.easeTo({center:f.geometry.coordinates,zoom})}catch{}})
   map.on('mouseenter','pins',()=>{map.getCanvas().style.cursor='pointer'});map.on('mouseleave','pins',()=>{map.getCanvas().style.cursor=''})
   sync();updateLocation()
  })
  const updateLocation=()=>{const l=latest.current.location;map.getSource('location')?.setData({type:'FeatureCollection',features:l?[{type:'Feature',geometry:{type:'Point',coordinates:[l.lng,l.lat]},properties:{}}]:[]})}
  map.__sync=sync;map.__location=updateLocation
  return()=>{disposed=true;ro.disconnect();map.remove();mapRef.current=null}
 },[])
 useEffect(()=>{mapRef.current?.__sync?.()},[places,selected,now])
 useEffect(()=>{const m=mapRef.current;m?.__location?.();if(location)m?.flyTo({center:[location.lng,location.lat],zoom:14})},[location])
 useEffect(()=>{mapRef.current?.fitBounds(bounds[region],{padding:50,duration:500})},[region])
 useEffect(()=>{if(selected)mapRef.current?.easeTo({center:[selected.lng,selected.lat],zoom:Math.max(mapRef.current.getZoom(),14.5),offset:[0,-90],duration:500})},[selected])
 return <div className="map-shell"><div className="map-canvas" ref={container} aria-label="香港互動地圖"/><div className="map-caption"><span className="live-dot"/><b>{places.length}</b> 個街角 <span>／ HONG KONG</span></div><div className="map-tools"><button onClick={()=>mapRef.current?.easeTo({bearing:0,pitch:0,duration:300})} aria-label="重設地圖方向"><Icon name="compass"/><small>正北</small></button><button onClick={()=>mapRef.current?.fitBounds(bounds[region],{padding:50})} aria-label="顯示地區全景"><Icon name="map"/></button></div><button className="locate-button" onClick={onLocate}><Icon name="location"/>我的位置</button>{error&&<p className="map-error" role="status">{error}</p>}</div>
}
