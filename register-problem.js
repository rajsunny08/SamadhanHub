document.addEventListener("DOMContentLoaded",()=>{
const form=document.getElementById("problemForm"), msg=document.getElementById("formMessage");
form.addEventListener("submit",e=>{e.preventDefault();const d=new FormData(form);const ps=getProblems();const n=1001+ps.length;const p={id:`PS-${n}`,title:d.get("title"),description:d.get("description"),category:d.get("category"),urgency:d.get("urgency"),location:d.get("location"),image:d.get("image"),status:"OPEN",solutions:0,author:currentUser()?.name||"Anonymous",createdAt:new Date().toISOString()};ps.unshift(p);saveProblems(ps);msg.textContent=`Problem ${p.id} registered successfully!`;msg.style.color="var(--success)";setTimeout(()=>location.href=`problem-details.html?id=${encodeURIComponent(p.id)}`,700)})
})
