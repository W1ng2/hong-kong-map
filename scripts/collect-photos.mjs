import fs from 'node:fs/promises'
import sharp from 'sharp'
import {fileURLToPath} from 'node:url'
const root=new URL('../',import.meta.url)
const names={
 'art-museum':'Hong Kong Museum of Art renovation site 201908.jpg',
 'mak-man-kee':'澳洲牛奶公司 麥文記麵家 霓虹招牌, 2011.jpg',
 'tai-kwun':'Tai Kwun Police Headquarters Block 201806.jpg',
 'nan-lian':'Nan Lian Garden Overview 201807.jpg',
 'heritage-museum':'Hong Kong Heritage Museum 201305.jpg',
 'pmq':'PMQ Overview 201510.jpg',
 'avenue-stars':'Avenue of Stars 201901.jpg',
 'tim-ho-wan':'Tim Ho Wan restaurant at Sham Shui Po (20190126130901).jpg'
}
const plain=x=>(x||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim()
const results=JSON.parse(await fs.readFile(new URL('output/research/photos.json',root),'utf8').catch(()=>'{}'))
await fs.mkdir(new URL('public/photos/',root),{recursive:true})
for(const [id,name] of Object.entries(names)){
 if(process.argv.length>2&&!process.argv.slice(2).includes(id))continue
 const api=new URL('https://commons.wikimedia.org/w/api.php')
 api.search=new URLSearchParams({action:'query',format:'json',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1000',titles:'File:'+name})
 const response=await fetch(api,{headers:{'User-Agent':'HongKongStreetMap/1.0 (photo attribution research)'}})
 const body=await response.json()
 const info=Object.values(body.query.pages)[0]?.imageinfo?.[0]
 if(!info){console.log(id,'missing');continue}
 const meta=info.extmetadata
 if(!/CC BY|Public domain|CC0/i.test(plain(meta.LicenseShortName?.value))){console.log(id,'unapproved-license');continue}
 const image=await fetch(info.thumburl||info.url)
 if(!image.ok){console.log(id,image.status);continue}
 await sharp(Buffer.from(await image.arrayBuffer())).resize(1000,750,{fit:'inside',withoutEnlargement:true}).webp({quality:83}).toFile(fileURLToPath(new URL('public/photos/'+id+'.webp',root)))
 results[id]={url:'photos/'+id+'.webp',sourceUrl:info.descriptionurl,credit:plain(meta.Artist?.value),license:plain(meta.LicenseShortName?.value),licenseUrl:plain(meta.LicenseUrl?.value),description:plain(meta.ImageDescription?.value)}
 console.log(id,results[id])
}
await fs.mkdir(new URL('output/research/',root),{recursive:true})
await fs.writeFile(new URL('output/research/photos.json',root),JSON.stringify(results,null,2))
