import("./sinica.js?v=20260908").catch(error=>{
  console.error("[sinica]",error);
  const view=document.getElementById("v-alm");
  if(!view)return;
  const section=document.createElement("section");section.className="load-message";
  const title=document.createElement("h2");title.textContent="页面暂时未能载入";
  const message=document.createElement("p");message.textContent="请稍后重新载入。";
  const button=document.createElement("button");button.textContent="重新载入";button.onclick=()=>location.reload();
  section.append(title,message,button);view.replaceChildren(section);
});
