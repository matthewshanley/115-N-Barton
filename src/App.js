import { useState, useEffect } from "react";
import { DEFAULT_CONTACTS, DEFAULT_MILES, DEFAULT_TASKS } from "./data";

const B={navy:"#021d2b",blue:"#033b57",steel:"#ccd5de",sage:"#5e7361",white:"#ffffff",offwhite:"#f4f6f8",muted:"#6b8497",border:"#ccd5de",danger:"#7a1e1e",gold:"#c9a84c",light:"#e8edf1"};
const FONT="'Gill Sans','Gill Sans MT','Trebuchet MS',sans-serif";
const CRM_KEY="ecg-crm-v3",TASK_KEY="ecg-tasks-v1",MILE_KEY="ecg-miles-v1";
const LP_STAT_COL={"Deck sent":B.blue,"Data room accessed":B.sage,"In conversation":B.sage,"Soft commit":B.gold,"Committed":"#2a6b3f","Passed":B.danger};
const LN_STAT_COL={"Not contacted":B.muted,"Outreach sent":B.blue,"Term sheet requested":B.gold,"Term sheet received":B.gold,"In diligence":B.sage,"Committed":"#2a6b3f","Passed":B.danger};
const statCol=s=>LP_STAT_COL[s]||LN_STAT_COL[s]||B.muted;
const LP_STATUSES=["Deck sent","Data room accessed","In conversation","Soft commit","Committed","Passed"];
const LN_STATUSES=["Not contacted","Outreach sent","Term sheet requested","Term sheet received","In diligence","Committed","Passed"];
const PRIORITIES=["High","Medium","Low"];
const OWNERS=["Jimmy","Jonathan","Jackson","Matt"];
const TASK_STATUSES=["To do","In progress","Done","Blocked"];
const store={get:k=>{try{const v=localStorage.getItem(k);return v?{value:v}:null;}catch(_){return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch(_){}}};
const fmt$=n=>(!n&&n!==0)?"—":"$"+Number(n).toLocaleString();
const initials=n=>(n||"?").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
const today=new Date();
const Pip=({color})=><span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:color||B.muted,marginRight:6,flexShrink:0}}/>;
const Badge=({label,color=B.muted})=><span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:3,background:color+"20",color,border:`1px solid ${color}44`,letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>;
const Avatar=({name,color=B.navy})=><div style={{width:36,height:36,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:B.white,flexShrink:0}}>{initials(name)}</div>;
const Field=({label,value})=><div><div style={{fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>{label}</div><div style={{fontSize:13,color:B.navy}}>{value||"—"}</div></div>;
const card={background:B.white,border:`1px solid ${B.steel}`,borderRadius:8,padding:"1rem 1.25rem"};
const SC=(a=B.navy)=>({background:a,borderRadius:6,padding:"14px 16px"});
const btn=(g=false)=>({fontSize:11,padding:"7px 16px",borderRadius:4,cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:FONT,fontWeight:600,background:g?"transparent":B.navy,color:g?B.navy:B.white,border:g?`1px solid ${B.navy}`:"none"});
const iS={fontSize:13,fontFamily:FONT,border:`1px solid ${B.steel}`,borderRadius:4,padding:"7px 10px",color:B.navy,background:B.white,width:"100%",boxSizing:"border-box"};
const lS={fontSize:11,color:B.muted,display:"block",marginBottom:4,letterSpacing:"0.05em",textTransform:"uppercase"};

function Dashboard({contacts,tasks,miles}){
  const lps=contacts.filter(c=>c.type==="LP");
  const lenders=contacts.filter(c=>c.type==="Lender");
  const committed=lps.filter(c=>c.status==="Committed").reduce((s,c)=>s+(Number(c.expectedAmount)||0),0);
  const weighted=lps.filter(c=>c.expectedAmount&&c.likelihood).reduce((s,c)=>s+(Number(c.expectedAmount)||0)*(Number(c.likelihood)||0)/100,0);
  const warm=lps.filter(c=>["Data room accessed","In conversation","Soft commit"].includes(c.status)).length;
  const activeLenders=lenders.filter(c=>!["Not contacted","Passed"].includes(c.status)).length;
  const highTasks=tasks.filter(t=>t.priority==="High"&&t.status!=="Done").length;
  const pC={"Initiation":B.navy,"Planning":B.sage,"Execution":B.blue,"Go Live":B.gold};
  const GS=new Date("2025-07-01"),GE=new Date("2027-07-01"),GT=GE-GS;
  const tP=d=>((new Date(d)-GS)/GT)*100;
  const nowP=Math.min(100,Math.max(0,((today-GS)/GT)*100));
  const urgT=tasks.filter(t=>t.priority==="High"&&t.status!=="Done").slice(0,4);
  const wLPs=lps.filter(c=>["Data room accessed","In conversation","Soft commit"].includes(c.status)).slice(0,5);
  return(
    <div style={{padding:"1.25rem 0"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:"1.25rem"}}>
        {[["LP Pipeline (weighted)",fmt$(Math.round(weighted)),B.navy],["Committed capital",fmt$(committed),"#2a6b3f"],["Warm prospects",warm,B.blue],["Active lenders",activeLenders,B.sage]].map(([l,v,c])=>(
          <div key={l} style={SC(c)}><div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div><div style={{fontSize:24,fontWeight:700,color:B.white}}>{v}</div></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
        <div style={card}>
          <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>Project timeline</div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.muted,marginBottom:4}}><span>Jul 2025</span><span>Today</span><span>Jul 2027</span></div>
            <div style={{height:6,background:B.light,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${nowP}%`,background:B.blue,borderRadius:3}}/></div>
          </div>
          {miles.slice(0,6).map(m=>{
            const s=new Date(m.start),e=new Date(m.end),left=tP(m.start),width=((e-s)/GT)*100;
            return(<div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{fontSize:11,color:B.navy,width:160,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</div>
              <div style={{flex:1,height:6,background:B.light,borderRadius:3,position:"relative"}}><div style={{position:"absolute",left:`${left}%`,width:`${Math.max(width,2)}%`,height:"100%",background:pC[m.phase]||B.muted,borderRadius:3}}/></div>
            </div>);
          })}
        </div>
        <div style={card}>
          <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>High-priority tasks <span style={{marginLeft:8,background:B.danger+"20",color:B.danger,padding:"1px 6px",borderRadius:3,fontSize:10}}>{highTasks} open</span></div>
          {urgT.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${B.light}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:B.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:B.white,fontWeight:700,flexShrink:0}}>{t.owner?.[0]}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:B.navy}}>{t.title}</div><div style={{fontSize:11,color:B.muted,marginTop:1}}>{t.owner} · Due {t.due||"TBD"}</div></div>
              <Badge label={t.status} color={t.status==="In progress"?B.blue:t.status==="Blocked"?B.danger:B.muted}/>
            </div>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>Warm LP pipeline</div>
        {wLPs.length===0?<div style={{fontSize:13,color:B.muted}}>No warm prospects yet.</div>:
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {wLPs.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${B.light}`}}>
                <Avatar name={c.name} color={B.navy}/>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:B.navy}}>{c.name}</div><div style={{fontSize:11,color:B.muted}}>{c.firm||c.tag||""}</div></div>
                <div style={{fontSize:13,color:B.navy,fontWeight:600}}>{fmt$(c.expectedAmount)}</div>
                <div style={{display:"flex",alignItems:"center",fontSize:11,color:statCol(c.status)}}><Pip color={statCol(c.status)}/>{c.status}</div>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}

const ELP={id:null,type:"LP",name:"",firm:"",title:"",email:"",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:"",expectedAmount:"",tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""};
const ELN={id:null,type:"Lender",name:"",firm:"",title:"",email:"",phone:"",linkedinUrl:"",status:"Not contacted",priority:"Medium",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"",notes:""};

function CRM({contacts,setContacts}){
  const [tab,setTab]=useState("LP");
  const [sf,setSf]=useState("All");
  const [tf,setTf]=useState("All");
  const [q,setQ]=useState("");
  const [view,setView]=useState("list");
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState(ELP);
  const sts=tab==="LP"?LP_STATUSES:LN_STATUSES;
  const tags=["All",...Array.from(new Set(contacts.filter(c=>c.type==="LP"&&c.tag).map(c=>c.tag))).sort()];
  const vis=contacts.filter(c=>{
    if(c.type!==tab)return false;
    if(sf!=="All"&&c.status!==sf)return false;
    if(tab==="LP"&&tf!=="All"&&c.tag!==tf)return false;
    if(q&&!`${c.name} ${c.firm} ${c.email} ${c.tag||""}`.toLowerCase().includes(q.toLowerCase()))return false;
    return true;
  });
  const lps=contacts.filter(c=>c.type==="LP"),lnds=contacts.filter(c=>c.type==="Lender");
  const lpE=lps.filter(c=>c.expectedAmount).reduce((s,c)=>s+(Number(c.expectedAmount)||0),0);
  const lpW=lps.filter(c=>c.expectedAmount&&c.likelihood).reduce((s,c)=>s+(Number(c.expectedAmount)||0)*(Number(c.likelihood)||0)/100,0);
  const lpWm=lps.filter(c=>["Data room accessed","In conversation","Soft commit"].includes(c.status)).length;
  const lnT=lnds.reduce((s,c)=>s+(Number(c.projectedLoanAmount)||0),0);
  function openNew(){setForm(tab==="LP"?{...ELP,id:Date.now()}:{...ELN,id:Date.now()});setView("form");}
  function openEdit(c){setForm({...c});setView("form");}
  function openDetail(c){setSel(c);setView("detail");}
  function goBack(){setView("list");setSel(null);}
  function submit(){const ex=contacts.find(c=>c.id===form.id);const up=ex?contacts.map(c=>c.id===form.id?{...form}:c):[...contacts,{...form}];setContacts(up);if(sel?.id===form.id)setSel({...form});setView(sel?.id===form.id?"detail":"list");}
  function del(id){setContacts(contacts.filter(c=>c.id!==id));goBack();}
  const tB=a=>({fontSize:11,padding:"8px 18px",background:"none",border:"none",borderBottom:a?`2px solid ${B.navy}`:"2px solid transparent",fontWeight:a?700:400,color:a?B.navy:B.muted,cursor:"pointer",marginBottom:-1,letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:FONT});

  if(view==="detail"&&sel){
    const c=contacts.find(x=>x.id===sel.id)||sel;
    return(<div style={{padding:"1rem 0"}}>
      <div style={{display:"flex",gap:8,marginBottom:"1rem"}}><button onClick={goBack} style={btn(true)}>← Back</button><button onClick={()=>openEdit(c)} style={btn()}>Edit</button><button onClick={()=>del(c.id)} style={{...btn(),background:B.danger}}>Delete</button></div>
      <div style={card}>
        <div style={{display:"flex",gap:14,marginBottom:"1rem",alignItems:"flex-start"}}>
          <Avatar name={c.name} color={c.type==="LP"?B.navy:B.sage}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><h3 style={{margin:0,fontSize:17,fontWeight:700,color:B.navy}}>{c.name||"Unnamed"}</h3><Badge label={c.type} color={c.type==="LP"?B.navy:B.sage}/><Badge label={c.priority} color={c.priority==="High"?B.danger:c.priority==="Low"?B.muted:B.blue}/>{c.tag&&<Badge label={c.tag} color={B.sage}/>}</div>
            <div style={{fontSize:13,color:B.muted,marginTop:3}}>{[c.title,c.firm].filter(Boolean).join(" · ")}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",fontSize:12,color:statCol(c.status),fontWeight:600}}><Pip color={statCol(c.status)}/>{c.status}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px 20px",marginBottom:"1rem",paddingTop:"1rem",borderTop:`1px solid ${B.light}`}}>
          <Field label="Email" value={c.email}/><Field label="Phone" value={c.phone}/>
          {c.type==="LP"&&<><Field label="Likelihood" value={c.likelihood?`${c.likelihood}%`:null}/><Field label="Expected amount" value={fmt$(c.expectedAmount)}/><Field label="How we know them" value={c.howWeKnowThem}/><Field label="What they care about" value={c.whatTheyCareAbout}/></>}
          {c.type==="Lender"&&<><Field label="Projected loan" value={fmt$(c.projectedLoanAmount)}/><Field label="Loan type" value={c.loanType}/><Field label="LTC appetite" value={c.ltcAppetite?`${c.ltcAppetite}%`:null}/><Field label="Geographies" value={c.geographies}/><Field label="Deals done" value={c.dealsDone}/></>}
        </div>
        {c.relationship&&<div style={{marginBottom:"0.75rem"}}><div style={lS}>Prior deal history</div><div style={{fontSize:13,color:B.navy,lineHeight:1.6}}>{c.relationship}</div></div>}
        {c.bio&&<div style={{marginBottom:"0.75rem"}}><div style={lS}>Bio</div><div style={{fontSize:13,color:B.navy,lineHeight:1.6}}>{c.bio}</div></div>}
        {c.nextStep&&<div style={{background:"#e8f0f7",borderRadius:6,padding:"10px 14px",marginBottom:"0.75rem"}}><div style={{...lS,color:B.blue}}>Next step</div><div style={{fontSize:13,color:B.navy}}>{c.nextStep}</div></div>}
        {c.notes&&<div><div style={lS}>Notes</div><div style={{fontSize:13,color:B.navy,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{c.notes}</div></div>}
      </div>
    </div>);
  }

  if(view==="form"){
    const F=({label,field,type="text",opts,span})=>(<div style={span?{gridColumn:"span 2"}:{}}><label style={lS}>{label}</label>{opts?<select value={form[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} style={iS}>{opts.map(o=><option key={o}>{o}</option>)}</select>:<input type={type} value={form[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} style={iS}/>}</div>);
    return(<div style={{padding:"1rem 0"}}>
      <div style={{display:"flex",gap:8,marginBottom:"1rem"}}><button onClick={()=>setView(sel?"detail":"list")} style={btn(true)}>Cancel</button></div>
      <div style={card}>
        <h3 style={{margin:"0 0 1rem",fontSize:15,fontWeight:700,color:B.navy,letterSpacing:"0.04em",textTransform:"uppercase"}}>{contacts.find(c=>c.id===form.id)?"Edit":"New"} {form.type}</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 16px"}}>
          <F label="Name" field="name"/><F label="Firm" field="firm"/>
          <F label="Title" field="title"/><F label="Email" field="email" type="email"/>
          <F label="Phone" field="phone" type="tel"/><F label="LinkedIn URL" field="linkedinUrl" type="url"/>
          <F label="Status" field="status" opts={form.type==="LP"?LP_STATUSES:LN_STATUSES}/>
          <F label="Priority" field="priority" opts={PRIORITIES}/>
          {form.type==="LP"&&<><F label="Expected ($)" field="expectedAmount" type="number"/><F label="Likelihood (%)" field="likelihood" type="number"/><F label="Tag" field="tag"/><F label="How we know them" field="howWeKnowThem"/><F label="What they care about" field="whatTheyCareAbout" span/></>}
          {form.type==="Lender"&&<><F label="Projected loan ($)" field="projectedLoanAmount" type="number"/><F label="Loan type" field="loanType" opts={["Construction-to-perm","Bridge","Construction only","Permanent","SBA","Other"]}/><F label="Min loan ($)" field="minLoanSize" type="number"/><F label="Max loan ($)" field="maxLoanSize" type="number"/><F label="LTC appetite (%)" field="ltcAppetite" type="number"/><F label="Geographies" field="geographies"/><F label="Deals done" field="dealsDone" span/></>}
        </div>
        {["relationship","bio","nextStep","notes"].map(f=>(<div key={f} style={{marginTop:12}}><label style={lS}>{f==="relationship"?"Prior deal history":f==="nextStep"?"Next step":f}</label><textarea value={form[f]||""} onChange={e=>setForm(fm=>({...fm,[f]:e.target.value}))} rows={f==="notes"?4:2} style={{...iS,resize:"vertical"}}/></div>))}
        <div style={{display:"flex",gap:8,marginTop:"1rem"}}><button onClick={submit} style={btn()}>Save contact</button></div>
      </div>
    </div>);
  }

  return(<div style={{padding:"1rem 0"}}>
    <div style={{display:"flex",gap:0,marginBottom:"1rem",borderBottom:`1px solid ${B.steel}`}}>
      {["LP","Lender"].map(t=>(<button key={t} onClick={()=>{setTab(t);setSf("All");setTf("All");}} style={tB(tab===t)}>{t}s ({contacts.filter(c=>c.type===t).length})</button>))}
      <div style={{flex:1}}/><button onClick={openNew} style={{...btn(),fontSize:11,margin:"4px 0"}}>+ Add {tab}</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:"1rem"}}>
      {(tab==="LP"?[["Prospects",lps.length],["Expected (gross)",fmt$(lpE)],["Weighted pipeline",fmt$(Math.round(lpW))],["Warm / active",lpWm]]:[["Lenders",lnds.length],["Projected loan",fmt$(lnT)],["Target",fmt$(5925000)],["Active",lnds.filter(c=>!["Not contacted","Passed"].includes(c.status)).length]]).map(([l,v])=>(
        <div key={l} style={SC()}><div style={{fontSize:10,color:"rgba(255,255,255,0.65)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>{l}</div><div style={{fontSize:20,fontWeight:700,color:B.white}}>{v}</div></div>
      ))}
    </div>
    <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap"}}>
      <input placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} style={{...iS,flex:1,minWidth:140}}/>
      <select value={sf} onChange={e=>setSf(e.target.value)} style={{...iS,width:"auto"}}><option>All</option>{sts.map(s=><option key={s}>{s}</option>)}</select>
      {tab==="LP"&&<select value={tf} onChange={e=>setTf(e.target.value)} style={{...iS,width:"auto"}}>{tags.map(t=><option key={t}>{t}</option>)}</select>}
    </div>
    {vis.length===0?<div style={{textAlign:"center",padding:"3rem",color:B.muted,fontSize:14}}>{contacts.filter(c=>c.type===tab).length===0?"No contacts yet.":"No contacts match your filters."}</div>:
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {vis.map(c=>(<div key={c.id} onClick={()=>openDetail(c)} style={{...card,cursor:"pointer",display:"flex",alignItems:"center",gap:12,padding:"10px 14px"}}>
          <Avatar name={c.name} color={c.type==="LP"?B.navy:B.sage}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span style={{fontWeight:600,fontSize:14,color:B.navy}}>{c.name||"Unnamed"}</span>{c.firm&&<span style={{fontSize:12,color:B.muted}}>{c.firm}</span>}{c.tag&&<Badge label={c.tag} color={B.sage}/>}<Badge label={c.priority} color={c.priority==="High"?B.danger:c.priority==="Low"?B.muted:B.blue}/></div>
            <div style={{display:"flex",gap:12,marginTop:3,flexWrap:"wrap"}}>
              {c.type==="LP"&&c.expectedAmount&&<span style={{fontSize:12,color:B.muted}}>Expected: {fmt$(c.expectedAmount)}{c.likelihood?` · ${c.likelihood}%`:""}</span>}
              {c.type==="Lender"&&c.projectedLoanAmount&&<span style={{fontSize:12,color:B.muted}}>Loan: {fmt$(c.projectedLoanAmount)}</span>}
              {c.nextStep&&<span style={{fontSize:12,color:B.sage}}>↳ {c.nextStep}</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",fontSize:11,color:statCol(c.status),fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}><Pip color={statCol(c.status)}/>{c.status}</div>
        </div>))}
      </div>}
  </div>);
}

const pC={"Initiation":B.navy,"Planning":B.sage,"Execution":B.blue,"Go Live":B.gold};
const GS=new Date("2025-07-01"),GE=new Date("2027-07-01"),GT=GE-GS;
const tP=d=>((new Date(d)-GS)/GT)*100;
const wP=(s,e)=>Math.max(((new Date(e)-new Date(s))/GT)*100,1);
const QS=[];
for(let y=2025;y<=2027;y++)for(let q=0;q<4;q++){const d=new Date(y,q*3,1);if(d>=GS&&d<=GE)QS.push({label:`Q${q+1} ${y}`,pct:tP(d)});}

function Timeline({miles,setMiles}){
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({});
  const nowP=tP(today);
  function save(){setMiles(miles.map(m=>m.id===form.id?{...form}:m));setEditing(null);}
  return(<div style={{padding:"1rem 0"}}>
    <div style={{fontSize:11,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"1rem",display:"flex",gap:16,flexWrap:"wrap"}}>
      {Object.entries(pC).map(([ph,col])=><span key={ph} style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:2,background:col,display:"inline-block"}}/>{ph}</span>)}
    </div>
    <div style={{...card,overflowX:"auto"}}>
      <div style={{display:"flex",marginBottom:8,marginLeft:180,position:"relative",height:20}}>
        {QS.map(q=><div key={q.label} style={{position:"absolute",left:`${q.pct}%`,fontSize:10,color:B.muted,letterSpacing:"0.04em",whiteSpace:"nowrap",transform:"translateX(-50%)"}}>{q.label}</div>)}
      </div>
      {miles.map(m=>(<div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}} onClick={()=>{setEditing(m.id);setForm({...m});}}>
        <div style={{width:172,flexShrink:0,fontSize:12,color:B.navy,fontWeight:editing===m.id?700:400,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</div>
        <div style={{flex:1,height:20,background:B.light,borderRadius:4,position:"relative",cursor:"pointer"}}>
          <div style={{position:"absolute",left:`${Math.max(0,tP(m.start))}%`,width:`${wP(m.start,m.end)}%`,height:"100%",background:pC[m.phase]||B.muted,borderRadius:4,opacity:0.85}}/>
          <div style={{position:"absolute",left:`${nowP}%`,top:0,bottom:0,width:1.5,background:B.danger,zIndex:2}}/>
        </div>
      </div>))}
    </div>
    {editing&&<div style={{...card,marginTop:"1rem"}}>
      <div style={{fontSize:12,fontWeight:700,color:B.navy,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"0.75rem"}}>Edit milestone</div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:12}}>
        <div><label style={lS}>Label</label><input value={form.label||""} onChange={e=>setForm(f=>({...f,label:e.target.value}))} style={iS}/></div>
        <div><label style={lS}>Start</label><input type="date" value={form.start||""} onChange={e=>setForm(f=>({...f,start:e.target.value}))} style={iS}/></div>
        <div><label style={lS}>End</label><input type="date" value={form.end||""} onChange={e=>setForm(f=>({...f,end:e.target.value}))} style={iS}/></div>
        <div><label style={lS}>Phase</label><select value={form.phase||""} onChange={e=>setForm(f=>({...f,phase:e.target.value}))} style={iS}>{Object.keys(pC).map(p=><option key={p}>{p}</option>)}</select></div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:12}}><button onClick={save} style={btn()}>Save</button><button onClick={()=>setEditing(null)} style={btn(true)}>Cancel</button></div>
    </div>}
    <div style={{fontSize:11,color:B.muted,marginTop:"0.75rem"}}>Click any milestone row to edit dates.</div>
  </div>);
}

const ET={id:null,title:"",owner:"Jimmy",due:"",priority:"Medium",status:"To do",notes:""};
const stC={"To do":B.muted,"In progress":B.blue,"Done":"#2a6b3f","Blocked":B.danger};

function Tasks({tasks,setTasks}){
  const [form,setForm]=useState(null);
  const [filter,setFilter]=useState("All");
  const [ownerF,setOwnerF]=useState("All");
  const vis=tasks.filter(t=>(filter==="All"||t.status===filter)&&(ownerF==="All"||t.owner===ownerF));
  function save(){const ex=tasks.find(t=>t.id===form.id);setTasks(ex?tasks.map(t=>t.id===form.id?{...form}:t):[...tasks,{...form}]);setForm(null);}
  return(<div style={{padding:"1rem 0"}}>
    <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
      <select value={filter} onChange={e=>setFilter(e.target.value)} style={{...iS,width:"auto"}}><option>All</option>{TASK_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      <select value={ownerF} onChange={e=>setOwnerF(e.target.value)} style={{...iS,width:"auto"}}><option>All</option>{OWNERS.map(o=><option key={o}>{o}</option>)}</select>
      <div style={{flex:1}}/><button onClick={()=>setForm({...ET,id:Date.now()})} style={btn()}>+ Add task</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
      {TASK_STATUSES.map(col=>(<div key={col}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:stC[col],marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:stC[col],display:"inline-block"}}/>{col} <span style={{color:B.muted,fontWeight:400}}>({vis.filter(t=>t.status===col).length})</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {vis.filter(t=>t.status===col).map(t=>(<div key={t.id} onClick={()=>setForm({...t})} style={{...card,cursor:"pointer",padding:"10px 12px"}}>
            <div style={{fontSize:13,fontWeight:600,color:B.navy,marginBottom:4}}>{t.title}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:t.notes?6:0}}><Badge label={t.priority} color={t.priority==="High"?B.danger:t.priority==="Low"?B.muted:B.blue}/><Badge label={t.owner} color={B.navy}/>{t.due&&<span style={{fontSize:10,color:B.muted}}>Due {t.due}</span>}</div>
            {t.notes&&<div style={{fontSize:11,color:B.muted,lineHeight:1.5,borderTop:`1px solid ${B.light}`,paddingTop:6,marginTop:4}}>{t.notes}</div>}
          </div>))}
        </div>
      </div>))}
    </div>
    {form&&(<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(2,29,43,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
      <div style={{...card,width:480,maxWidth:"90vw",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{fontSize:13,fontWeight:700,color:B.navy,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"1rem"}}>{tasks.find(t=>t.id===form.id)?"Edit task":"New task"}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
          <div style={{gridColumn:"span 2"}}><label style={lS}>Title</label><input value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={iS}/></div>
          {[["Owner","owner","select",OWNERS],["Priority","priority","select",PRIORITIES],["Status","status","select",TASK_STATUSES],["Due date","due","date",null]].map(([l,f,type,opts])=>(<div key={f}><label style={lS}>{l}</label>{opts?<select value={form[f]||""} onChange={e=>setForm(fm=>({...fm,[f]:e.target.value}))} style={iS}>{opts.map(o=><option key={o}>{o}</option>)}</select>:<input type={type} value={form[f]||""} onChange={e=>setForm(fm=>({...fm,[f]:e.target.value}))} style={iS}/>}</div>))}
          <div style={{gridColumn:"span 2"}}><label style={lS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm(fm=>({...fm,notes:e.target.value}))} rows={3} style={{...iS,resize:"vertical"}}/></div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:"1rem",justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:8}}><button onClick={save} style={btn()}>Save</button><button onClick={()=>setForm(null)} style={btn(true)}>Cancel</button></div>
          {tasks.find(t=>t.id===form.id)&&<button onClick={()=>{setTasks(tasks.filter(t=>t.id!==form.id));setForm(null);}} style={{...btn(),background:B.danger}}>Delete</button>}
        </div>
      </div>
    </div>)}
  </div>);
}

export default function App(){
  const [nav,setNav]=useState("Dashboard");
  const [contacts,setContacts]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [miles,setMiles]=useState([]);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    const cr=store.get(CRM_KEY),tr=store.get(TASK_KEY),mr=store.get(MILE_KEY);
    setContacts(cr?.value?JSON.parse(cr.value):DEFAULT_CONTACTS);
    setTasks(tr?.value?JSON.parse(tr.value):DEFAULT_TASKS);
    setMiles(mr?.value?JSON.parse(mr.value):DEFAULT_MILES);
    setLoaded(true);
  },[]);
  useEffect(()=>{
    if(!loaded)return;
    store.set(CRM_KEY,JSON.stringify(contacts));
    store.set(TASK_KEY,JSON.stringify(tasks));
    store.set(MILE_KEY,JSON.stringify(miles));
  },[contacts,tasks,miles,loaded]);
  const TABS=["Dashboard","CRM","Timeline","Tasks"];
  if(!loaded)return <div style={{fontFamily:FONT,padding:"3rem",color:B.muted,textAlign:"center",fontSize:14}}>Loading...</div>;
  return(<div style={{fontFamily:FONT,background:B.offwhite,minHeight:"100vh"}}>
    <div style={{background:B.navy,padding:"0 2rem",display:"flex",alignItems:"center",gap:0}}>
      <div style={{marginRight:32,paddingRight:32,borderRight:"1px solid rgba(255,255,255,0.15)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:"0.1em",textTransform:"uppercase"}}>The Neighborhood Hotel</div>
        <div style={{fontSize:14,fontWeight:700,color:B.white,letterSpacing:"0.06em",textTransform:"uppercase"}}>115 N Barton</div>
      </div>
      {TABS.map(t=>(<button key={t} onClick={()=>setNav(t)} style={{background:"none",border:"none",borderBottom:nav===t?"2px solid #ccd5de":"2px solid transparent",color:nav===t?B.white:"rgba(255,255,255,0.55)",fontSize:11,fontWeight:nav===t?700:400,letterSpacing:"0.07em",textTransform:"uppercase",padding:"1rem 1.25rem",cursor:"pointer",fontFamily:FONT,marginBottom:-1}}>{t}</button>))}
    </div>
    <div style={{maxWidth:980,margin:"0 auto",padding:"0 1.5rem 3rem"}}>
      {nav==="Dashboard"&&<Dashboard contacts={contacts} tasks={tasks} miles={miles}/>}
      {nav==="CRM"&&<CRM contacts={contacts} setContacts={setContacts}/>}
      {nav==="Timeline"&&<Timeline miles={miles} setMiles={setMiles}/>}
      {nav==="Tasks"&&<Tasks tasks={tasks} setTasks={setTasks}/>}
    </div>
  </div>);
}
