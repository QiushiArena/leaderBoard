let data=[]

fetch("leaderboard.json")
.then(res=>res.json())
.then(json=>{
data=json
renderTable(data)
})

function renderTable(rows){

let tbody=document.querySelector("#leaderboard tbody")
tbody.innerHTML=""

rows
.sort((a,b)=>b.score-a.score)
.forEach((item,index)=>{

let tr=document.createElement("tr")

tr.innerHTML=`
<td>${index+1}</td>
<td>${item.model}</td>
<td>${item.org}</td>
<td>${item.score}</td>
<td>${item.date}</td>
<td><a href="${item.link}" target="_blank">link</a></td>
`

tbody.appendChild(tr)

})
}

document.getElementById("search").addEventListener("input",function(){

let keyword=this.value.toLowerCase()

let filtered=data.filter(x=>
x.model.toLowerCase().includes(keyword)||
x.org.toLowerCase().includes(keyword)
)

renderTable(filtered)

})

function sortTable(key){

data.sort((a,b)=>{

if(typeof a[key]==="number"){
return b[key]-a[key]
}

return a[key].localeCompare(b[key])

})

renderTable(data)

}
