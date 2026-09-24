document.addEventListener("DOMContentLoaded",()=>{
const search=document.getElementById("searchInput"), cat=document.getElementById("categoryFilter"), status=document.getElementById("statusFilter"), list=document.getElementById("problemList");
const params=new URLSearchParams(location.search);if(params.get("category"))cat.value=params.get("category");
function render(){const q=search.value.toLowerCase().trim();let ps=getProblems().filter(p=>(!q||(p.title+" "+p.description).toLowerCase().includes(q))&&(!cat.value||p.category===cat.value)&&(!status.value||p.status===status.value));list.innerHTML=ps.length?ps.map(card).join(""):`<div class="detail-card"><h3>No problems found</h3><p>Try another search or register the first problem in this category.</p></div>`}
[search,cat,status].forEach(x=>x.addEventListener("input",render));render();
});
