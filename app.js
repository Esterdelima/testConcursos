(function(){
"use strict";
var STATUS=["Previsto","Edital Publicado","Inscrições Abertas","Inscrições Encerradas","Prova Realizada","Homologado"];
var ESFERA=["Federal","Estadual","Municipal"];
var MODAL=["Presencial","Híbrido","Remoto","Não informado"];
var SUBAREA=["Desenvolvimento/Software","Infraestrutura/Redes/DevOps","Segurança da Informação","Banco de Dados","Gestão/Governança de TI","Ciência de Dados/IA","Suporte/Outros"];
var VOU=["Sim","Não","Talvez"];

var FIELDS=[
 ["orgao","Órgão / Instituição","text",null,"wide"],
 ["cargo","Cargo / Especialidade","text",null,"wide"],
 ["banca","Banca","text"],
 ["esfera","Esfera","select",ESFERA],
 ["uf","UF / Localidade / Lotação","text"],
 ["modalidade","Modalidade","select",MODAL],
 ["vagasAC","Vagas AC","number"],
 ["vagasCotas","Vagas Cotas","number"],
 ["cr","Cadastro Reserva","text"],
 ["remuneracao","Remuneração Inicial (R$)","number"],
 ["beneficios","Benefícios (R$)","number"],
 ["carga","Carga Horária (h/sem)","number"],
 ["status","Status do Concurso","select",STATUS],
 ["inicio","Início Inscrições","date"],
 ["fim","Fim Inscrições","date"],
 ["prova","Data da Prova","date"],
 ["taxa","Taxa (R$)","number"],
 ["subarea","Subárea / Stack","select",SUBAREA],
 ["vou","Vou fazer?","select",VOU],
 ["requisitos","Requisitos de Formação","textarea",null,"full"],
 ["disciplinas","Disciplinas de TI","textarea",null,"full"],
 ["link","Link do Edital","url",null,"full"],
 ["obs","Observações (benefícios, notas)","textarea",null,"full"]
];
/* ordem das colunas da aba Concursos da planilha de controle */
var SHEET_ORDER=["id","orgao","cargo","banca","esfera","uf","modalidade","vagasAC","vagasCotas","cr","remuneracao","beneficios","carga","status","inicio","fim","prova","taxa","requisitos","subarea","disciplinas","vou","link","obs"];
var HEADERS={id:"ID"};
FIELDS.forEach(function(f){HEADERS[f[0]]=f[1]});
HEADERS.prova="Data da Prova";
var NUMERIC={vagasAC:1,vagasCotas:1,remuneracao:1,beneficios:1,carga:1,taxa:1};

var PRESETS={
  groq:{url:"https://api.groq.com/openai/v1/chat/completions",model:"openai/gpt-oss-120b",ph:"gsk_..."},
  openrouter:{url:"https://openrouter.ai/api/v1/chat/completions",model:"meta-llama/llama-3.3-70b-instruct:free",ph:"sk-or-..."},
  ollama:{url:"http://localhost:11434/v1/chat/completions",model:"llama3.1",ph:"(não precisa de chave)"},
  custom:{url:"",model:"",ph:""}
};

var $=function(id){return document.getElementById(id)};
var rows=[], drafts=[];

/* ---------- armazenamento local ---------- */
var KEY="concursos.v1", CFG="concursos.cfg.v1", DRAFT="concursos.draft.v1";
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function load(){try{rows=JSON.parse(lsGet(KEY)||"[]")}catch(e){rows=[]}if(!Array.isArray(rows))rows=[]}
function persist(){if(!lsSet(KEY,JSON.stringify(rows)))setStatus("Não foi possível salvar neste navegador (armazenamento bloqueado). Use o backup.",true)}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function nextIds(n){
  var max=0;
  rows.forEach(function(r){var m=/^CON-(\d+)$/.exec(r.id||"");if(m)max=Math.max(max,+m[1])});
  var out=[];for(var i=1;i<=n;i++)out.push("CON-"+String(max+i).padStart(3,"0"));
  return out;
}

function el(tag,attrs,kids){
  var e=document.createElement(tag);
  if(attrs)for(var k in attrs){
    if(k==="class")e.className=attrs[k];
    else if(k==="text")e.textContent=attrs[k];
    else if(k.slice(0,2)==="on")e.addEventListener(k.slice(2),attrs[k]);
    else e.setAttribute(k,attrs[k]);
  }
  (kids||[]).forEach(function(c){if(c!=null)e.append(c)});
  return e;
}
function fmtDate(s){if(!s)return"";var p=String(s).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:s}
function fmtBRL(n){return(n===""||n==null||isNaN(n))?"":Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function daysTo(s){if(!s)return null;var d=new Date(s+"T00:00:00");var t=new Date();t.setHours(0,0,0,0);return Math.round((d-t)/864e5)}
function totalVagas(r){return(+r.vagasAC||0)+(+r.vagasCotas||0)}

/* ---------- formulário ---------- */
var formSeq=0;
function buildForm(data,title,onSave,saveLabel,onCancel,onDelete){
  var seq=++formSeq, inputs={};
  var grid=el("div",{class:"grid"});
  FIELDS.forEach(function(f){
    var id="f"+seq+"-"+f[0], inp;
    if(f[2]==="select"){
      inp=el("select",{id:id},[el("option",{value:"",text:"—"})].concat(f[3].map(function(o){return el("option",{value:o,text:o})})));
    }else if(f[2]==="textarea"){
      inp=el("textarea",{id:id,rows:"2"});
    }else{
      inp=el("input",{id:id,type:f[2]});
      if(f[2]==="number"){inp.step="any";inp.inputMode="decimal"}
    }
    inp.value=(data[f[0]]==null?"":data[f[0]]);
    inputs[f[0]]=inp;
    grid.append(el("label",{"for":id,"class":f[4]||""},[f[1],inp]));
  });
  function collect(){
    var o={};
    FIELDS.forEach(function(f){
      var v=inputs[f[0]].value.trim();
      o[f[0]]=NUMERIC[f[0]]?(v===""?"":Number(v)):v;
    });
    return o;
  }
  var card=el("div",{class:"card-form"},[el("header",null,[el("strong",{text:title})]),grid]);
  card._collect=collect;
  var actions=el("div",{class:"row-actions"},[
    onSave?el("button",{class:"primary",text:saveLabel,onclick:function(){onSave(collect())}}):null,
    onCancel?el("button",{text:"Cancelar",onclick:onCancel}):null
  ]);
  if(onDelete){
    var del=el("button",{class:"danger",text:"Excluir"});
    del.addEventListener("click",function(){
      if(del.dataset.armed){onDelete()}
      else{del.dataset.armed="1";del.textContent="Confirmar exclusão";setTimeout(function(){del.dataset.armed="";del.textContent="Excluir"},4000)}
    });
    actions.append(del);
  }
  card.append(actions);
  return card;
}

/* ---------- rascunhos ---------- */
function saveDrafts(){lsSet(DRAFT,JSON.stringify({drafts:drafts,text:$("in-text").value,link:$("in-link").value}))}
function renderDrafts(noScroll){
  var box=$("drafts");box.textContent="";
  if(!drafts.length){saveDrafts();return}
  box.append(el("div",{class:"drafts-head"},[
    el("h2",{text:drafts.length===1?"Revise e salve o concurso":"Revise e salve os "+drafts.length+" cargos encontrados"}),
    el("div",{class:"row-actions"},[
      el("button",{class:"primary",text:drafts.length>1?"Salvar todos":"Salvar",onclick:saveAllDrafts}),
      el("button",{text:"Descartar",onclick:function(){drafts=[];renderDrafts()}})
    ])
  ]));
  var list=el("div",{class:"drafts"});
  drafts.forEach(function(d,i){
    var card=buildForm(d,(d.orgao||"Novo")+(d.cargo?" • "+d.cargo:""),null,"",
      function(){readDraftForms(i);drafts.splice(i,1);renderDrafts()});
    card.dataset.draft="1";
    list.append(card);
  });
  box.append(list);
  if(!noScroll)box.scrollIntoView({behavior:"smooth",block:"start"});
  saveDrafts();
}
function readDraftForms(skip){
  document.querySelectorAll("#drafts .card-form").forEach(function(c,i){if(i!==skip)drafts[i]=c._collect()});
}
function saveAllDrafts(){
  readDraftForms(-1);
  var ids=nextIds(drafts.length);
  drafts.forEach(function(d,i){rows.push(Object.assign({_id:uid(),id:ids[i]},d))});
  persist();drafts=[];renderDrafts();renderAll();setStatus("Salvo.",false);
}

/* ---------- configuração do modelo ---------- */
function loadCfg(){var c={};try{c=JSON.parse(lsGet(CFG)||"{}")}catch(e){}
  c.preset=c.preset||"groq";
  var p=PRESETS[c.preset];if(c.model==="llama-3.3-70b-versatile")c.model="";c.url=c.url||p.url;c.model=c.model||p.model;c.key=c.key||"";return c}
function applyCfgToUI(c){$("cfg-preset").value=c.preset;$("cfg-url").value=c.url;$("cfg-model").value=c.model;$("cfg-key").value=c.key;$("cfg-key").placeholder=PRESETS[c.preset].ph}
function readCfgFromUI(){return{preset:$("cfg-preset").value,url:$("cfg-url").value.trim(),model:$("cfg-model").value.trim(),key:$("cfg-key").value.trim()}}
function saveCfg(){lsSet(CFG,JSON.stringify(readCfgFromUI()))}

/* ---------- selecionar trechos do edital (limites do plano gratuito) ---------- */
var MAX_CHARS=11000;
var TOPIC_GERAL=/(banca|organizad|realiza[çc][ãa]o|inscri|taxa|prova objetiva|cronograma|data da prova|benef[ií]cio|aux[ií]lio|vale[- ]|plano de sa[úu]de|assist[êe]ncia|gratifica|remunera|vencimento|sal[áa]rio|carga hor|jornada|regime|requisit|escolaridade|forma[çc][ãa]o|modalidade|presencial|remoto|teletrabalho|h[ií]brido|disciplina|conhecimentos|lota[çc][ãa]o|localidade)/i;
var TOPIC_CARGOS=/(vaga|perfil|cargo|especialidade|reserva|cota|PcD|ampla|remunera|vencimento|sal[áa]rio|R\$|taxa|requisit|escolaridade|forma[çc][ãa]o|conhecimentos|disciplina|localidade|lota[çc][ãa]o)/i;
function pick(text,re,budget){
  text=text.replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n");
  if(text.length<=budget)return text;
  var lines=text.split("\n"), keep={}, size=0, out=[], head=Math.floor(budget*0.25);
  var h=text.slice(0,head);size=h.length;
  var hl=h.split("\n").length;
  for(var i=hl;i<lines.length&&size<budget;i++){
    if(re.test(lines[i])){
      for(var k=i;k<=Math.min(i+2,lines.length-1);k++){
        if(!keep[k]){keep[k]=1;var l=lines[k].trim().slice(0,500);if(l){out.push(l);size+=l.length+1}}
      }
    }
  }
  return h+"\n[...trechos selecionados do restante do edital...]\n"+out.join("\n");
}

/* ---------- extração com Llama / gpt-oss ---------- */
function setStatus(t,err){var s=$("extract-status");s.textContent=t;s.className="status-line"+(err?" err":"")}
var TODAY=function(){return new Date().toISOString().slice(0,10)};
var REGRAS=
"Regras: use \"\" quando a informação não estiver no material; nunca invente. Datas no formato AAAA-MM-DD. Números sem símbolo e sem separador de milhar (ex.: 8500.50). "+
"AC = Ampla Concorrência (vagas abertas a todos, sem reserva). Cotas = vagas reservadas (PcD, pretos e pardos PP, indígenas PI, quilombolas PQ). ";
function promptGeral(material){
  return "Você extrai dados de editais de concursos públicos brasileiros. Responda APENAS com um objeto JSON com os campos abaixo, valendo para o concurso como um todo.\n"+REGRAS+"\n"+
  "orgao (string), banca (organizadora/realizadora do concurso), esfera (\"Federal\"|\"Estadual\"|\"Municipal\"), "+
  "modalidade (\"Presencial\"|\"Híbrido\"|\"Remoto\"|\"Não informado\", conforme o regime de trabalho), carga (horas semanais, número), "+
  "beneficios (número: soma MENSAL em reais de todos os auxílios/benefícios em dinheiro citados, como alimentação/refeição, saúde, creche, transporte; some os valores; \"\" se não houver valores), "+
  "beneficiosDetalhe (string: lista curta dos benefícios com valores, ex.: \"Auxílio-alimentação R$ 1.200; plano de saúde\"), "+
  "status (\"Previsto\"|\"Edital Publicado\"|\"Inscrições Abertas\"|\"Inscrições Encerradas\"|\"Prova Realizada\"|\"Homologado\"), "+
  "inicio (início das inscrições), fim (fim das inscrições), prova (data da prova objetiva), "+
  "taxa (número: valor da taxa de inscrição; se variar por nível, use a de nível superior), "+
  "disciplinas (string: disciplinas/conhecimentos de TI cobrados, separados por vírgula).\n"+
  "Hoje é "+TODAY()+"; decida o status pelas datas.\n\nMATERIAL:\n"+material;
}
function promptCargos(material){
  return "Você extrai dados de editais de concursos públicos brasileiros. Responda APENAS com JSON no formato {\"cargos\":[...]}, com UM item por cargo/perfil/especialidade.\n"+REGRAS+"\n"+
  "Se o mesmo perfil tiver vagas em várias localidades, faça um único item, SOME as vagas e liste as localidades em uf (ex.: \"Fortaleza/CE, João Pessoa/PB\").\n"+
  "Campos de cada item: cargo (nome do cargo e perfil/especialidade), uf (localidade/lotação), "+
  "vagasAC (número: vagas imediatas de ampla concorrência, coluna AC), vagasCotas (número: soma das vagas imediatas reservadas PcD+PP+PI+PQ), "+
  "cr (número: total de cadastro de reserva do cargo, incluindo ampla e cotas; \"\" se não houver), "+
  "remuneracao (número em reais: remuneração/vencimento inicial do cargo), taxa (número: taxa de inscrição do cargo, se específica), "+
  "requisitos (string: formação exigida), "+
  "subarea (uma de: "+SUBAREA.join(", ")+").\n\nMATERIAL:\n"+material;
}
function salvage(content){
  try{var m=content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);if(m){var v=JSON.parse(m[0]);return Array.isArray(v)?v:(v.cargos||v.concursos||[v])}}catch(e){}
  var i=content.indexOf("[");if(i<0)return [];
  var out=[],depth=0,start=-1,inStr=false,esc=false;
  for(var k=i+1;k<content.length;k++){
    var c=content[k];
    if(inStr){if(esc)esc=false;else if(c==="\\")esc=true;else if(c==='"')inStr=false;continue}
    if(c==='"'){inStr=true;continue}
    if(c==="{"){if(depth===0)start=k;depth++}
    else if(c==="}"){depth--;if(depth===0&&start>=0){try{out.push(JSON.parse(content.slice(start,k+1)))}catch(e){}start=-1}}
  }
  return out;
}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
async function callLlm(cfg,prompt,opts){
  opts=opts||{};
  var headers={"Content-Type":"application/json"};
  if(cfg.key)headers.Authorization="Bearer "+cfg.key;
  var body={model:cfg.model,temperature:0,messages:[
    {role:"system",content:"Você responde somente com JSON válido, sem texto antes ou depois."},
    {role:"user",content:prompt}]};
  var reasoning=/gpt-oss|qwen3/i.test(cfg.model);
  if(reasoning){body.reasoning_effort="low";body.max_completion_tokens=opts.maxOut||4500}
  if(opts.format!==false&&!reasoning&&(cfg.preset==="groq"||cfg.preset==="openrouter"))body.response_format={type:"json_object"};
  var res=await fetch(cfg.url,{method:"POST",headers:headers,body:JSON.stringify(body)});
  var raw=await res.text();
  if(!res.ok){
    var msg=raw,code="";try{var j=JSON.parse(raw).error;msg=j.message||raw;code=j.code||""}catch(e){}
    if(res.status===429&&(opts.tries||0)<3){
      var m=/try again in\s+(?:(\d+)m)?\s*([\d.]+)s/i.exec(msg), wait=m?((+m[1]||0)*60+parseFloat(m[2])+2):25;
      for(var s=Math.ceil(wait);s>0;s--){setStatus("Limite gratuito: aguardando "+s+"s para continuar…",false);await sleep(1000)}
      return callLlm(cfg,prompt,Object.assign({},opts,{tries:(opts.tries||0)+1}));
    }
    if(opts.format!==false&&code==="json_validate_failed")return callLlm(cfg,prompt,Object.assign({},opts,{format:false}));
    var err=new Error(msg);err.status=res.status;throw err;
  }
  var content=JSON.parse(raw).choices[0].message.content||"";
  return content;
}
function normalize(o,link){
  var d={};
  FIELDS.forEach(function(f){
    var v=o[f[0]];v=(v==null?"":v);
    if(NUMERIC[f[0]]){
      if(typeof v==="string")v=v.replace(/[^\d.,-]/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",",".");
      v=(v===""||isNaN(Number(v)))?"":Number(v);
    }else v=String(v);
    if(f[2]==="select"&&v!==""&&f[3].indexOf(v)<0)v="";
    if(f[2]==="date"&&v&&!/^\d{4}-\d{2}-\d{2}$/.test(v))v="";
    d[f[0]]=v;
  });
  if(link)d.link=link;
  if(!d.vou)d.vou="Talvez";
  return d;
}
function parseObj(content){
  try{var m=content.match(/\{[\s\S]*\}/);return m?JSON.parse(m[0]):{}}catch(e){return {}}
}
async function extract(){
  var text=$("in-text").value.trim(), link=$("in-link").value.trim();
  if(!text){setStatus("Cole o texto do edital, descreva o concurso ou envie o PDF.",true);return}
  var cfg=readCfgFromUI();saveCfg();
  if(!cfg.url||!cfg.model){setStatus("Configure o endereço da API e o modelo.",true);$("settings").open=true;return}
  if(cfg.preset!=="ollama"&&!cfg.key){setStatus("Informe sua chave da API em \"Configurar modelo de IA\".",true);$("settings").open=true;return}
  var btn=$("btn-extract");btn.disabled=true;
  try{
    setStatus("Passo 1 de 2: dados gerais (banca, datas, benefícios)…",false);
    var geralTxt=await callLlm(cfg,promptGeral(pick(text,TOPIC_GERAL,MAX_CHARS)),{maxOut:2500});
    var geral=parseObj(geralTxt);
    setStatus("Passo 2 de 2: cargos, vagas e remuneração…",false);
    var cargosTxt=await callLlm(cfg,promptCargos(pick(text,TOPIC_CARGOS,MAX_CHARS)),{maxOut:6000});
    var list=salvage(cargosTxt).filter(function(o){return o&&typeof o==="object"});
    if(!list.length)list=[{}];
    drafts=list.map(function(c){
      var merged=Object.assign({},geral);
      Object.keys(c).forEach(function(k){if(c[k]!==""&&c[k]!=null)merged[k]=c[k]});
      if(geral.beneficiosDetalhe)merged.obs="Benefícios: "+geral.beneficiosDetalhe;
      return normalize(merged,link);
    });
    saveDrafts();
    setStatus(drafts.length+" cargo(s) extraído(s). Confira os campos antes de salvar (principalmente vagas e benefícios).",false);
    renderDrafts();
  }catch(e){
    var m;
    if(e.status===401||e.status===403)m="Chave da API recusada. Confira a chave e o provedor.";
    else if(e.status===429)m="Limite gratuito atingido mesmo após esperar. Tente de novo em alguns minutos.";
    else if(e.status===404||/model/i.test(e.message||""))m="O modelo \""+cfg.model+"\" não está disponível nesta conta. Em \"Configurar modelo de IA\", troque por openai/gpt-oss-120b ou llama-3.1-8b-instant.";
    else if(e.status===413)m="O texto é grande demais para o plano gratuito. Cole só as partes principais do edital.";
    else if(e instanceof TypeError)m="Não consegui falar com o provedor ("+cfg.url+"). Confira a conexão e o endereço.";
    else m="Não foi possível extrair: "+e.message;
    setStatus(m,true);
  }finally{btn.disabled=false}
}
function manual(){
  drafts=[{status:"Previsto",vou:"Talvez",link:$("in-link").value.trim()}];
  renderDrafts();
}

/* ---------- PDF ---------- */
async function readPdf(file){
  if(!window.pdfjsLib){setStatus("Leitor de PDF não carregou. Cole o texto do edital.",true);return}
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  setStatus("Lendo o PDF…",false);
  try{
    var pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise, out=[];
    for(var p=1;p<=pdf.numPages;p++){
      var page=await pdf.getPage(p), tc=await page.getTextContent();
      out.push(tc.items.map(function(i){return i.str+(i.hasEOL?"\n":" ")}).join(""));
    }
    var text=out.join("\n\n").trim();
    if(text.length<200)throw new Error("O PDF parece ser escaneado (sem texto). Use um PDF com texto selecionável.");
    $("in-text").value=text;saveDrafts();
    setStatus("PDF lido ("+pdf.numPages+" páginas). Clique em \"Extrair dados\".",false);
  }catch(e){setStatus("Não foi possível ler o PDF: "+e.message,true)}
}

/* ---------- lista, filtros, resumo ---------- */
function opt(sel,label,values){
  var cur=sel.value;sel.textContent="";
  sel.append(el("option",{value:"",text:label}));
  values.forEach(function(v){sel.append(el("option",{value:v,text:v}))});
  if(values.indexOf(cur)>=0)sel.value=cur;
}
function pillClass(s){return s==="Inscrições Abertas"?"s-open":s==="Previsto"?"s-prev":s==="Edital Publicado"?"s-pub":s?"s-end":""}
function renderStats(){
  var open=rows.filter(function(r){return r.status==="Inscrições Abertas"}).length;
  var prev=rows.filter(function(r){return r.status==="Previsto"}).length;
  var vou=rows.filter(function(r){return r.vou==="Sim"}).length;
  var soon=rows.filter(function(r){var d=daysTo(r.fim);return d!=null&&d>=0&&d<=7}).length;
  var vagas=rows.reduce(function(s,r){return s+totalVagas(r)},0);
  var data=[["Cargos cadastrados",rows.length,""],["Inscrições abertas",open,""],["Editais previstos",prev,""],["Vou fazer",vou,""],["Prazo em até 7 dias",soon,soon?"alert":""],["Vagas somadas",vagas,""]];
  var box=$("stats");box.textContent="";
  data.forEach(function(s){box.append(el("div",{class:"stat "+s[2]},[el("b",{text:String(s[1])}),el("span",{text:s[0]})]))});
}
function filtered(){
  var q=$("f-q").value.trim().toLowerCase(), st=$("f-status").value, bn=$("f-banca").value, vo=$("f-vou").value;
  return rows.filter(function(r){
    if(st&&r.status!==st)return false;
    if(bn&&r.banca!==bn)return false;
    if(vo&&r.vou!==vo)return false;
    if(q&&[r.orgao,r.cargo,r.banca,r.uf,r.subarea,r.id].join(" ").toLowerCase().indexOf(q)<0)return false;
    return true;
  }).sort(function(a,b){
    var x=a.fim||"9999",y=b.fim||"9999";
    return x<y?-1:x>y?1:(a.id||"").localeCompare(b.id||"");
  });
}
function renderTable(){
  var body=$("tbody");body.textContent="";
  var list=filtered();
  if(!list.length){
    var msg=rows.length?el("div",{class:"empty"},[el("b",{text:"Nenhum concurso com esses filtros"}),"Limpe a busca ou troque o filtro."]):
      el("div",{class:"empty"},[el("b",{text:"Nenhum concurso cadastrado"}),"Cole um edital acima e clique em \"Extrair dados\". Os concursos aparecem aqui e podem ser exportados para Excel."]);
    body.append(el("tr",null,[el("td",{colspan:"10"},[msg])]));
    return;
  }
  list.forEach(function(r){
    var d=daysTo(r.fim), soon=d!=null&&d>=0&&d<=7, vag=totalVagas(r);
    body.append(el("tr",{tabindex:"0",onclick:function(){openEdit(r)},onkeydown:function(e){if(e.key==="Enter")openEdit(r)}},[
      el("td",{class:"mono",text:r.id||""}),
      el("td",null,[el("div",{class:"org",text:r.orgao||"—"}),el("div",{class:"sub",text:r.cargo||""})]),
      el("td",{text:r.banca||"—"}),
      el("td",{text:r.uf||"—"}),
      el("td",{class:"num mono",text:vag?String(vag)+(r.cr?" +CR":""):(r.cr?"CR":"—")}),
      el("td",{class:"num mono",text:fmtBRL(r.remuneracao)||"—"}),
      el("td",null,[r.status?el("span",{class:"pill "+pillClass(r.status),text:r.status}):"—"]),
      el("td",{class:"mono"+(soon?" deadline-soon":""),text:(r.inicio||r.fim)?fmtDate(r.inicio)+" → "+fmtDate(r.fim)+(soon?(d===0?" (hoje)":" ("+d+"d)"):""):"—"}),
      el("td",{class:"mono",text:fmtDate(r.prova)||"—"}),
      el("td",{text:r.vou||"—"})
    ]));
  });
}
function renderAll(){
  var bancas=[];rows.forEach(function(r){if(r.banca&&bancas.indexOf(r.banca)<0)bancas.push(r.banca)});bancas.sort();
  opt($("f-status"),"Todos os status",STATUS);
  opt($("f-banca"),"Todas as bancas",bancas);
  opt($("f-vou"),"Todos",VOU);
  renderStats();renderTable();
}
function openEdit(r){
  var slot=$("edit-slot");slot.textContent="";
  slot.append(buildForm(r,"Editar "+(r.id||"")+" • "+(r.orgao||""),
    function(vals){Object.assign(r,vals);persist();closeEdit();renderAll()},"Salvar alterações",closeEdit,
    function(){rows=rows.filter(function(x){return x!==r});persist();closeEdit();renderAll()}));
  slot.scrollIntoView({behavior:"smooth",block:"start"});
}
function closeEdit(){$("edit-slot").textContent=""}

/* ---------- exportação ---------- */
function exportRows(){
  return rows.slice().sort(function(a,b){return(a.id||"").localeCompare(b.id||"")}).map(function(r){
    var o={};SHEET_ORDER.forEach(function(k){o[HEADERS[k]]=(r[k]==null?"":r[k])});return o;
  });
}
function today(){return new Date().toISOString().slice(0,10)}
function download(filename,blob){
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;
  document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},2000);
}
function needRows(){if(!rows.length){setStatus("Cadastre ao menos um concurso para exportar.",true);return false}return true}
function exportXlsx(){
  if(!needRows())return;
  if(!window.XLSX){setStatus("Biblioteca de Excel não carregou. Use o CSV.",true);return}
  var data=exportRows(), ws=XLSX.utils.json_to_sheet(data);
  ws["!cols"]=Object.keys(data[0]).map(function(h){return{wch:Math.max(12,Math.min(40,h.length+4))}});
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Concursos");
  download("concursos-"+today()+".xlsx",new Blob([XLSX.write(wb,{type:"array",bookType:"xlsx"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
}
function exportCsv(){
  if(!needRows())return;
  var data=exportRows(), heads=Object.keys(data[0]);
  var esc=function(v){v=String(v==null?"":v);return/[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  var csv="﻿"+[heads.map(esc).join(";")].concat(data.map(function(r){return heads.map(function(h){return esc(r[h])}).join(";")})).join("\r\n");
  download("concursos-"+today()+".csv",new Blob([csv],{type:"text/csv;charset=utf-8"}));
}
function backup(){
  if(!needRows())return;
  download("concursos-backup-"+today()+".json",new Blob([JSON.stringify(rows,null,1)],{type:"application/json"}));
}
function restore(file){
  var fr=new FileReader();
  fr.onload=function(){
    try{
      var data=JSON.parse(fr.result);
      if(!Array.isArray(data))throw new Error("formato inválido");
      var ids={};rows.forEach(function(r){ids[r.id]=1});
      var added=0;
      data.forEach(function(r){if(r&&typeof r==="object"&&!ids[r.id]){r._id=r._id||uid();rows.push(r);added++}});
      persist();renderAll();setStatus("Backup restaurado: "+added+" registro(s) novo(s).",false);
    }catch(e){setStatus("Arquivo de backup inválido: "+e.message,true)}
  };
  fr.readAsText(file);
}

/* ---------- tema e início ---------- */
function toggleTheme(){
  var root=document.documentElement;
  var dark=root.getAttribute("data-theme")==="dark"||(!root.getAttribute("data-theme")&&matchMedia("(prefers-color-scheme: dark)").matches);
  root.setAttribute("data-theme",dark?"light":"dark");
}
$("btn-extract").addEventListener("click",extract);
$("btn-manual").addEventListener("click",manual);
$("btn-xlsx").addEventListener("click",exportXlsx);
$("btn-csv").addEventListener("click",exportCsv);
$("btn-backup").addEventListener("click",backup);
$("btn-restore").addEventListener("click",function(){$("in-restore").click()});
$("in-restore").addEventListener("change",function(e){if(e.target.files[0])restore(e.target.files[0]);e.target.value=""});
$("in-pdf").addEventListener("change",function(e){if(e.target.files[0])readPdf(e.target.files[0])});
$("btn-theme").addEventListener("click",toggleTheme);
["f-q","f-status","f-banca","f-vou"].forEach(function(id){$(id).addEventListener("input",renderTable)});
$("cfg-preset").addEventListener("change",function(){
  var p=PRESETS[$("cfg-preset").value];
  $("cfg-url").value=p.url;$("cfg-model").value=p.model;$("cfg-key").placeholder=p.ph;saveCfg();
});
["cfg-url","cfg-model","cfg-key"].forEach(function(id){$(id).addEventListener("change",saveCfg)});

var saveTimer=null;
function saveDraftsSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(saveDrafts,400)}
$("in-text").addEventListener("input",saveDraftsSoon);
$("in-link").addEventListener("input",saveDraftsSoon);
$("drafts").addEventListener("change",function(){readDraftForms(-1);saveDrafts()});
try{
  var dr=JSON.parse(lsGet(DRAFT)||"null");
  if(dr){$("in-text").value=dr.text||"";$("in-link").value=dr.link||"";drafts=Array.isArray(dr.drafts)?dr.drafts:[]}
}catch(e){}
load();
if(drafts.length)renderDrafts(true);
var cfg0=loadCfg();applyCfgToUI(cfg0);
if(!cfg0.key&&cfg0.preset!=="ollama")$("settings").open=true;
renderAll();
})();
