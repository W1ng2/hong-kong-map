import {mkdir,writeFile} from 'node:fs/promises'
const urls=process.argv.slice(2)
const records=[]
for(const url of urls){
 const r=await fetch(url),text=await r.text()
 const m=text.match(/"mapsPlace":(\{[^{}]*\})/)
 records.push({url,status:r.status,map:m?JSON.parse(m[1]):null})
}
await mkdir('output/research',{recursive:true})
await writeFile('output/research/geo-pages.json',JSON.stringify(records,null,2))
console.log(JSON.stringify(records))
