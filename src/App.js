import { useState, useEffect, useCallback } from "react";
import { DEFAULT_CONTACTS, DEFAULT_MILES, DEFAULT_TASKS } from "./data";

// ── Supabase config ────────────────────────────────────────────────────────
const SUPABASE_URL = "https://bhwfnogroaxttmtvulft.supabase.co";
const SUPABASE_KEY = "sb_publishable_E6WAINsjfdTeGs0_xAK6ig_VGIzDI_w";
const SB = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...(opts.headers || {}),
    },
  });

// ── Supabase helpers ───────────────────────────────────────────────────────
async function sbFetch(table) {
  const res = await SB(`${table}?select=*`);
  if (!res.ok) throw new Error(`Fetch ${table} failed: ${res.status}`);
  return res.json();
}

async function sbUpsert(table, rows) {
  const res = await SB(table, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(rows),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upsert ${table} failed: ${err}`);
  }
  return res.json();
}

async function sbDelete(table, id) {
  const res = await SB(`${table}?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  if (!res.ok) throw new Error(`Delete ${table} failed: ${res.status}`);
}

// Map JS objects → DB rows and back
function contactToRow(c) {
  return {
    id: String(c.id),
    type: c.type === "LP" ? "lp" : "lender",
    name: c.name || "",
    email: c.email || "",
    phone: c.phone || "",
    status: c.status || "",
    priority: c.priority || "Medium",
    expected_amount: c.expectedAmount ? Number(c.expectedAmount) : null,
    likelihood: c.likelihood ? Number(c.likelihood) : null,
    tag: c.tag || "",
    bio: c.bio || "",
    prior_deal_history: c.relationship || "",
    relationship_notes: c.howWeKnowThem || "",
    what_they_care_about: c.whatTheyCareAbout || "",
    next_step: c.nextStep || "",
    notes: c.notes || "",
    // extra LP fields stored in notes as JSON suffix — we flatten into notes
    // lender-specific fields stored in notes
    updated_at: new Date().toISOString(),
    // We store extra fields as serialized JSON in a spare column via notes augmentation
    // Actually store full object as JSON in notes_json virtual approach:
    // Instead, store supplementary fields in a single "notes" blob approach won't work cleanly.
    // We'll persist full contact as JSON in the notes field prefixed with a sentinel,
    // and parse it back out. This avoids schema changes while keeping all portal fields.
    _extra: JSON.stringify({
      firm: c.firm || "",
      title: c.title || "",
      linkedinUrl: c.linkedinUrl || "",
      howWeKnowThem: c.howWeKnowThem || "",
      whatTheyCareAbout: c.whatTheyCareAbout || "",
      relationship: c.relationship || "",
      // lender fields
      projectedLoanAmount: c.projectedLoanAmount || "",
      loanType: c.loanType || "",
      dealsDone: c.dealsDone || "",
      minLoanSize: c.minLoanSize || "",
      maxLoanSize: c.maxLoanSize || "",
      ltcAppetite: c.ltcAppetite || "",
      geographies: c.geographies || "",
    }),
  };
}

function rowToContact(r) {
  let extra = {};
  try { extra = JSON.parse(r._extra || "{}"); } catch (_) {}
  return {
    id: r.id,
    type: r.type === "lp" ? "LP" : "Lender",
    name: r.name || "",
    firm: extra.firm || "",
    title: extra.title || "",
    email: r.email || "",
    phone: r.phone || "",
    linkedinUrl: extra.linkedinUrl || "",
    status: r.status || "",
    priority: r.priority || "Medium",
    expectedAmount: r.expected_amount || "",
    likelihood: r.likelihood || "",
    tag: r.tag || "",
    bio: r.bio || "",
    relationship: extra.relationship || r.prior_deal_history || "",
    howWeKnowThem: extra.howWeKnowThem || r.relationship_notes || "",
    whatTheyCareAbout: extra.whatTheyCareAbout || r.what_they_care_about || "",
    nextStep: r.next_step || "",
    notes: r.notes || "",
    projectedLoanAmount: extra.projectedLoanAmount || "",
    loanType: extra.loanType || "Construction-to-perm",
    dealsDone: extra.dealsDone || "",
    minLoanSize: extra.minLoanSize || "",
    maxLoanSize: extra.maxLoanSize || "",
    ltcAppetite: extra.ltcAppetite || "",
    geographies: extra.geographies || "",
  };
}

function taskToRow(t) {
  return {
    id: String(t.id),
    task_id: String(t.id),
    workstream: t.workstream || "",
    title: t.title || "",
    owner: t.owner || "Jimmy",
    status: t.status || "Not Started",
    due_date: t.due || null,
    priority: t.priority || "Medium",
    notes: t.notes || "",
    updated_at: new Date().toISOString(),
  };
}

function rowToTask(r) {
  return {
    id: r.id,
    task_id: r.task_id,
    workstream: r.workstream || "",
    title: r.title || "",
    owner: r.owner || "Jimmy",
    status: r.status || "Not Started",
    due: r.due_date || "",
    priority: r.priority || "Medium",
    notes: r.notes || "",
  };
}

function mileToRow(m) {
  return {
    id: String(m.id),
    milestone_id: String(m.id),
    label: m.label || "",
    phase: m.phase || "Execution",
    start_date: m.start || null,
    end_date: m.end || null,
    updated_at: new Date().toISOString(),
  };
}

function rowToMile(r) {
  return {
    id: r.id,
    label: r.label || "",
    phase: r.phase || "Execution",
    start: r.start_date || "",
    end: r.end_date || "",
  };
}

// ── Brand / style constants (unchanged) ───────────────────────────────────
const B={navy:"#021d2b",blue:"#033b57",steel:"#ccd5de",sage:"#5e7361",white:"#ffffff",offwhite:"#f4f6f8",muted:"#6b8497",border:"#ccd5de",danger:"#7a1e1e",gold:"#c9a84c",light:"#e8edf1"};
const FONT="'Gill Sans','Gill Sans MT','Trebuchet MS',sans-serif";
const LP_STAT_COL={"Deck sent":B.blue,"Data room accessed":B.sage,"In conversation":B.sage,"Soft commit":B.gold,"Committed":"#2a6b3f","Passed":B.danger};
const LN_STAT_COL={"Not contacted":B.muted,"Outreach sent":B.blue,"Term sheet requested":B.gold,"Term sheet received":B.gold,"In diligence":B.sage,"Committed":"#2a6b3f","Passed":B.danger};
const statCol=s=>LP_STAT_COL[s]||LN_STAT_COL[s]||B.muted;
const LP_STATUSES=["Deck sent","Data room accessed","In conversation","Soft commit","Committed","Passed"];
const LN_STATUSES=["Not contacted","Outreach sent","Term sheet requested","Term sheet received","In diligence","Committed","Passed"];
const PRIORITIES=["High","Medium","Low"];
const OWNERS=["Jimmy","Jonathan","Jackson","Matt","Eric","Jason"];
const TASK_STATUS_DISPLAY=["Not Started","In Progress","Complete","Overdue","Blocked"];
const fmt$=n=>(!n&&n!==0)?"—":"$"+Number(n).toLocaleString();
const initials=n=>(n||"?").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
const today=new Date();
const todayStr=today.toISOString().split("T")[0];

const Pip=({color})=><span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:color||B.muted,marginRight:6,flexShrink:0}}/>;
const Badge=({label,color=B.muted})=><span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:3,background:color+"20",color,border:`1px solid ${color}44`,letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>;
const Avatar=({name,color=B.navy})=><div style={{width:36,height:36,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:B.white,flexShrink:0}}>{initials(name)}</div>;
const Field=({label,value})=><div><div style={{fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>{label}</div><div style={{fontSize:13,color:B.navy}}>{value||"—"}</div></div>;
const card={background:B.white,border:`1px solid ${B.steel}`,borderRadius:8,padding:"1rem 1.25rem"};
const SC=(a=B.navy)=>({background:a,borderRadius:6,padding:"14px 16px"});
const btn=(g=false)=>({fontSize:11,padding:"7px 16px",borderRadius:4,cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:FONT,fontWeight:600,background:g?"transparent":B.navy,color:g?B.navy:B.white,border:g?`1px solid ${B.navy}`:"none"});
const iS={fontSize:13,fontFamily:FONT,border:`1px solid ${B.steel}`,borderRadius:4,padding:"7px 10px",color:B.navy,background:B.white,width:"100%",boxSizing:"border-box"};
const lS={fontSize:11,color:B.muted,display:"block",marginBottom:4,letterSpacing:"0.05em",textTransform:"uppercase"};

function normalizeStatus(s){
  const l=(s||"").toLowerCase().trim();
  if(l==="complete"||l==="done")return"Complete";
  if(l==="in progress"||l==="in-progress"||l==="inprogress")return"In Progress";
  if(l==="overdue")return"Overdue";
  if(l==="blocked")return"Blocked";
  return"Not Started";
}

function normalizeDate(d){
  if(!d||d==="—"||d.trim()==="")return"";
  const s=d.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const parsed=new Date(s);
  if(!isNaN(parsed.getTime())){
    return`${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,"0")}-${String(parsed.getDate()).padStart(2,"0")}`;
  }
  const slash=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(slash){let yr=parseInt(slash[3]);if(yr<100)yr+=2000;return`${yr}-${String(parseInt(slash[1])).padStart(2,"0")}-${String(parseInt(slash[2])).padStart(2,"0")}`;}
  return s;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({contacts,tasks,miles}){
  const lps=contacts.filter(c=>c.type==="LP");
  const lenders=contacts.filter(c=>c.type==="Lender");
  const committed=lps.filter(c=>c.status==="Committed").reduce((s,c)=>s+(Number(c.expectedAmount)||0),0);
  const weighted=lps.filter(c=>c.expectedAmount&&c.likelihood).reduce((s,c)=>s+(Number(c.expectedAmount)||0)*(Number(c.likelihood)||0)/100,0);
  const warm=lps.filter(c=>["Data room accessed","In conversation","Soft commit"].includes(c.status)).length;
  const activeLenders=lenders.filter(c=>!["Not contacted","Passed"].includes(c.status)).length;
  const highTasks=tasks.filter(t=>t.priority==="High"&&normalizeStatus(t.status)!=="Complete").length;
  const pC={"Initiation":B.navy,"Planning":B.sage,"Execution":B.blue,"Go Live":B.gold};
  const GS=new Date("2025-07-01"),GE=new Date("2027-07-01"),GT=GE-GS;
  const tP=d=>((new Date(d)-GS)/GT)*100;
  const nowP=Math.min(100,Math.max(0,((today-GS)/GT)*100));
  const urgT=tasks.filter(t=>t.priority==="High"&&normalizeStatus(t.status)!=="Complete").slice(0,4);
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
          {urgT.length===0&&<div style={{fontSize:13,color:B.muted}}>All caught up.</div>}
          {urgT.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${B.light}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:B.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:B.white,fontWeight:700,flexShrink:0}}>{(t.owner||"?")[0]}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:B.navy}}>{t.title}</div><div style={{fontSize:11,color:B.muted,marginTop:1}}>{t.owner} · Due {t.due||"TBD"}</div></div>
              <Badge label={normalizeStatus(t.status)} color={normalizeStatus(t.status)==="In Progress"?B.blue:normalizeStatus(t.status)==="Overdue"?B.danger:B.muted}/>
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

// ── CRM ────────────────────────────────────────────────────────────────────
const ELP={id:null,type:"LP",name:"",firm:"",title:"",email:"",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:"",expectedAmount:"",tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""};
const ELN={id:null,type:"Lender",name:"",firm:"",title:"",email:"",phone:"",linkedinUrl:"",status:"Not contacted",priority:"Medium",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"",notes:""};

function CRM({contacts,setContacts,onSave,onDelete}){
  const [tab,setTab]=useState("LP");
  const [sf,setSf]=useState("All");
  const [tf,setTf]=useState("All");
  const [q,setQ]=useState("");
  const [view,setView]=useState("list");
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState(ELP);
  const [saving,setSaving]=useState(false);
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
  function openNew(){setForm(tab==="LP"?{...ELP,id:`lp-${Date.now()}`}:{...ELN,id:`ln-${Date.now()}`});setView("form");}
  function openEdit(c){setForm({...c});setView("form");}
  function openDetail(c){setSel(c);setView("detail");}
  function goBack(){setView("list");setSel(null);}
  async function submit(){
    setSaving(true);
    try{
      const ex=contacts.find(c=>c.id===form.id);
      const up=ex?contacts.map(c=>c.id===form.id?{...form}:c):[...contacts,{...form}];
      await onSave("contacts",[form]);
      setContacts(up);
      if(sel?.id===form.id)setSel({...form});
      setView(sel?.id===form.id?"detail":"list");
    }finally{setSaving(false);}
  }
  async function del(id){
    setSaving(true);
    try{
      await onDelete("contacts",id);
      setContacts(contacts.filter(c=>c.id!==id));
      goBack();
    }finally{setSaving(false);}
  }
  const tB=a=>({fontSize:11,padding:"8px 18px",background:"none",border:"none",borderBottom:a?`2px solid ${B.navy}`:"2px solid transparent",fontWeight:a?700:400,color:a?B.navy:B.muted,cursor:"pointer",marginBottom:-1,letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:FONT});

  if(view==="detail"&&sel){
    const c=contacts.find(x=>x.id===sel.id)||sel;
    return(<div style={{padding:"1rem 0"}}>
      <div style={{display:"flex",gap:8,marginBottom:"1rem"}}><button onClick={goBack} style={btn(true)}>← Back</button><button onClick={()=>openEdit(c)} style={btn()}>Edit</button><button onClick={()=>del(c.id)} style={{...btn(),background:B.danger}}>{saving?"Deleting…":"Delete"}</button></div>
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
        <div style={{display:"flex",gap:8,marginTop:"1rem"}}><button onClick={submit} style={btn()} disabled={saving}>{saving?"Saving…":"Save contact"}</button></div>
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

// ── Timeline ───────────────────────────────────────────────────────────────
const pC={"Initiation":B.navy,"Planning":B.sage,"Execution":B.blue,"Go Live":B.gold};
const GS=new Date("2025-07-01"),GE=new Date("2027-07-01"),GT=GE-GS;
const tP=d=>((new Date(d)-GS)/GT)*100;
const wP=(s,e)=>Math.max(((new Date(e)-new Date(s))/GT)*100,1);
const QS=[];
for(let y=2025;y<=2027;y++)for(let q=0;q<4;q++){const d=new Date(y,q*3,1);if(d>=GS&&d<=GE)QS.push({label:`Q${q+1} ${y}`,pct:tP(d)});}

function Timeline({miles,setMiles,onSave}){
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({});
  const [saving,setSaving]=useState(false);
  const nowP=tP(today);
  async function save(){
    setSaving(true);
    try{
      await onSave("milestones",[form]);
      setMiles(miles.map(m=>m.id===form.id?{...form}:m));
      setEditing(null);
    }finally{setSaving(false);}
  }
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
      <div style={{display:"flex",gap:8,marginTop:12}}><button onClick={save} style={btn()} disabled={saving}>{saving?"Saving…":"Save"}</button><button onClick={()=>setEditing(null)} style={btn(true)}>Cancel</button></div>
    </div>}
    <div style={{fontSize:11,color:B.muted,marginTop:"0.75rem"}}>Click any milestone row to edit dates.</div>
  </div>);
}

// ── Tasks ──────────────────────────────────────────────────────────────────
const ET={id:null,title:"",workstream:"",owner:"Jimmy",due:"",priority:"Medium",status:"Not Started",notes:""};
const taskStatusColor={"Not Started":B.muted,"In Progress":B.blue,"Complete":"#2a6b3f","Overdue":B.danger,"Blocked":B.danger};

function Tasks({tasks,setTasks,onSave,onDelete}){
  const [view,setView]=useState("calendar");
  const [form,setForm]=useState(null);
  const [filterOwner,setFilterOwner]=useState("All");
  const [filterStatus,setFilterStatus]=useState("All");
  const [sortCol,setSortCol]=useState("due");
  const [sortDir,setSortDir]=useState("asc");
  const [calMonth,setCalMonth]=useState(()=>{const d=new Date();d.setDate(1);d.setHours(0,0,0,0);return d;});
  const [saving,setSaving]=useState(false);

  const enriched=tasks.map(t=>{
    const due=normalizeDate(t.due);
    let status=normalizeStatus(t.status);
    if(due&&due<todayStr&&status!=="Complete")status="Overdue";
    return{...t,due,status};
  });

  const counts={
    "Not Started":enriched.filter(t=>t.status==="Not Started").length,
    "In Progress":enriched.filter(t=>t.status==="In Progress").length,
    "Complete":enriched.filter(t=>t.status==="Complete").length,
    "Overdue":enriched.filter(t=>t.status==="Overdue").length,
  };

  const filtered=enriched.filter(t=>(filterOwner==="All"||t.owner===filterOwner)&&(filterStatus==="All"||t.status===filterStatus));

  async function saveTask(f){
    setSaving(true);
    try{
      const n={...f,due:normalizeDate(f.due)};
      await onSave("tasks",[n]);
      const ex=tasks.find(t=>t.id===n.id);
      setTasks(ex?tasks.map(t=>t.id===n.id?n:t):[...tasks,n]);
      setForm(null);
    }finally{setSaving(false);}
  }
  async function deleteTask(id){
    setSaving(true);
    try{
      await onDelete("tasks",id);
      setTasks(tasks.filter(t=>t.id!==id));
      setForm(null);
    }finally{setSaving(false);}
  }

  function calDays(){
    const y=calMonth.getFullYear(),m=calMonth.getMonth();
    const first=new Date(y,m,1),last=new Date(y,m+1,0);
    const days=[];
    for(let i=0;i<first.getDay();i++)days.push(null);
    for(let d=1;d<=last.getDate();d++)days.push(new Date(y,m,d));
    while(days.length%7!==0)days.push(null);
    return days;
  }
  function tasksOnDay(d){
    const ds=d.toISOString().split("T")[0];
    return enriched.filter(t=>t.due===ds);
  }
  const monthName=calMonth.toLocaleString("default",{month:"long",year:"numeric"});
  const days=calDays();
  const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  function toggleSort(col){if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir("asc");}}
  const sorted=[...filtered].sort((a,b)=>{
    let av=a[sortCol]||"",bv=b[sortCol]||"";
    if(sortCol==="due"){av=av||"9999";bv=bv||"9999";}
    const r=av<bv?-1:av>bv?1:0;
    return sortDir==="asc"?r:-r;
  });

  const TaskModal=()=>form?(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(2,29,43,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
      <div style={{...card,width:520,maxWidth:"92vw",maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{fontSize:13,fontWeight:700,color:B.navy,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"1rem"}}>{tasks.find(t=>t.id===form.id)?"Edit task":"New task"}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
          <div style={{gridColumn:"span 2"}}><label style={lS}>Title</label><input value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={iS}/></div>
          <div><label style={lS}>Workstream</label><input value={form.workstream||""} onChange={e=>setForm(f=>({...f,workstream:e.target.value}))} style={iS}/></div>
          <div><label style={lS}>Owner</label><select value={form.owner||"Jimmy"} onChange={e=>setForm(f=>({...f,owner:e.target.value}))} style={iS}>{OWNERS.map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label style={lS}>Priority</label><select value={form.priority||"Medium"} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={iS}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
          <div><label style={lS}>Status</label><select value={form.status||"Not Started"} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={iS}>{TASK_STATUS_DISPLAY.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={{gridColumn:"span 2"}}><label style={lS}>Due date</label><input type="date" value={form.due||""} onChange={e=>setForm(f=>({...f,due:e.target.value}))} style={iS}/></div>
          <div style={{gridColumn:"span 2"}}><label style={lS}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} style={{...iS,resize:"vertical"}}/></div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:"1rem",justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:8}}><button onClick={()=>saveTask(form)} style={btn()} disabled={saving}>{saving?"Saving…":"Save"}</button><button onClick={()=>setForm(null)} style={btn(true)}>Cancel</button></div>
          {tasks.find(t=>t.id===form.id)&&<button onClick={()=>deleteTask(form.id)} style={{...btn(),background:B.danger}} disabled={saving}>Delete</button>}
        </div>
      </div>
    </div>
  ):null;

  return(
    <div style={{padding:"1rem 0"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:"1.25rem"}}>
        {[["Not Started",B.muted],["In Progress",B.blue],["Complete","#2a6b3f"],["Overdue",B.danger]].map(([s,c])=>(
          <div key={s} onClick={()=>setFilterStatus(filterStatus===s?"All":s)} style={{...SC(c),cursor:"pointer",outline:filterStatus===s?`2px solid ${B.steel}`:"none",opacity:filterStatus!=="All"&&filterStatus!==s?0.55:1}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{s}</div>
            <div style={{fontSize:28,fontWeight:700,color:B.white}}>{counts[s]}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        <select value={filterOwner} onChange={e=>setFilterOwner(e.target.value)} style={{...iS,width:"auto"}}><option>All</option>{OWNERS.map(o=><option key={o}>{o}</option>)}</select>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:0,border:`1px solid ${B.steel}`,borderRadius:4,overflow:"hidden"}}>
          {[["calendar","Calendar"],["table","Table"]].map(([v,label])=>(
            <button key={v} onClick={()=>setView(v)} style={{fontSize:11,padding:"7px 18px",background:view===v?B.navy:"transparent",color:view===v?B.white:B.muted,border:"none",cursor:"pointer",fontFamily:FONT,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>{label}</button>
          ))}
        </div>
        <button onClick={()=>setForm({...ET,id:`task-${Date.now()}`})} style={btn()}>+ Add task</button>
      </div>
      {view==="calendar"&&(
        <div style={{background:B.white,border:`1px solid ${B.steel}`,borderRadius:10,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${B.light}`}}>
            <button onClick={()=>setCalMonth(m=>{const d=new Date(m);d.setMonth(d.getMonth()-1);return d;})} style={{...btn(true),padding:"4px 14px",fontSize:16}}>‹</button>
            <div style={{fontSize:15,fontWeight:700,color:B.navy,letterSpacing:"0.04em",textTransform:"uppercase"}}>{monthName}</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>{const d=new Date();d.setDate(1);d.setHours(0,0,0,0);setCalMonth(d);}} style={{...btn(true),padding:"4px 12px",fontSize:11}}>Today</button>
              <button onClick={()=>setCalMonth(m=>{const d=new Date(m);d.setMonth(d.getMonth()+1);return d;})} style={{...btn(true),padding:"4px 14px",fontSize:16}}>›</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:B.offwhite,borderBottom:`1px solid ${B.light}`}}>
            {DOW.map(d=><div key={d} style={{padding:"8px 0",textAlign:"center",fontSize:11,fontWeight:600,color:B.muted,letterSpacing:"0.06em"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))"}}>
            {days.map((d,i)=>{
              const dayTasks=d?tasksOnDay(d):[];
              const isToday=d&&d.toISOString().split("T")[0]===todayStr;
              const isCurrentMonth=d&&d.getMonth()===calMonth.getMonth();
              const overflow=dayTasks.length-3;
              return(
                <div key={i} style={{height:110,overflow:"hidden",padding:"5px 6px",borderRight:i%7!==6?`1px solid ${B.light}`:"none",borderBottom:`1px solid ${B.light}`,background:isCurrentMonth?B.white:B.offwhite}}>
                  {d&&<>
                    <div style={{marginBottom:3}}>
                      <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",fontSize:12,fontWeight:isToday?700:400,background:isToday?B.navy:"transparent",color:isToday?B.white:isCurrentMonth?B.navy:B.muted}}>{d.getDate()}</span>
                    </div>
                    {dayTasks.slice(0,3).map(t=>{
                      const sc=taskStatusColor[t.status]||B.muted;
                      return(<div key={t.id} onClick={()=>setForm({...t})} title={t.title} style={{fontSize:10,fontWeight:600,padding:"2px 5px",borderRadius:3,marginBottom:2,cursor:"pointer",background:sc,color:B.white,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>);
                    })}
                    {overflow>0&&<div style={{fontSize:10,color:B.muted,paddingLeft:2}}>+{overflow} more</div>}
                  </>}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:16,padding:"10px 16px",borderTop:`1px solid ${B.light}`,flexWrap:"wrap"}}>
            {[["Not Started",B.muted],["In Progress",B.blue],["Complete","#2a6b3f"],["Overdue",B.danger]].map(([s,c])=>(
              <span key={s} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:B.muted}}><span style={{width:10,height:10,borderRadius:2,background:c,display:"inline-block"}}/>{s}</span>
            ))}
          </div>
        </div>
      )}
      {view==="table"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:B.navy}}>
                <th style={{width:36,padding:"10px 12px",color:"rgba(255,255,255,0.5)",fontSize:10,fontWeight:600,textAlign:"left"}}>#</th>
                {[["workstream","Workstream"],["title","Title"],["owner","Owner"],["status","Status"],["due","Due date"],["priority","Priority"],["notes","Notes"]].map(([col,label])=>(
                  <th key={col} onClick={()=>toggleSort(col)} style={{padding:"10px 12px",color:sortCol===col?"#ccd5de":"rgba(255,255,255,0.6)",fontSize:10,fontWeight:600,textAlign:"left",cursor:"pointer",letterSpacing:"0.05em",textTransform:"uppercase",userSelect:"none",whiteSpace:"nowrap"}}>
                    {label}{sortCol===col?(sortDir==="asc"?" ↑":" ↓"):""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t,i)=>{
                const sc=taskStatusColor[t.status]||B.muted;
                return(
                  <tr key={t.id} onClick={()=>setForm({...t})} style={{cursor:"pointer",borderBottom:`1px solid ${B.light}`,background:i%2===0?B.white:B.offwhite}}>
                    <td style={{padding:"9px 12px",fontSize:11,color:B.muted}}>{i+1}</td>
                    <td style={{padding:"9px 12px",color:B.muted,fontSize:12,whiteSpace:"nowrap"}}>{t.workstream||"—"}</td>
                    <td style={{padding:"9px 12px",color:B.navy,fontWeight:600,maxWidth:240}}>{t.title}</td>
                    <td style={{padding:"9px 12px",fontSize:12,whiteSpace:"nowrap"}}>{t.owner||"—"}</td>
                    <td style={{padding:"9px 12px"}}><span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:3,background:sc+"22",color:sc,border:`1px solid ${sc}44`,letterSpacing:"0.04em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{t.status}</span></td>
                    <td style={{padding:"9px 12px",fontSize:12,color:t.status==="Overdue"?B.danger:B.muted,fontWeight:t.status==="Overdue"?700:400,whiteSpace:"nowrap"}}>{t.due||"—"}</td>
                    <td style={{padding:"9px 12px"}}><span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:3,background:(t.priority==="High"?B.danger:t.priority==="Low"?B.muted:B.blue)+"22",color:t.priority==="High"?B.danger:t.priority==="Low"?B.muted:B.blue,border:`1px solid ${(t.priority==="High"?B.danger:t.priority==="Low"?B.muted:B.blue)}44`,letterSpacing:"0.04em",textTransform:"uppercase"}}>{t.priority||"Medium"}</span></td>
                    <td style={{padding:"9px 12px",fontSize:12,color:B.muted,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.notes||"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length===0&&<div style={{padding:"3rem",textAlign:"center",color:B.muted,fontSize:13}}>No tasks match your filters.</div>}
        </div>
      )}
      <TaskModal/>
    </div>
  );
}

// ── Import helpers (unchanged logic) ──────────────────────────────────────
const LP_PORTAL_FIELDS=["bio","relationship","whatTheyCareAbout","howWeKnowThem","nextStep","linkedinUrl"];
const LN_PORTAL_FIELDS=["bio","dealsDone","minLoanSize","maxLoanSize","ltcAppetite","geographies","nextStep","linkedinUrl"];

function parseCSV(text){
  const lines=text.trim().split('\n').filter(l=>l.trim());
  if(lines.length<2)return[];
  const headers=lines[0].split('\t').map(h=>h.trim());
  return lines.slice(1).map(line=>{
    const vals=line.split('\t');
    const obj={};
    headers.forEach((h,i)=>{obj[h]=(vals[i]||'').trim();});
    return obj;
  });
}
function mapJSStatus(s){const l=s.toLowerCase();if(l==='closed')return'Committed';if(l==='contacted')return'Deck sent';if(l==='new')return'Deck sent';if(l.includes('commit'))return'Soft commit';if(l==='passed')return'Passed';return'Deck sent';}
function mapLenderStatus(s){const l=s.toLowerCase();if(l.includes('term sheet received'))return'Term sheet received';if(l.includes('term sheet'))return'Term sheet requested';if(l.includes('diligence'))return'In diligence';if(l.includes('commit'))return'Committed';if(l.includes('passed'))return'Passed';if(l.includes('target')||l.includes('outreach'))return'Outreach sent';return'Not contacted';}
function mapPriority(s){const l=(s||'').toLowerCase();if(l==='high')return'High';if(l==='low')return'Low';return'Medium';}
function mapTaskStatus(s){const l=(s||'').toLowerCase();if(l.includes('complete')||l==='done')return'Complete';if(l.includes('progress')||l.includes('active'))return'In Progress';if(l.includes('block'))return'Blocked';if(l.includes('overdue'))return'Overdue';return'Not Started';}

function mergeJSProspects(rows,existing){
  const seen=new Set();const incoming=[];
  rows.forEach(r=>{
    const names=(r['Contacts']||'').split(';').map(s=>s.trim()).filter(Boolean);
    const emails=r['Email addresses']||'';const phones=r['Phone numbers']||'';
    const tag=(r['Prospect tags']||'').split(';')[0].trim();
    const likelihood=parseInt(r['Likelihood'])||null;
    const expected=parseFloat((r['Expected']||'').replace(/[$,]/g,''))||null;
    const jsStatus=mapJSStatus(r['Prospect Status']||'');
    const dataRoomAccessed=(r[' Data room access detail']||r['Data room last accessed']||'').toLowerCase().includes('accessed');
    const status=dataRoomAccessed&&jsStatus==='Deck sent'?'Data room accessed':jsStatus;
    const positions=r['Positions']||'';const notes=r['Notes']||'';const lastUpdate=r['Latest update']||'';const latestTask=r['Latest task']||'';
    names.forEach((name,idx)=>{
      if(seen.has(name))return;seen.add(name);
      const emailRaw=emails.split(';').find(e=>e.toLowerCase().includes(name.split(' ')[0].toLowerCase()))||emails.split(';')[0]||'';
      const email=(emailRaw.includes(':')?emailRaw.split(':')[1]:emailRaw).trim().split(',')[0].trim();
      const phoneRaw=phones.split(';')[0]||'';const phone=(phoneRaw.includes(':')?phoneRaw.split(':')[1]:phoneRaw).trim().split(',')[0].trim();
      const sheetData={status,likelihood,expectedAmount:idx===0?expected:null,tag,email,phone,firm:r['Organization']||'',notes:[notes,lastUpdate].filter(Boolean).join('\n').trim()};
      const ex=existing.find(c=>c.type==='LP'&&c.name.toLowerCase()===name.toLowerCase());
      if(ex){const merged={...ex,...sheetData};LP_PORTAL_FIELDS.forEach(f=>{merged[f]=ex[f]||'';});if(!ex.nextStep&&latestTask)merged.nextStep=latestTask;incoming.push(merged);}
      else{incoming.push({id:`lp-${Date.now()}-${Math.random()}`,type:'LP',name,title:'',linkedinUrl:'',bio:'',relationship:positions.split(';')[0]?.trim()||'',whatTheyCareAbout:'',howWeKnowThem:tag||'',nextStep:latestTask,priority:'Medium',...sheetData});}
    });
  });
  const importedNames=new Set(incoming.map(c=>c.name.toLowerCase()));
  return[...incoming,...existing.filter(c=>c.type==='LP'&&!importedNames.has(c.name.toLowerCase()))];
}
function mergeLenders(rows,existing){
  const incoming=rows.filter(r=>r['Contact']||r['Firm']).map(r=>{
    const name=r['Contact']||'';const ex=existing.find(c=>c.type==='Lender'&&c.name.toLowerCase()===name.toLowerCase());
    const emailPhone=r['Email_Phone']||'';
    const sheetData={name,firm:r['Firm']||'',status:mapLenderStatus(r['Stage']||r['Status']||''),projectedLoanAmount:parseFloat((r['Amount_Terms']||'').replace(/[$,]/g,''))||'',loanType:'Construction-to-perm',notes:r['Notes']||'',email:emailPhone.includes('@')?emailPhone.split(';')[0].trim():'',phone:!emailPhone.includes('@')?emailPhone.split(';')[0].trim():''};
    if(ex){const merged={...ex,...sheetData};LN_PORTAL_FIELDS.forEach(f=>{merged[f]=ex[f]||'';});if(!ex.nextStep&&r['Next_Step'])merged.nextStep=r['Next_Step'];return merged;}
    return{id:`ln-${Date.now()}-${Math.random()}`,type:'Lender',title:'',linkedinUrl:r['Link']||'',priority:'Medium',bio:'',dealsDone:'',minLoanSize:'',maxLoanSize:'',ltcAppetite:'',geographies:'',nextStep:r['Next_Step']||'',...sheetData};
  });
  const importedNames=new Set(incoming.map(c=>c.name.toLowerCase()));
  return[...incoming,...existing.filter(c=>c.type==='Lender'&&!importedNames.has(c.name.toLowerCase()))];
}
function mergeTasks(rows,existing){
  const incoming=rows.filter(r=>r['Title']&&r['Title'].trim()).map((r,i)=>{
    const rawId=r['Task_ID']&&r['Task_ID'].trim()?r['Task_ID'].trim():null;
    const due=normalizeDate(r['Due_Date_Parsed']||r['Due_Date']||'');
    const ex=rawId?existing.find(t=>String(t.id)===rawId):existing.find(t=>t.title&&t.title.trim().toLowerCase()===r['Title'].trim().toLowerCase());
    const sheetData={id:rawId||ex?.id||`task-${Date.now()}-${i}`,title:r['Title'].trim(),workstream:r['Workstream']||'',owner:r['Owner']||'Jimmy',due,priority:mapPriority(r['Priority'])};
    if(ex)return{...ex,...sheetData,status:normalizeStatus(ex.status)!=='Not Started'?ex.status:mapTaskStatus(r['Status']||''),notes:ex.notes&&ex.notes!==r['Notes']?ex.notes:(r['Notes']||ex.notes||'')};
    return{...sheetData,status:mapTaskStatus(r['Status']||''),notes:r['Notes']||''};
  });
  const importedIds=new Set(incoming.map(t=>String(t.id)));
  return[...incoming,...existing.filter(t=>!importedIds.has(String(t.id)))];
}
function mergeMilestones(rows,existing,override){
  if(!override)return existing;
  const phaseMap={'entitlement':'Initiation','design':'Planning','budget':'Planning','permit':'Execution','construction':'Execution','fundrais':'Execution','break ground':'Execution','marketing':'Go Live','opening':'Go Live','punch':'Go Live','ff&e':'Go Live'};
  return rows.filter(r=>r['Milestone']).map((r,i)=>{
    const label=r['Milestone']||'';const phase=Object.entries(phaseMap).find(([k])=>label.toLowerCase().includes(k))?.[1]||'Execution';
    const ex=existing.find(m=>m.label.toLowerCase()===label.toLowerCase());
    const target=r['Target_Date']||'';
    const start=ex?.start||(target?new Date(new Date(target).getTime()-90*24*60*60*1000).toISOString().split('T')[0]:'2026-01-01');
    return{id:ex?.id||r['Milestone_ID']||String(i+1),label,phase:ex?.phase||phase,start,end:target||ex?.end||'2027-01-01'};
  });
}

// ── Import UI ──────────────────────────────────────────────────────────────
function Import({contacts,setContacts,tasks,setTasks,miles,setMiles,onSave}){
  const [jsText,setJsText]=useState('');
  const [lenderText,setLenderText]=useState('');
  const [taskText,setTaskText]=useState('');
  const [mileText,setMileText]=useState('');
  const [overrideMiles,setOverrideMiles]=useState(false);
  const [results,setResults]=useState(null);
  const [running,setRunning]=useState(false);

  async function runImport(){
    setRunning(true);
    const log=[];
    try{
      let newContacts=[...contacts];
      if(jsText.trim()){
        const lps=mergeJSProspects(parseCSV(jsText),contacts);
        newContacts=[...lps,...newContacts.filter(c=>c.type==='Lender')];
        await onSave("contacts",lps);
        log.push(`✓ ${lps.length} LP prospects merged from Juniper Square`);
      }
      if(lenderText.trim()){
        const lenders=mergeLenders(parseCSV(lenderText),newContacts);
        newContacts=[...newContacts.filter(c=>c.type==='LP'),...lenders];
        await onSave("contacts",lenders);
        log.push(`✓ ${lenders.length} lenders merged`);
      }
      if(jsText.trim()||lenderText.trim()){
        setContacts(newContacts);
        log.push('  → Bios, notes & next steps you added manually were preserved');
      }
      if(taskText.trim()){
        const merged=mergeTasks(parseCSV(taskText),tasks);
        await onSave("tasks",merged);
        setTasks(merged);
        log.push(`✓ ${merged.length} tasks merged — your status updates preserved`);
      }
      if(mileText.trim()){
        const merged=mergeMilestones(parseCSV(mileText),miles,overrideMiles);
        await onSave("milestones",merged);
        setMiles(merged);
        log.push(overrideMiles?`✓ ${merged.length} milestones updated from sheet`:`✓ Milestones refreshed — your manual date edits preserved`);
      }
      if(log.length===0)log.push('Nothing imported — paste at least one export above.');
    }catch(e){log.push(`✗ Error: ${e.message}`);}
    setResults(log);
    setRunning(false);
  }

  const box={width:'100%',minHeight:90,fontSize:12,fontFamily:'monospace',border:`1px solid ${B.steel}`,borderRadius:4,padding:'8px 10px',color:B.navy,resize:'vertical',boxSizing:'border-box'};
  return(
    <div style={{padding:'1.25rem 0',maxWidth:700}}>
      <div style={{background:'#e8f0f7',borderRadius:8,padding:'12px 16px',marginBottom:'1.5rem'}}>
        <div style={{fontSize:12,color:B.navy,lineHeight:1.8}}>
          <strong>How to export:</strong> Juniper Square → Prospects tab → Export. Google Sheets → File → Download → Tab-separated values (.tsv).<br/>
          <strong>Merge rules:</strong> Sheet updates status, amounts & contact info. Portal keeps your bios, notes & next steps.
        </div>
      </div>
      {[['Juniper Square — LP Prospects',jsText,setJsText],['Lender tracker — Google Sheet',lenderText,setLenderText],['Tasks — Google Sheet',taskText,setTaskText],['Milestones — Google Sheet',mileText,setMileText]].map(([label,val,setter])=>(
        <div key={label} style={{marginBottom:'1.25rem'}}>
          <label style={{fontSize:11,color:B.muted,display:'block',marginBottom:6,letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:600}}>{label}</label>
          <textarea value={val} onChange={e=>setter(e.target.value)} placeholder="Paste exported data here — include the header row" style={box}/>
          {label.includes('Milestone')&&val.trim()&&(
            <label style={{display:'flex',alignItems:'center',gap:8,marginTop:6,fontSize:12,color:B.muted,cursor:'pointer'}}>
              <input type="checkbox" checked={overrideMiles} onChange={e=>setOverrideMiles(e.target.checked)}/>
              Also update milestone dates from sheet (overrides manual edits in Timeline tab)
            </label>
          )}
        </div>
      ))}
      <button onClick={runImport} style={{...btn(),fontSize:13,padding:'10px 24px'}} disabled={running}>{running?"Importing…":"Run import"}</button>
      {results&&(
        <div style={{marginTop:'1rem',background:B.navy,borderRadius:8,padding:'1rem 1.25rem'}}>
          {results.map((r,i)=><div key={i} style={{fontSize:13,color:B.white,marginBottom:4,lineHeight:1.6}}>{r}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────
export default function App(){
  const [nav,setNav]=useState("Dashboard");
  const [contacts,setContacts]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [miles,setMiles]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [loadError,setLoadError]=useState(null);
  const [syncing,setSyncing]=useState(false);

  // ── Seed Supabase if tables are empty ──────────────────────────────────
  async function seedIfEmpty(contactRows, taskRows, mileRows) {
    const promises = [];
    if (contactRows.length === 0) {
      promises.push(sbUpsert("contacts", DEFAULT_CONTACTS.map(contactToRow)));
    }
    if (taskRows.length === 0) {
      promises.push(sbUpsert("tasks", DEFAULT_TASKS.map(taskToRow)));
    }
    if (mileRows.length === 0) {
      promises.push(sbUpsert("milestones", DEFAULT_MILES.map(mileToRow)));
    }
    await Promise.all(promises);
  }

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(()=>{
    async function load(){
      try{
        const [cRows, tRows, mRows] = await Promise.all([
          sbFetch("contacts"),
          sbFetch("tasks"),
          sbFetch("milestones"),
        ]);
        // Seed on first run
        if(cRows.length===0||tRows.length===0||mRows.length===0){
          await seedIfEmpty(cRows, tRows, mRows);
          const [c2, t2, m2] = await Promise.all([sbFetch("contacts"), sbFetch("tasks"), sbFetch("milestones")]);
          setContacts(c2.map(rowToContact));
          setTasks(t2.map(rowToTask));
          setMiles(m2.map(rowToMile));
        } else {
          setContacts(cRows.map(rowToContact));
          setTasks(tRows.map(rowToTask));
          setMiles(mRows.map(rowToMile));
        }
        setLoaded(true);
      }catch(e){
        console.error("Load error:",e);
        setLoadError(e.message);
        // Fall back to seed data so the app still works
        setContacts(DEFAULT_CONTACTS);
        setTasks(DEFAULT_TASKS);
        setMiles(DEFAULT_MILES);
        setLoaded(true);
      }
    }
    load();
  },[]);

  // ── Save helper (upsert one or many rows) ─────────────────────────────
  const handleSave = useCallback(async (table, items) => {
    setSyncing(true);
    try {
      let rows;
      if (table === "contacts") rows = items.map(contactToRow);
      else if (table === "tasks") rows = items.map(taskToRow);
      else if (table === "milestones") rows = items.map(mileToRow);
      else throw new Error(`Unknown table: ${table}`);
      await sbUpsert(table, rows);
    } catch (e) {
      console.error("Save error:", e);
      alert(`Save failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }, []);

  // ── Delete helper ─────────────────────────────────────────────────────
  const handleDelete = useCallback(async (table, id) => {
    setSyncing(true);
    try {
      await sbDelete(table, String(id));
    } catch (e) {
      console.error("Delete error:", e);
      alert(`Delete failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }, []);

  const TABS=["Dashboard","CRM","Timeline","Tasks","Import"];

  if(!loaded)return(
    <div style={{fontFamily:FONT,padding:"3rem",color:B.muted,textAlign:"center",fontSize:14}}>
      <div style={{marginBottom:8}}>Connecting to database…</div>
      <div style={{fontSize:12,color:B.steel}}>bhwfnogroaxttmtvulft.supabase.co</div>
    </div>
  );

  return(<div style={{fontFamily:FONT,background:B.offwhite,minHeight:"100vh"}}>
    <div style={{background:B.navy,padding:"0 2rem",display:"flex",alignItems:"center",gap:0}}>
      <div style={{marginRight:32,paddingRight:32,borderRight:"1px solid rgba(255,255,255,0.15)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:"0.1em",textTransform:"uppercase"}}>The Neighborhood Hotel</div>
        <div style={{fontSize:14,fontWeight:700,color:B.white,letterSpacing:"0.06em",textTransform:"uppercase"}}>115 N Barton</div>
      </div>
      {TABS.map(t=>(<button key={t} onClick={()=>setNav(t)} style={{background:"none",border:"none",borderBottom:nav===t?"2px solid #ccd5de":"2px solid transparent",color:nav===t?B.white:"rgba(255,255,255,0.55)",fontSize:11,fontWeight:nav===t?700:400,letterSpacing:"0.07em",textTransform:"uppercase",padding:"1rem 1.25rem",cursor:"pointer",fontFamily:FONT,marginBottom:-1}}>{t}</button>))}
      <div style={{flex:1}}/>
      {syncing&&<div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:"0.05em"}}>Saving…</div>}
      {loadError&&<div style={{fontSize:11,color:B.gold,letterSpacing:"0.05em"}} title={loadError}>⚠ Offline mode</div>}
    </div>
    <div style={{maxWidth:980,margin:"0 auto",padding:"0 1.5rem 3rem"}}>
      {nav==="Dashboard"&&<Dashboard contacts={contacts} tasks={tasks} miles={miles}/>}
      {nav==="CRM"&&<CRM contacts={contacts} setContacts={setContacts} onSave={handleSave} onDelete={handleDelete}/>}
      {nav==="Timeline"&&<Timeline miles={miles} setMiles={setMiles} onSave={handleSave}/>}
      {nav==="Tasks"&&<Tasks tasks={tasks} setTasks={setTasks} onSave={handleSave} onDelete={handleDelete}/>}
      {nav==="Import"&&<Import contacts={contacts} setContacts={setContacts} tasks={tasks} setTasks={setTasks} miles={miles} setMiles={setMiles} onSave={handleSave}/>}
    </div>
  </div>);
}
