import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { DEFAULT_CONTACTS, DEFAULT_MILES, DEFAULT_TASKS, VE_ITEMS, LESSONS_SEED } from "./data";

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
    likelihood: null, // kept for DB compat; string value stored in _extra

    tag: c.tag || "",
    bio: c.bio || "",
    prior_deal_history: c.relationship || "",
    relationship_notes: c.howWeKnowThem || "",
    what_they_care_about: c.whatTheyCareAbout || "",
    next_step: c.nextStep || "",
    notes: c.notes || "",
    updated_at: new Date().toISOString(),
    created_at: c.createdAt || new Date().toISOString(),
    _extra: JSON.stringify({
      firm: c.firm || "",
      title: c.title || "",
      linkedinUrl: c.linkedinUrl || "",
      howWeKnowThem: c.howWeKnowThem || "",
      whatTheyCareAbout: c.whatTheyCareAbout || "",
      relationship: c.relationship || "",
      projectedLoanAmount: c.projectedLoanAmount || "",
      loanType: c.loanType || "",
      dealsDone: c.dealsDone || "",
      minLoanSize: c.minLoanSize || "",
      maxLoanSize: c.maxLoanSize || "",
      ltcAppetite: c.ltcAppetite || "",
      geographies: c.geographies || "",
      importBatch: c.importBatch || "",
      likelihood: c.likelihood || "",
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
    likelihood: extra.likelihood || r.likelihood || "",
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
    createdAt: r.created_at || "",
    importBatch: extra.importBatch || "",
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
    notes: m.notes || "",
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
    notes: r.notes || "",
  };
}

// ── ADDED: Risk row mappers ────────────────────────────────────────────────
function riskToRow(r) {
  return {
    id: String(r.id),
    category: r.category || "Market",
    description: r.description || "",
    likelihood: r.likelihood || "Medium",
    impact: r.impact || "Medium",
    mitigation: r.mitigation || "",
    owner: r.owner || "Jimmy",
    status: r.status || "Open",
    updated_at: new Date().toISOString(),
  };
}

function rowToRisk(r) {
  return {
    id: r.id,
    category: r.category || "Market",
    description: r.description || "",
    likelihood: r.likelihood || "Medium",
    impact: r.impact || "Medium",
    mitigation: r.mitigation || "",
    owner: r.owner || "Jimmy",
    status: r.status || "Open",
  };
}

// ── Hardcoded LP seed data (from Juniper Square + DocSend exports) ─────────
const SEED_LPS = [
  // Committed — Co-GP
  {id:"lp-js-5066035-0",type:"LP",name:"Michael Hobbs",tag:"Co-GP",likelihood:"High",expectedAmount:257260,status:"Committed",priority:"Medium",firm:"",email:"mikehobbs1919@gmail.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"NB Expansion General Partner Fund LLC, 18 W Merchant",whatTheyCareAbout:"",howWeKnowThem:"Co-GP",nextStep:"",notes:""},
  {id:"lp-js-5066034-0",type:"LP",name:"Kevin Werner",tag:"Co-GP",likelihood:"High",expectedAmount:257260,status:"Committed",priority:"Medium",firm:"Renovo Financial",email:"kevin@renovofinancial.com",phone:"(312) 543-1379",title:"",linkedinUrl:"",bio:"",relationship:"NB Expansion General Partner Fund LLC, 19400 Ravine, 18 W Merchant",whatTheyCareAbout:"",howWeKnowThem:"Co-GP",nextStep:"",notes:""},
  {id:"lp-js-5066033-0",type:"LP",name:"Jay Weaver",tag:"Co-GP",likelihood:"High",expectedAmount:128630,status:"Committed",priority:"Medium",firm:"Quartz Lake Capital",email:"weaver@quartzlakecap.com",phone:"(312) 925-0792",title:"",linkedinUrl:"",bio:"",relationship:"NB Expansion General Partner Fund LLC",whatTheyCareAbout:"",howWeKnowThem:"Co-GP",nextStep:"",notes:""},
  {id:"lp-js-5065902-0",type:"LP",name:"Jimmy Georgantas",tag:"Co-GP",likelihood:"High",expectedAmount:13126,status:"Committed",priority:"Medium",firm:"NBHD Hotels",email:"jimmy@nbhdhotels.com",phone:"(815) 302-7392",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"Co-GP",nextStep:"",notes:""},
  // Juniper Square — 18 W Investors
  {id:"lp-js-6236327-0",type:"LP",name:"Anthony Disano",tag:"18 W Investor",likelihood:"High",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236328-0",type:"LP",name:"Jonathan Gordon",tag:"18 W Investor",likelihood:"High",expectedAmount:25000,status:"Data room accessed",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236328-1",type:"LP",name:"Dana Gordon",tag:"18 W Investor",likelihood:"High",expectedAmount:null,status:"Data room accessed",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236329-0",type:"LP",name:"Daniel Rosen",tag:"18 W Investor",likelihood:"High",expectedAmount:25000,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236331-0",type:"LP",name:"Jack Krasaeath",tag:"18 W Investor",likelihood:"High",expectedAmount:25000,status:"Data room accessed",priority:"Medium",firm:"",email:"jack.krasaeath@diverseyrealestate.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236332-0",type:"LP",name:"Ian Murphy",tag:"18 W Investor",likelihood:"High",expectedAmount:25000,status:"Deck sent",priority:"Medium",firm:"",email:"ian.murphy@cbre.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236337-0",type:"LP",name:"Robert Rothschild",tag:"18 W Investor",likelihood:"High",expectedAmount:25000,status:"Data room accessed",priority:"Medium",firm:"",email:"rob@rothschildagency.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236338-0",type:"LP",name:"Roger Schoenfeld",tag:"18 W Investor",likelihood:"High",expectedAmount:50000,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236342-0",type:"LP",name:"Thomas Bohac",tag:"18 W Investor",likelihood:"High",expectedAmount:50000,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236336-0",type:"LP",name:"Allen Samuel",tag:"18 W Investor",likelihood:"Low",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236339-0",type:"LP",name:"Shoshana Vernick",tag:"18 W Investor",likelihood:"Low",expectedAmount:100000,status:"Data room accessed",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236339-1",type:"LP",name:"Kevin Vernick",tag:"18 W Investor",likelihood:"Low",expectedAmount:null,status:"Data room accessed",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236341-0",type:"LP",name:"Lisa Zhao",tag:"18 W Investor",likelihood:"Low",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236343-0",type:"LP",name:"Eric Augustyn",tag:"18 W Investor",likelihood:"Low",expectedAmount:25000,status:"Data room accessed",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236330-0",type:"LP",name:"Dean Lurie",tag:"18 W Investor",likelihood:"Low",expectedAmount:25000,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236333-0",type:"LP",name:"Jerry J. Jaeger",tag:"18 W Investor",likelihood:"Low",expectedAmount:50000,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236333-1",type:"LP",name:"Ann Jaeger",tag:"18 W Investor",likelihood:"Low",expectedAmount:null,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236333-2",type:"LP",name:"Scott Levenfeld",tag:"18 W Investor",likelihood:"Low",expectedAmount:null,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236334-0",type:"LP",name:"Joe Sauer",tag:"18 W Investor",likelihood:"Low",expectedAmount:25000,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236334-1",type:"LP",name:"Leslie Sauer",tag:"18 W Investor",likelihood:"Low",expectedAmount:null,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236335-0",type:"LP",name:"Jonathan Metzl",tag:"18 W Investor",likelihood:"Low",expectedAmount:50000,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236340-0",type:"LP",name:"Steven B. Nasatir",tag:"18 W Investor",likelihood:"Low",expectedAmount:25000,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  {id:"lp-js-6236340-1",type:"LP",name:"Brandon Nasatir",tag:"18 W Investor",likelihood:"Low",expectedAmount:null,status:"Deck sent",priority:"Medium",firm:"",email:"",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"18 W Investor",nextStep:"",notes:""},
  // DocSend — LP Deck viewers
  {id:"lp-ds-001",type:"LP",name:"Ian Braverman",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"Harrison Street",email:"ibraverman@harrisonst.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-002",type:"LP",name:"Ryan Grommes",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Deck sent",priority:"Medium",firm:"RLE Partners",email:"rgrommes@rlepartners.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-003",type:"LP",name:"Dominic Sergi",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"West Shore CG",email:"ds@westshorecg.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-004",type:"LP",name:"Daniel Arnstein",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"",email:"djarnstein@gmail.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-005",type:"LP",name:"Robert Becker",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Deck sent",priority:"Medium",firm:"",email:"rhbecker7@gmail.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-006",type:"LP",name:"Liz Roch",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"",email:"lizroch1@gmail.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-008",type:"LP",name:"Mason Phelps",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"",email:"mason1741@gmail.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-009",type:"LP",name:"Dan Drex",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"",email:"dandrex@me.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-011",type:"LP",name:"Tony Olson",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"Webster CM",email:"tolson@webstercm.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-012",type:"LP",name:"Lauren Mead",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"",email:"laurenmead15@gmail.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-013",type:"LP",name:"Joydeep Dasmunshi",tag:"DocSend",likelihood:"Medium",expectedAmount:50000,status:"Data room accessed",priority:"Medium",firm:"",email:"joydeepdm@gmail.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-014",type:"LP",name:"Michael Glicken",tag:"DocSend",likelihood:"Low",expectedAmount:25000,status:"Deck sent",priority:"Medium",firm:"Morgan Stanley",email:"michael.glicken@ms.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-015",type:"LP",name:"Derrick Watts",tag:"DocSend",likelihood:"Low",expectedAmount:25000,status:"Deck sent",priority:"Medium",firm:"Derrick Watts Advisory",email:"derrick@derrickwattsadvisory.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:"lp-ds-016",type:"LP",name:"John Gavin",tag:"DocSend",likelihood:"Low",expectedAmount:50000,status:"Deck sent",priority:"Medium",firm:"",email:"jpgavin23@gmail.com",phone:"",title:"",linkedinUrl:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
];
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

// ── Responsive helpers ─────────────────────────────────────────────────────
function useIsMobile(){ 
  const [mobile,setMobile]=useState(()=>window.innerWidth<768);
  useEffect(()=>{
    const h=()=>setMobile(window.innerWidth<768);
    window.addEventListener('resize',h);
    return()=>window.removeEventListener('resize',h);
  },[]);
  return mobile;
}
// Responsive grid: 4-col → 2-col on mobile, 2-col → 1-col on mobile
const g4=(mobile)=>({display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,minmax(0,1fr))",gap:10,marginBottom:"1.25rem"});
const g2=(mobile)=>({display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:mobile?"0.75rem":"1rem",marginBottom:"1rem"});
const g3=(mobile)=>({display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)",gap:10});
function MultiFilter({label, options, selected, onChange, colorMap}){
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === 0 || selected.length === options.length;
  const displayLabel = allSelected ? label : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  return(
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{...iS, width:"auto", display:"flex", alignItems:"center", gap:6, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap"}}>
        <span style={{fontSize:13}}>{displayLabel}</span>
        <span style={{fontSize:10, color:B.muted}}>{open?"▲":"▼"}</span>
      </button>
      {open&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:200,background:B.white,border:`1px solid ${B.steel}`,borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",minWidth:180,padding:"6px 0"}}>
        <div onClick={()=>{onChange([]);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",cursor:"pointer",fontSize:13,color:B.muted,borderBottom:`1px solid ${B.light}`}}>
          <span style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${B.steel}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:allSelected?B.navy:"transparent"}}>
            {allSelected&&<span style={{color:B.white,fontSize:9,lineHeight:1}}>✓</span>}
          </span>
          All
        </div>
        {options.map(opt=>{
          const checked = selected.includes(opt);
          const col = colorMap?.[opt];
          return(
            <div key={opt} onClick={()=>{
              const next = checked ? selected.filter(s=>s!==opt) : [...selected, opt];
              onChange(next.length===options.length?[]:next);
            }} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",cursor:"pointer",fontSize:13,color:B.navy}}>
              <span style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${checked?(col||B.navy):B.steel}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:checked?(col||B.navy):"transparent"}}>
                {checked&&<span style={{color:B.white,fontSize:9,lineHeight:1}}>✓</span>}
              </span>
              {col&&<span style={{width:7,height:7,borderRadius:"50%",background:col,flexShrink:0}}/>}
              {opt}
            </div>
          );
        })}
      </div>}
      {open&&<div style={{position:"fixed",inset:0,zIndex:199}} onClick={()=>setOpen(false)}/>}
    </div>
  );
}
// ── Equity raise constants — single source of truth ──────────────────────
const LP_EQUITY_TARGET = 2500000;    // Total LP equity target
const LP_EQUITY_COMMITTED = 2156276; // Committed to date — updated June 2 2026
const LP_EQUITY_REMAINING = LP_EQUITY_TARGET - LP_EQUITY_COMMITTED; // $343,724

function Dashboard({contacts,tasks,miles,setNav}){
  const mobile=useIsMobile();
  const lps=contacts.filter(c=>c.type==="LP");
  const lenders=contacts.filter(c=>c.type==="Lender");
  const committed=lps.filter(c=>c.status==="Committed").reduce((s,c)=>s+(Number(c.expectedAmount)||0),0);
  const activeLenders=lenders.filter(c=>!["Not contacted","Passed"].includes(c.status)).length;
  const highTasks=tasks.filter(t=>t.priority==="High"&&normalizeStatus(t.status)!=="Complete").length;
  const urgT=tasks.filter(t=>t.priority==="High"&&normalizeStatus(t.status)!=="Complete").slice(0,4);
  const wLPs=lps.filter(c=>["Data room accessed","In conversation","Soft commit","Committed"].includes(c.status)).slice(0,6);
  const remaining=Math.max(0,LP_EQUITY_TARGET-committed);
  return(
    <div style={{padding:"1.25rem 0"}}>
      <div style={g4(mobile)}>
        {[["LP equity target",fmt$(LP_EQUITY_TARGET),B.navy],["Committed capital",fmt$(committed),"#2a6b3f"],["Remaining to raise",fmt$(remaining),committed>=LP_EQUITY_TARGET?"#2a6b3f":B.danger],["Active lenders",activeLenders,B.sage]].map(([l,v,c])=>(
          <div key={l} style={SC(c)}><div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div><div style={{fontSize:mobile?18:24,fontWeight:700,color:B.white}}>{v}</div></div>
        ))}
      </div>
      <div style={g2(mobile)}>
        <div style={card}>
          <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>Construction schedule <span style={{marginLeft:8,fontSize:11,color:B.blue,fontWeight:400,cursor:"pointer",textTransform:"none",letterSpacing:0}} onClick={()=>setNav("Timeline")}>View timeline →</span></div>
          {(()=>{
            const total=wdBetween(CONSTRUCTION_START,SC_CURRENT)+1, done=Math.min(total,wdBetween(CONSTRUCTION_START,SCHED_TODAY));
            const look=schedLookahead(14,true).slice(0,6);
            return(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:700,color:B.navy}}>Substantial Completion {fmtD(SC_CURRENT)}</span>
                {SC_SLIP>0&&<span style={{fontSize:11,color:B.danger,fontWeight:600}}>+{SC_SLIP} workdays vs {fmtD(SC_BASE)}</span>}
              </div>
              <div style={{height:6,background:B.light,borderRadius:3,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${done/total*100}%`,background:B.blue,borderRadius:3}}/></div>
              <div style={{fontSize:10,color:B.muted,marginBottom:10}}>{Math.round(done/total*100)}% of construction workdays elapsed</div>
              <div style={{fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Next 2 weeks</div>
              {look.map((t,i)=>(
                <div key={t.group+t.name+i} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11,padding:"4px 0",borderBottom:`1px solid ${B.light}`}}>
                  <span style={{color:B.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.owner&&<span style={{color:B.gold}}>● </span>}{t.name}</span>
                  <span style={{color:t.changed?B.danger:B.muted,whiteSpace:"nowrap"}}>{fmtD(t.cS)} – {fmtD(t.cF)}</span>
                </div>
              ))}
            </>);
          })()}
        </div>
        <div style={card}>
          <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>High-priority tasks <span style={{marginLeft:8,background:B.danger+"20",color:B.danger,padding:"1px 6px",borderRadius:3,fontSize:10}}>{highTasks} open</span></div>
          {urgT.length===0&&<div style={{fontSize:13,color:B.muted}}>All caught up.</div>}
          {urgT.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${B.light}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:B.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:B.white,fontWeight:700,flexShrink:0}}>{(t.owner||"?")[0]}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:B.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div><div style={{fontSize:11,color:B.muted,marginTop:1}}>{t.owner} · Due {t.due||"TBD"}</div></div>
              {!mobile&&<Badge label={normalizeStatus(t.status)} color={normalizeStatus(t.status)==="In Progress"?B.blue:normalizeStatus(t.status)==="Overdue"?B.danger:B.muted}/>}
            </div>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>
          Warm LP pipeline <span style={{marginLeft:8,fontSize:11,color:B.blue,fontWeight:400,cursor:"pointer",textTransform:"none",letterSpacing:0}} onClick={()=>setNav("CRM")}>View all →</span>
        </div>
        {wLPs.length===0?<div style={{fontSize:13,color:B.muted}}>No warm prospects yet.</div>:
          <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
            {wLPs.map(c=>(
              <div key={c.id} onClick={()=>setNav("CRM")} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${B.light}`,cursor:"pointer"}}>
                <Avatar name={c.name} color={B.navy}/>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:B.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:11,color:B.muted}}>{c.firm||c.tag||""}</div></div>
                {!mobile&&<div style={{fontSize:13,color:B.navy,fontWeight:600}}>{fmt$(c.expectedAmount)}</div>}
                <div style={{display:"flex",alignItems:"center",fontSize:11,color:statCol(c.status)}}><Pip color={statCol(c.status)}/>{mobile?c.status.split(" ")[0]:c.status}</div>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}

// ── CRM ────────────────────────────────────────────────────────────────────
const ELP={id:null,type:"LP",name:"",firm:"",title:"",email:"",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:"Medium",expectedAmount:"",tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""};
const ELN={id:null,type:"Lender",name:"",firm:"",title:"",email:"",phone:"",linkedinUrl:"",status:"Not contacted",priority:"Medium",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"",notes:""};
const LP_LIKELIHOOD=["High","Medium","Low"];
const likelihoodColor={"High":"#2a6b3f","Medium":B.gold,"Low":B.danger};
const likelihoodPct={"High":80,"Medium":40,"Low":10};

function LPPipeline({lps,onSelectLikelihood,likelihoodFilter,onOpenDetail}){
  const mobile=useIsMobile();
  const target=LP_EQUITY_TARGET;
  const committed=lps.filter(c=>c.status==="Committed").reduce((s,c)=>s+(Number(c.expectedAmount)||0),0);
  const remaining=Math.max(0,target-committed);
  const pct=Math.min(100,Math.round(committed/target*100));
  const tiers=["High","Medium","Low"].map(tier=>{
    const members=lps.filter(c=>c.likelihood===tier&&c.status!=="Committed"&&c.status!=="Passed");
    const total=members.reduce((s,c)=>s+(Number(c.expectedAmount)||0),0);
    return{tier,members,total,count:members.length};
  });
  const highTotal=tiers.find(t=>t.tier==="High")?.total||0;
  const ifHighCommit=committed+highTotal;
  const afterHigh=Math.max(0,target-ifHighCommit);
  return(
    <div style={{marginBottom:"1.25rem"}}>
      <div style={{...card,marginBottom:10,padding:"14px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:11,fontWeight:600,color:B.muted,letterSpacing:"0.07em",textTransform:"uppercase"}}>Equity raise progress</div>
          <div style={{display:"flex",gap:mobile?12:20,flexWrap:"wrap"}}>
            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:B.muted,letterSpacing:"0.05em",textTransform:"uppercase"}}>Committed</div><div style={{fontSize:mobile?14:16,fontWeight:700,color:"#2a6b3f"}}>{fmt$(committed)}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:B.muted,letterSpacing:"0.05em",textTransform:"uppercase"}}>Target</div><div style={{fontSize:mobile?14:16,fontWeight:700,color:B.navy}}>{fmt$(target)}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:B.muted,letterSpacing:"0.05em",textTransform:"uppercase"}}>Remaining</div><div style={{fontSize:mobile?14:16,fontWeight:700,color:remaining===0?"#2a6b3f":B.danger}}>{fmt$(remaining)}</div></div>
          </div>
        </div>
        <div style={{height:10,background:B.light,borderRadius:5,overflow:"hidden",marginBottom:6}}>
          <div style={{height:"100%",width:`${pct}%`,background:"#2a6b3f",borderRadius:5,transition:"width 0.4s ease"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.muted,flexWrap:"wrap",gap:4}}>
          <span>{pct}% raised</span>
          {afterHigh<target&&<span style={{color:"#2a6b3f"}}>If all High commit → {fmt$(ifHighCommit)} raised ({fmt$(afterHigh)} still needed)</span>}
          {afterHigh>=target&&<span style={{color:"#2a6b3f"}}>✓ High-likelihood pipeline covers full target</span>}
        </div>
      </div>
      <div style={g3(mobile)}>
        {tiers.map(({tier,members,total,count})=>{
          const col=likelihoodColor[tier];
          const active=Array.isArray(likelihoodFilter)?likelihoodFilter.includes(tier):likelihoodFilter===tier;
          return(
            <div key={tier} onClick={()=>onSelectLikelihood(active?"All":tier)}
              style={{background:active?col:B.white,border:`2px solid ${active?col:B.steel}`,borderRadius:8,padding:"12px 16px",cursor:"pointer",transition:"all 0.15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:active?B.white:col}}>{tier} likelihood</span>
                <span style={{fontSize:11,fontWeight:600,color:active?"rgba(255,255,255,0.7)":B.muted}}>{count} prospects</span>
              </div>
              <div style={{fontSize:mobile?18:22,fontWeight:700,color:active?B.white:B.navy,marginBottom:2}}>{fmt$(total)}</div>
              {!mobile&&<div style={{fontSize:11,color:active?"rgba(255,255,255,0.65)":B.muted}}>If all commit → {fmt$(committed+total)} total · {fmt$(Math.max(0,target-committed-total))} left</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CRM({contacts,setContacts,onSave,onDelete}){
  const mobile=useIsMobile();
  const [tab,setTab]=useState("LP");
  const [sf,setSf]=useState([]); // status filter — empty = all
  const [lf,setLf]=useState([]); // likelihood filter
  const [tf,setTf]=useState([]); // tag filter
  const [q,setQ]=useState("");
  const [view,setView]=useState("list");
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState(ELP);
  const [saving,setSaving]=useState(false);
  const sts=tab==="LP"?LP_STATUSES:LN_STATUSES;
  const tags=["All",...Array.from(new Set(contacts.filter(c=>c.type==="LP"&&c.tag).map(c=>c.tag))).sort()];
  const lps=contacts.filter(c=>c.type==="LP");
  const lnds=contacts.filter(c=>c.type==="Lender");
  const vis=contacts.filter(c=>{
    if(c.type!==tab)return false;
    if(sf.length>0&&!sf.includes(c.status))return false;
    if(tab==="LP"&&lf.length>0&&!lf.includes(c.likelihood))return false;
    if(tab==="LP"&&tf.length>0&&!tf.includes(c.tag))return false;
    if(q&&!`${c.name} ${c.firm} ${c.email} ${c.tag||""}`.toLowerCase().includes(q.toLowerCase()))return false;
    return true;
  });
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
    const fi=(field,type="text")=><input type={type} value={form[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} style={iS}/>;
    const fs=(field,opts)=><select value={form[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} style={iS}>{opts.map(o=><option key={o}>{o}</option>)}</select>;
    return(<div style={{padding:"1rem 0"}}>
      <div style={{display:"flex",gap:8,marginBottom:"1rem"}}><button onClick={()=>setView(sel?"detail":"list")} style={btn(true)}>Cancel</button></div>
      <div style={card}>
        <h3 style={{margin:"0 0 1rem",fontSize:15,fontWeight:700,color:B.navy,letterSpacing:"0.04em",textTransform:"uppercase"}}>{contacts.find(c=>c.id===form.id)?"Edit":"New"} {form.type}</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 16px"}}>
          <div><label style={lS}>Name</label>{fi("name")}</div>
          <div><label style={lS}>Firm</label>{fi("firm")}</div>
          <div><label style={lS}>Title</label>{fi("title")}</div>
          <div><label style={lS}>Email</label>{fi("email","email")}</div>
          <div><label style={lS}>Phone</label>{fi("phone","tel")}</div>
          <div><label style={lS}>LinkedIn URL</label>{fi("linkedinUrl","url")}</div>
          <div><label style={lS}>Status</label>{fs("status",form.type==="LP"?LP_STATUSES:LN_STATUSES)}</div>
          <div><label style={lS}>Priority</label>{fs("priority",PRIORITIES)}</div>
          {form.type==="LP"&&<>
            <div><label style={lS}>Expected ($)</label>{fi("expectedAmount","number")}</div>
            <div><label style={lS}>Likelihood</label><select value={form.likelihood||"Medium"} onChange={e=>setForm(f=>({...f,likelihood:e.target.value}))} style={iS}>{LP_LIKELIHOOD.map(l=><option key={l}>{l}</option>)}</select></div>
            <div><label style={lS}>Tag</label>{fi("tag")}</div>
            <div><label style={lS}>How we know them</label>{fi("howWeKnowThem")}</div>
            <div style={{gridColumn:"span 2"}}><label style={lS}>What they care about</label>{fi("whatTheyCareAbout")}</div>
          </>}
          {form.type==="Lender"&&<>
            <div><label style={lS}>Projected loan ($)</label>{fi("projectedLoanAmount","number")}</div>
            <div><label style={lS}>Loan type</label>{fs("loanType",["Construction-to-perm","Bridge","Construction only","Permanent","SBA","Other"])}</div>
            <div><label style={lS}>Min loan ($)</label>{fi("minLoanSize","number")}</div>
            <div><label style={lS}>Max loan ($)</label>{fi("maxLoanSize","number")}</div>
            <div><label style={lS}>LTC appetite (%)</label>{fi("ltcAppetite","number")}</div>
            <div><label style={lS}>Geographies</label>{fi("geographies")}</div>
            <div style={{gridColumn:"span 2"}}><label style={lS}>Deals done</label>{fi("dealsDone")}</div>
          </>}
        </div>
        {["relationship","bio","nextStep","notes"].map(f=>(<div key={f} style={{marginTop:12}}><label style={lS}>{f==="relationship"?"Prior deal history":f==="nextStep"?"Next step":f}</label><textarea value={form[f]||""} onChange={e=>setForm(fm=>({...fm,[f]:e.target.value}))} rows={f==="notes"?4:2} style={{...iS,resize:"vertical"}}/></div>))}
        <div style={{display:"flex",gap:8,marginTop:"1rem"}}><button onClick={submit} style={btn()} disabled={saving}>{saving?"Saving…":"Save contact"}</button></div>
      </div>
    </div>);
  }

  return(<div style={{padding:"1rem 0"}}>
    <div style={{display:"flex",gap:0,marginBottom:"1rem",borderBottom:`1px solid ${B.steel}`}}>
      {["LP","Lender"].map(t=>(<button key={t} onClick={()=>{setTab(t);setSf([]);setLf([]);setTf([]);}} style={tB(tab===t)}>{t}s ({contacts.filter(c=>c.type===t).length})</button>))}
      <div style={{flex:1}}/><button onClick={openNew} style={{...btn(),fontSize:11,margin:"4px 0"}}>+ Add {tab}</button>
    </div>

    {tab==="LP"&&<LPPipeline lps={lps} onSelectLikelihood={v=>setLf(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v])} likelihoodFilter={lf} onOpenDetail={openDetail}/>}

    {tab==="Lender"&&(
      <div style={g4(mobile)}>
        {[["Lenders",lnds.length],["Projected loan",fmt$(lnT)],["Target",fmt$(5500000)],["Active",lnds.filter(c=>!["Not contacted","Passed"].includes(c.status)).length]].map(([l,v])=>(
          <div key={l} style={SC()}><div style={{fontSize:10,color:"rgba(255,255,255,0.65)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>{l}</div><div style={{fontSize:20,fontWeight:700,color:B.white}}>{v}</div></div>
        ))}
      </div>
    )}

    <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap"}}>
      <input placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} style={{...iS,flex:1,minWidth:140}}/>
      <MultiFilter label="Status" options={sts} selected={sf} onChange={setSf} colorMap={tab==="LP"?LP_STAT_COL:LN_STAT_COL}/>
      {tab==="LP"&&<>
        <MultiFilter label="Likelihood" options={LP_LIKELIHOOD} selected={lf} onChange={v=>{setLf(v);}} colorMap={likelihoodColor}/>
        <MultiFilter label="Tag" options={Array.from(new Set(contacts.filter(c=>c.type==="LP"&&c.tag).map(c=>c.tag))).sort()} selected={tf} onChange={setTf}/>
      </>}
    </div>

    {vis.length===0?<div style={{textAlign:"center",padding:"3rem",color:B.muted,fontSize:14}}>{contacts.filter(c=>c.type===tab).length===0?"No contacts yet.":"No contacts match your filters."}</div>:
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {[...vis].sort((a,b)=>{
          const lOrder={"High":0,"Medium":1,"Low":2};
          if(tab==="LP"){const lo=(lOrder[a.likelihood]??3)-(lOrder[b.likelihood]??3);if(lo!==0)return lo;}
          return(Number(b.expectedAmount)||0)-(Number(a.expectedAmount)||0);
        }).map(c=>(<div key={c.id} onClick={()=>openDetail(c)} style={{...card,cursor:"pointer",display:"flex",alignItems:"center",gap:12,padding:"10px 14px"}}>
          <Avatar name={c.name} color={c.type==="LP"?B.navy:B.sage}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontWeight:600,fontSize:14,color:B.navy}}>{c.name||"Unnamed"}</span>
              {c.firm&&<span style={{fontSize:12,color:B.muted}}>{c.firm}</span>}
              {c.tag&&<Badge label={c.tag} color={B.sage}/>}
              {c.type==="LP"&&c.likelihood&&<Badge label={c.likelihood} color={likelihoodColor[c.likelihood]||B.muted}/>}
            </div>
            <div style={{display:"flex",gap:12,marginTop:3,flexWrap:"wrap"}}>
              {c.type==="LP"&&c.expectedAmount&&<span style={{fontSize:12,color:B.muted}}>Expected: {fmt$(c.expectedAmount)}</span>}
              {c.type==="Lender"&&c.projectedLoanAmount&&<span style={{fontSize:12,color:B.muted}}>Loan: {fmt$(c.projectedLoanAmount)}</span>}
              {c.nextStep&&<span style={{fontSize:12,color:B.sage}}>↳ {c.nextStep}</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",fontSize:11,color:statCol(c.status),fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}><Pip color={statCol(c.status)}/>{c.status}</div>
        </div>))}
      </div>}
  </div>);
}

// ── Timeline (OSLO construction schedule) ─────────────────────────────────
// Source of truth: OSLO Builders schedule. Detail from 10/7/26 issue; summary rows updated from the 10/14/26 OAC printout.
// Calendar matches OSLO's MS Project file (Mon to Fri, less the holidays below). Finish = start + duration - 1 workday.
const SCHED_HOL=new Set(["2026-11-26","2026-11-27","2026-12-25","2026-12-31","2027-01-01","2027-05-31","2027-07-05","2027-09-06"]);
const sd=s=>new Date(s+"T00:00:00Z");
const ds=d=>d.toISOString().slice(0,10);
const isWD=d=>{const w=d.getUTCDay();return w!==0&&w!==6&&!SCHED_HOL.has(ds(d));};
function addWD(s,n){const d=sd(s);while(!isWD(d))d.setUTCDate(d.getUTCDate()+1);let c=1;while(c<n){d.setUTCDate(d.getUTCDate()+1);if(isWD(d))c++;}return ds(d);}
function wdBetween(a,b){if(b<=a)return 0;const d=sd(a);let c=0;while(ds(d)<b){d.setUTCDate(d.getUTCDate()+1);if(isWD(d))c++;}return c;}
const fmtD=s=>{if(!s)return"–";const[y,m,d]=s.split("-");return`${+m}/${+d}/${y.slice(2)}`;};
const SCHED_TODAY=(()=>{const t=new Date();return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;})();

const SCHED_BASE="10/7/26";
const SCHED_UPDATE="10/14/26";
const SC_BASE="2027-10-15";
const SC_CURRENT="2027-11-01"; // Construction summary finish per 10/14/26 update
const CONSTRUCTION_START="2026-09-11";

const LV_NOTE="LV, data, and camera rough-in must ride with this window.";
const DFH_NOTE="Lock hardware selection and door prep must be settled before this.";
const T=(name,start,dur,x={})=>({name,start,dur,...x});
const SCHED_GROUPS=[
  {label:"Drawings & Preconstruction",tasks:[
    T("IFC Set","2026-10-05",1),
    T("Interiors Set","2026-09-29",15,{owner:"SEEK / Rebel interiors set. Drives finish submittals."}),
    T("Awards","2026-09-23",40),
  ]},
  {label:"Submittals: High Priority",actual:"2026-09-23",tasks:[
    T("Siding & Balcony Ceiling Samples","2026-09-23",20),
    T("Elevator Shop Drawings","2026-09-25",20),
    T("Anchor Bolt Shop Drawings","2026-09-29",5,{done:true}),
    T("Steel Shop Drawings","2026-09-29",10),
    T("Rebar Shop Drawings","2026-09-30",5,{done:true}),
    T("Window Shop Drawings","2026-10-02",10,{done:true}),
    T("Truss Shop Drawings","2026-10-05",20),
    T("Panelized Wall Shop Drawings","2026-10-05",20),
    T("Exacor Underlayment","2026-10-05",20),
    T("Masonry","2026-10-14",10),
    T("Roofing","2026-10-14",15),
    T("Electrical","2026-10-14",20),
    T("Low Voltage / Security","2026-10-14",20,{owner:"LV vendor decision and scope split with Oslo needed."}),
    T("Fire Protection","2026-10-14",20),
    T("Plumbing Fixtures","2026-10-14",20),
    T("Mechanical","2026-10-14",20),
    T("Appliances","2026-10-14",20),
    T("Millwork Shop Drawings","2026-10-27",35),
  ]},
  {label:"Submittals: Low Priority",tasks:[
    T("Carpet","2026-11-03",20),
    T("Floor Tile","2026-11-03",20),
    T("Wall Tile","2026-11-03",20),
    T("Window Treatments","2026-11-03",20,{owner:"Listed with a \"?\" by Oslo. Confirm GC vs. owner FF&E scope."}),
    T("Toilet Accessories","2026-11-03",20),
    T("Glass Shower Enclosures","2026-11-03",30),
    T("Mirrors","2026-11-03",20),
    T("Wall Covering","2026-11-03",30),
  ]},
  {label:"Material Lead Times",tasks:[
    T("Rebar","2026-10-07",4),
    T("Structural Steel","2026-10-13",20),
    T("Windows (16 wks)","2026-10-16",80),
    T("Siding","2026-10-21",50),
    T("Balcony & Eyebrow Soffit","2026-10-21",50),
    T("Elevator (12 wks)","2026-10-23",60),
    T("Breeze Wall Brick","2026-10-28",30),
    T("Trusses","2026-11-02",15),
    T("Panelized Walls","2026-11-02",15),
    T("Exacor Underlayment","2026-11-02",20),
    T("Roofing","2026-11-04",20),
    T("Appliances","2026-11-11",80),
    T("Plumbing Roughs","2026-11-11",30),
    T("Mechanical","2026-11-11",40),
    T("Light Fixtures","2026-11-11",50),
    T("Electrical Equipment","2026-11-11",50),
    T("Carpet","2026-12-03",60),
    T("Floor Tile","2026-12-03",50),
    T("Wall Tile","2026-12-03",40),
    T("Mirrors","2026-12-03",30),
    T("Millwork","2026-12-17",50),
    T("Glass Shower Enclosures","2026-12-17",50),
  ]},
  {label:"Site Prep",tasks:[
    T("Abatement","2026-09-11",6),
    T("Demolition & Debris Removal","2026-09-15",14),
  ]},
  {label:"Substructure",cur:{start:"2026-10-02",finish:"2027-01-13"},tasks:[
    T("Excavation","2026-10-02",6,{cur:{start:"2026-10-02",dur:11},actual:"2026-10-02",note:"Extended 6 to 11 days (unsuitable soils). PCO 001, $25,000, pending against contingency."}),
    T("Footings","2026-10-12",10,{cur:{start:"2026-10-19",dur:10},note:"Start moved 10/12 to 10/19."}),
    T("Foundation Walls","2026-10-26",15,{note:"10/7 start overlaps the revised footing window. Expect a reissued date."}),
    T("Footing Curing (before CMU / steel)","2026-10-26",7),
    T("Backfill Foundations","2027-01-04",3),
  ]},
  {label:"Superstructure",tasks:[
    T("CMU: Footings to 2nd Floor","2026-11-16",5),
    T("Masonry Inspection","2026-11-23",5),
    T("2nd Floor Structural Steel","2026-12-02",10),
    T("Pour 2nd Floor Deck","2026-12-16",2),
    T("Steel Inspections","2026-12-16",5),
    T("CMU: 2nd Floor","2026-12-18",3),
    T("1st Floor Lobby Framing","2026-12-18",5),
    T("Waterproof & Encase Below-Grade Steel","2026-12-23",5),
    T("2nd Floor Walls","2026-12-23",5),
    T("3rd Floor Trusses & Walls","2027-01-04",10),
    T("CMU: 3rd Floor","2027-01-18",3),
    T("4th Floor Trusses & Walls","2027-01-21",10),
    T("CMU: 4th Floor","2027-02-04",3),
    T("Set Elevator Hoist Beam","2027-02-09",2),
    T("Roof Trusses, Sheathing, Parapet, Eyebrow","2027-02-09",8),
    T("Steel Stairs","2027-02-19",20),
    T("Garage Ceiling Framing","2027-03-10",5),
    T("1st Floor Rough Framing Inspections","2027-03-15",2),
  ]},
  {label:"Exterior Enclosure",tasks:[
    T("Roofing","2027-02-19",10),
    T("Windows","2027-02-19",15),
    T("Breeze Wall Masonry","2027-03-08",20),
    T("Siding","2027-03-12",20),
    T("Garage Ceiling Stucco","2027-04-05",8),
    T("Balcony Ceilings","2027-04-09",5),
    T("Eyebrow Soffit","2027-04-09",5),
  ]},
  {label:"Elevator",tasks:[
    T("Elevator Construction (5 wks)","2027-03-10",25),
  ]},
  {label:"MEPFP Rough",tasks:[
    T("Underslab Plumbing","2026-12-18",8),
    T("Underslab Electric","2026-12-18",5),
    T("Underslab MEP Inspections","2027-01-04",3),
    T("Slab on Grade: Lobby","2027-01-07",3),
    T("1st Floor MEPFP Rough-in","2027-01-27",30,{owner:LV_NOTE}),
    T("2nd Floor MEPFP Rough-in","2027-01-27",20,{owner:LV_NOTE}),
    T("2nd Floor Rough Inspections","2027-02-24",3),
    T("Garage Ceiling Plumbing Rough","2027-02-24",10),
    T("3rd Floor MEPFP Rough-in","2027-02-24",20,{owner:LV_NOTE}),
    T("1st Floor Rough Inspections","2027-03-10",3),
    T("3rd Floor Rough Inspections","2027-03-24",3),
    T("4th Floor MEPFP Rough-in","2027-03-24",20,{owner:LV_NOTE}),
    T("4th Floor Rough Inspections","2027-04-21",3),
  ]},
  ...[
    ["1st Floor",[["Insulation","2027-03-15",2],["Insulation Inspection","2027-03-17",2],["Drywall","2027-04-14",4],["Taping & Sanding","2027-04-20",8],["Spray Fireproofing on Steel","2027-04-21",4],["Prime & 1st Coat","2027-04-30",2],["Bathroom Tile","2027-06-02",6],["Flooring","2027-06-16",4],["Doors, Frames & Hardware","2027-06-22",4],["Millwork","2027-06-22",8],["Countertop Field Measure & Fab","2027-07-02",20],["Countertops","2027-08-02",2],["Backsplash Tile","2027-08-04",5],["Appliances","2027-08-04",2],["Final Paint","2027-08-11",10],["MEPFP Trim","2027-08-11",8],["Toilet Accessories","2027-08-25",2]]],
    ["2nd Floor",[["Insulation","2027-03-12",4],["Insulation Inspection","2027-03-18",2],["Drywall & Tile Backer","2027-03-22",6],["Taping & Sanding","2027-03-30",10],["Prime & 1st Coat","2027-04-13",3],["Shower Pans & Tile","2027-04-16",25],["Flooring","2027-04-16",10],["Doors, Frames & Hardware","2027-04-30",10],["Millwork & Running Trim","2027-04-30",15],["Countertop Field Measure & Fab","2027-05-21",20],["Interior Glazing","2027-05-21",5],["Countertops","2027-06-21",4],["Backsplash Tile","2027-06-25",8],["Appliances","2027-06-25",5],["Final Paint","2027-07-08",20],["MEPFP Trim","2027-07-08",10],["Toilet Accessories","2027-07-29",5],["Carpet: Common Corridor","2027-08-05",4]]],
    ["3rd Floor",[["Insulation","2027-03-18",4],["Insulation Inspection","2027-03-24",2],["Drywall & Tile Backer","2027-03-30",6],["Taping & Sanding","2027-04-07",10],["Prime & 1st Coat","2027-04-21",3],["Flooring","2027-04-30",10],["Doors, Frames & Hardware","2027-05-14",10],["Shower Pans & Tile","2027-05-21",25],["Millwork & Running Trim","2027-05-21",15],["Countertop Field Measure & Fab","2027-06-14",20],["Interior Glazing","2027-06-28",5],["Countertops","2027-07-13",4],["Backsplash Tile","2027-07-19",8],["Appliances","2027-07-19",5],["Final Paint","2027-07-29",15],["MEPFP Trim","2027-07-29",10],["Carpet: Common Corridor","2027-08-19",4],["Toilet Accessories","2027-08-19",5]]],
    ["4th Floor",[["Insulation","2027-03-26",4],["Insulation Inspection","2027-04-01",2],["Drywall & Tile Backer","2027-04-07",6],["Taping & Sanding","2027-04-15",10],["Prime & 1st Coat","2027-04-29",3],["Flooring","2027-05-14",10],["Doors, Frames & Hardware","2027-05-28",10],["Millwork & Running Trim","2027-06-14",15],["Shower Pans & Tile","2027-06-28",25],["Countertop Field Measure & Fab","2027-07-06",20],["Countertops","2027-08-03",4],["Interior Glazing","2027-08-03",5],["Backsplash Tile","2027-08-09",8],["Appliances","2027-08-09",5],["Final Paint","2027-08-19",15],["MEPFP Trim","2027-08-19",10],["Carpet: Common Corridor","2027-09-10",4],["Toilet Accessories","2027-09-10",5]]],
  ].map(([fl,rows])=>({label:`Interiors: ${fl}`,tasks:rows.map(([n,s,d])=>T(n,s,d,n.startsWith("Doors")?{owner:DFH_NOTE}:{}))})),
  {label:"Sitework",tasks:[
    T("Water Service","2027-01-07",10),
    T("Sanitary Sewer","2027-01-07",10),
    T("Storm Sewer incl. Oil Separator","2027-01-07",10),
    T("Site Electric","2027-02-10",10),
    T("Permeable Paver Drainage","2027-05-24",10),
    T("Hardscape & Permeable Pavers","2027-06-08",25),
    T("Plantings & Garden Beds","2027-07-14",20),
  ]},
  {label:"Closeout & Completion",tasks:[
    T("Final Inspections: Certificate of Occupancy","2027-09-17",3),
    T("Punchlist Walk","2027-09-17",5),
    T("Punchlist Work","2027-09-24",15),
    T("Substantial Completion",SC_BASE,1,{ms:true,cur:{start:SC_CURRENT,dur:1},note:"10/14 update: Construction finish moves to 11/1/27."}),
  ]},
  {label:"Owner Items",tasks:[
    T("Owner FF&E","2027-10-18",1,{ms:true,owner:"Shown as one day after SC. FF&E, TVs, Wi-Fi, and locks need a real install window."}),
  ]},
].map(g=>{
  const tasks=g.tasks.map(t=>{
    const bFin=addWD(t.start,t.dur);
    const cS=t.cur?t.cur.start:t.start, cF=t.cur?addWD(t.cur.start,t.cur.dur):bFin;
    return {...t,group:g.label,bFin,cS,cF,changed:!!t.cur&&(cS!==t.start||cF!==bFin),slip:t.cur?wdBetween(bFin,cF)-wdBetween(cF,bFin):0};
  });
  const bS=tasks.reduce((m,t)=>t.start<m?t.start:m,"9999"),bF=tasks.reduce((m,t)=>t.bFin>m?t.bFin:m,"0000");
  let cS=tasks.reduce((m,t)=>t.cS<m?t.cS:m,"9999"),cF=tasks.reduce((m,t)=>t.cF>m?t.cF:m,"0000");
  if(g.cur){cS=g.cur.start;cF=g.cur.finish;}
  return {...g,tasks,bS,bF,cS,cF,changed:cS!==bS||cF!==bF};
});
const SCHED_ALL=SCHED_GROUPS.flatMap(g=>g.tasks);
const SC_SLIP=wdBetween(SC_BASE,SC_CURRENT);
const taskStatus=t=>t.done||t.cF<SCHED_TODAY?"Complete":t.cS<=SCHED_TODAY?"In progress":"Upcoming";
const STATUS_COL={"Complete":"#2a6b3f","In progress":B.blue,"Upcoming":B.muted};
const NON_FIELD=new Set(["Drawings & Preconstruction","Submittals: High Priority","Submittals: Low Priority","Material Lead Times"]);
const isField=t=>!NON_FIELD.has(t.group);
function schedLookahead(days=21,fieldOrOwnerOnly=false){
  const end=(()=>{const d=sd(SCHED_TODAY);d.setUTCDate(d.getUTCDate()+days);return ds(d);})();
  return SCHED_ALL.filter(t=>!t.done&&t.cS<=end&&t.cF>=SCHED_TODAY&&(!fieldOrOwnerOnly||isField(t)||t.owner))
    .sort((a,b)=>(isField(b)-isField(a))||a.cS.localeCompare(b.cS)||a.cF.localeCompare(b.cF));
}
const SCHED_MILESTONES=(()=>{
  const g=l=>SCHED_GROUPS.find(x=>x.label===l);
  const t=(gl,n)=>g(gl).tasks.find(x=>x.name===n);
  const fin=(gl,n)=>{const x=t(gl,n);return{b:x.bFin,c:x.cur?x.cF:null};};
  return [
    {label:"Footings complete",...fin("Substructure","Footings")},
    {label:"Substructure complete",b:g("Substructure").bF,c:g("Substructure").cF},
    {label:"Roof framing complete",...fin("Superstructure","Roof Trusses, Sheathing, Parapet, Eyebrow")},
    {label:"Windows installed (dried in)",...fin("Exterior Enclosure","Windows")},
    {label:"Elevator complete",...fin("Elevator","Elevator Construction (5 wks)")},
    {label:"MEPFP rough complete (4th fl insp.)",...fin("MEPFP Rough","4th Floor Rough Inspections")},
    {label:"Final inspections / CO start",b:t("Closeout & Completion","Final Inspections: Certificate of Occupancy").start,c:null},
    {label:"Substantial Completion",b:SC_BASE,c:SC_CURRENT,key:true},
    {label:"Owner FF&E",b:"2027-10-18",c:null},
  ];
})();

const G_START="2026-09-01",G_END="2027-11-30";
const G_SPAN=sd(G_END)-sd(G_START);
const gP=s=>Math.min(100,Math.max(0,((sd(s)-sd(G_START))/G_SPAN)*100));
const gW=(s,f)=>Math.max(0.35,((sd(f)-sd(s))/G_SPAN)*100+ (1/ (G_SPAN/86400000))*100);
const G_MONTHS=(()=>{const out=[];const d=sd(G_START);while(ds(d)<=G_END){out.push({label:d.toLocaleString("en-US",{month:"short",timeZone:"UTC"})+(d.getUTCMonth()===0||out.length===0?` ${String(d.getUTCFullYear()).slice(2)}`:""),pct:gP(ds(d))});d.setUTCMonth(d.getUTCMonth()+1);}return out;})();

function Timeline(){
  const mobile=useIsMobile();
  const defaultOpen=Object.fromEntries(SCHED_GROUPS.map(g=>[g.label,g.tasks.some(t=>taskStatus(t)==="In progress")||g.changed]));
  const [open,setOpen]=useState(defaultOpen);
  const [ownerOnly,setOwnerOnly]=useState(false);
  const [sel,setSel]=useState(null);
  const allOpen=SCHED_GROUPS.every(g=>open[g.label]);
  const setAll=v=>setOpen(Object.fromEntries(SCHED_GROUPS.map(g=>[g.label,v])));
  const nowP=gP(SCHED_TODAY);
  const LW=mobile?150:250;
  const daysToSC=Math.round((sd(SC_CURRENT)-sd(SCHED_TODAY))/86400000);
  const totalWD=wdBetween(CONSTRUCTION_START,SC_CURRENT)+1;
  const doneWD=Math.min(totalWD,wdBetween(CONSTRUCTION_START,SCHED_TODAY));
  const ownerOpen=SCHED_ALL.filter(t=>t.owner&&taskStatus(t)!=="Complete").length;
  const look=schedLookahead(21);
  const groups=SCHED_GROUPS.map(g=>({...g,shown:ownerOnly?g.tasks.filter(t=>t.owner):g.tasks})).filter(g=>!ownerOnly||g.shown.length>0);
  const H=({children})=><div style={{fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:B.muted,fontWeight:700,marginBottom:"0.75rem"}}>{children}</div>;
  const Bar=({t,isGroup})=>{
    const st=isGroup?null:taskStatus(t);
    const col=isGroup?B.navy:(t.ms?B.danger:STATUS_COL[st]);
    const bS=isGroup?t.bS:t.start, bF=isGroup?t.bF:t.bFin;
    return(
      <div style={{flex:1,height:isGroup?18:16,position:"relative",minWidth:mobile?560:720}}>
        {G_MONTHS.map(m=><div key={m.label+m.pct} style={{position:"absolute",left:`${m.pct}%`,top:0,bottom:0,width:1,background:B.light}}/>)}
        {t.changed&&<div title={`10/7: ${fmtD(bS)} to ${fmtD(bF)}`} style={{position:"absolute",left:`${gP(bS)}%`,width:`${gW(bS,bF)}%`,top:"50%",height:4,marginTop:-2,background:B.steel,borderRadius:2}}/>}
        {t.ms&&!isGroup
          ?<div style={{position:"absolute",left:`calc(${gP(t.cS)}% - 6px)`,top:"50%",marginTop:-6,width:12,height:12,background:col,transform:"rotate(45deg)"}}/>
          :<div style={{position:"absolute",left:`${gP(t.cS)}%`,width:`${gW(t.cS,t.cF)}%`,top:isGroup?4:3,bottom:isGroup?4:3,background:col,opacity:isGroup?0.9:(t.changed?0.95:0.8),borderRadius:3,outline:t.changed?`1.5px solid ${B.danger}`:"none"}}/>}
        <div style={{position:"absolute",left:`${nowP}%`,top:-2,bottom:-2,width:1.5,background:B.danger,zIndex:2}}/>
      </div>
    );
  };
  return(<div style={{padding:"1.25rem 0"}}>
    <div style={g4(mobile)}>
      {[
        ["Substantial Completion",fmtD(SC_CURRENT),B.navy,`10/7 schedule: ${fmtD(SC_BASE)}`],
        ["Schedule variance",`+${SC_SLIP} workdays`,SC_SLIP>0?B.danger:"#2a6b3f",`Per ${SCHED_UPDATE} update`],
        ["Days to SC",daysToSC,B.blue,`${Math.round(doneWD/totalWD*100)}% of construction workdays elapsed`],
        ["Open owner items",ownerOpen,ownerOpen>0?B.gold:"#2a6b3f","Tasks that depend on NBHD decisions"],
      ].map(([l,v,c,sub])=>(
        <div key={l} style={SC(c)}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
          <div style={{fontSize:mobile?17:22,fontWeight:700,color:B.white,lineHeight:1.2}}>{v}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.65)",marginTop:4}}>{sub}</div>
        </div>
      ))}
    </div>

    <div style={{marginBottom:"1.25rem",padding:"0.85rem 1rem",borderRadius:8,background:B.danger+"0d",border:`1px solid ${B.danger}33`}}>
      <div style={{fontSize:12,fontWeight:700,color:B.danger,marginBottom:4}}>{SCHED_UPDATE} update: completion moves {SC_SLIP} workdays, {fmtD(SC_BASE)} to {fmtD(SC_CURRENT)}</div>
      <div style={{fontSize:11,color:B.navy,lineHeight:1.6}}>
        Excavation extended from 6 to 11 days (10/2 to 10/16). Footings moved from a 10/12 to a 10/19 start, finishing 10/30. Substructure now finishes 1/13/27. PCO 001 ($25,000, unsuitable soils) is pending against Oslo's contingency.
        Task detail below Substructure still reflects the {SCHED_BASE} issue until Oslo reissues the full schedule. Foundation walls still show a 10/26 start, which overlaps the revised footing window.
      </div>
    </div>

    <div style={{...g2(mobile),alignItems:"start"}}>
      <div style={card}>
        <H>Key milestones</H>
        <div style={{display:"grid",gridTemplateColumns:"1fr 74px 74px",gap:8,fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",paddingBottom:6,borderBottom:`1px solid ${B.steel}`}}>
          <div/><div style={{textAlign:"right"}}>{SCHED_BASE}</div><div style={{textAlign:"right"}}>{SCHED_UPDATE}</div>
        </div>
        {SCHED_MILESTONES.map(m=>{
          const eff=m.c||m.b, done=eff<SCHED_TODAY;
          return(
            <div key={m.label} style={{display:"grid",gridTemplateColumns:"1fr 74px 74px",gap:8,padding:"7px 0",borderBottom:`1px solid ${B.light}`,alignItems:"baseline"}}>
              <span style={{fontSize:12,color:B.navy,fontWeight:m.key?700:400}}>{done?"✓ ":""}{m.label}</span>
              <span style={{fontSize:12,color:m.c&&m.c!==m.b?B.muted:B.navy,textAlign:"right",textDecoration:m.c&&m.c!==m.b?"line-through":"none"}}>{fmtD(m.b)}</span>
              <span style={{fontSize:12,textAlign:"right",fontWeight:m.c?700:400,color:m.c&&m.c>m.b?B.danger:m.c?B.navy:B.muted}}>{m.c?fmtD(m.c):"Not reissued"}</span>
            </div>
          );
        })}
      </div>
      <div style={card}>
        <H>3-week lookahead <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>· {look.length} tasks</span></H>
        <div style={{maxHeight:330,overflowY:"auto"}}>
          {look.map((t,i)=>{
            const st=taskStatus(t);
            const hdr=i===0||isField(look[i-1])!==isField(t);
            return(<Fragment key={t.group+t.name+i}>
              {hdr&&<div style={{fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",padding:"8px 0 2px"}}>{isField(t)?"Field":"Design, submittals & procurement"}</div>}
              <div style={{display:"flex",gap:10,alignItems:"baseline",padding:"7px 0",borderBottom:`1px solid ${B.light}`}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:STATUS_COL[st],flexShrink:0,marginTop:3}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:B.navy,fontWeight:600}}>{t.name}{t.owner&&<span title={t.owner} style={{marginLeft:6,fontSize:10,color:B.gold}}>● Owner</span>}</div>
                  <div style={{fontSize:10,color:B.muted}}>{t.group}</div>
                </div>
                <div style={{fontSize:11,color:t.changed?B.danger:B.navy,whiteSpace:"nowrap"}}>{fmtD(t.cS)} – {fmtD(t.cF)}</div>
              </div>
            </Fragment>);
          })}
          {look.length===0&&<div style={{fontSize:12,color:B.muted}}>Nothing scheduled in the next three weeks.</div>}
        </div>
      </div>
    </div>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",margin:"0.5rem 0 0.75rem"}}>
      <H>OSLO schedule</H>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>setOwnerOnly(o=>!o)} style={btn(!ownerOnly)}>{ownerOnly?"Showing owner items":"Owner items only"}</button>
        <button onClick={()=>setAll(!allOpen)} style={btn(true)}>{allOpen?"Collapse all":"Expand all"}</button>
      </div>
    </div>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:10,color:B.muted,letterSpacing:"0.04em",marginBottom:8}}>
      {[["Complete","#2a6b3f"],["In progress",B.blue],["Upcoming",B.muted]].map(([l,c])=><span key={l} style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:8,background:c,borderRadius:2,display:"inline-block"}}/>{l}</span>)}
      <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:8,borderRadius:2,outline:`1.5px solid ${B.danger}`,display:"inline-block"}}/>Changed in {SCHED_UPDATE} update</span>
      <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:3,background:B.steel,display:"inline-block"}}/>{SCHED_BASE} dates</span>
      <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:2,height:10,background:B.danger,display:"inline-block"}}/>Today</span>
      <span style={{color:B.gold}}>● Owner dependency</span>
    </div>
    <div style={{...card,padding:0,overflowX:"auto"}}>
      <div style={{display:"flex",position:"sticky",top:0,background:B.offwhite,borderBottom:`1px solid ${B.steel}`,zIndex:3}}>
        <div style={{width:LW,flexShrink:0,position:"sticky",left:0,background:B.offwhite,zIndex:4,padding:"8px 12px",fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase"}}>Task</div>
        <div style={{flex:1,position:"relative",height:30,minWidth:mobile?560:720,marginRight:12}}>
          {G_MONTHS.map(m=><div key={m.label+m.pct} style={{position:"absolute",left:`${m.pct}%`,top:9,fontSize:10,color:B.muted,whiteSpace:"nowrap",paddingLeft:3}}>{m.label}</div>)}
        </div>
      </div>
      {groups.map(g=>(
        <Fragment key={g.label}>
          <div onClick={()=>setOpen(o=>({...o,[g.label]:!o[g.label]}))} style={{display:"flex",alignItems:"center",borderBottom:`1px solid ${B.light}`,background:"#f8f9fb",cursor:"pointer"}}>
            <div style={{width:LW,flexShrink:0,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,padding:"8px 12px",boxSizing:"border-box"}}>
              <div style={{fontSize:mobile?11:12,fontWeight:700,color:B.navy,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{open[g.label]?"▾":"▸"} {g.label}</div>
              <div style={{fontSize:10,color:g.changed?B.danger:B.muted}}>{fmtD(g.cS)} – {fmtD(g.cF)}{g.changed?` (was ${fmtD(g.bF)})`:""}</div>
            </div>
            <div style={{flex:1,marginRight:12,padding:"6px 0"}}><Bar t={g} isGroup/></div>
          </div>
          {open[g.label]&&g.shown.map((t,i)=>{
            const isSel=sel===t.group+t.name;
            return(
            <Fragment key={t.name+i}>
              <div onClick={()=>setSel(isSel?null:t.group+t.name)} style={{display:"flex",alignItems:"center",borderBottom:`1px solid ${B.light}`,background:isSel?"#f3f6f9":B.white,cursor:"pointer"}}>
                <div style={{width:LW,flexShrink:0,position:"sticky",left:0,background:isSel?"#f3f6f9":B.white,zIndex:2,padding:"5px 12px 5px 24px",boxSizing:"border-box"}}>
                  <div style={{fontSize:mobile?10:11.5,color:B.navy,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.owner&&<span style={{color:B.gold,marginRight:4}}>●</span>}{t.name}</div>
                  <div style={{fontSize:10,color:t.changed?B.danger:B.muted}}>{fmtD(t.cS)}{t.ms?"":` – ${fmtD(t.cF)}`} · {t.cur?t.cur.dur:t.dur}d{t.changed&&t.slip?` · +${t.slip}d`:""}</div>
                </div>
                <div style={{flex:1,marginRight:12,padding:"4px 0"}}><Bar t={t}/></div>
              </div>
              {isSel&&(
                <div style={{padding:"8px 12px 10px 24px",borderBottom:`1px solid ${B.light}`,background:"#f3f6f9",fontSize:11,color:B.navy,lineHeight:1.6,position:"sticky",left:0,maxWidth:mobile?320:760}}>
                  <div><b>{SCHED_BASE}:</b> {fmtD(t.start)} – {fmtD(t.bFin)} ({t.dur} workdays){t.cur&&<> · <b>{SCHED_UPDATE}:</b> {fmtD(t.cS)} – {fmtD(t.cF)} ({t.cur.dur} workdays)</>}</div>
                  <div><b>Status:</b> {taskStatus(t)}{t.actual?` · Actual start ${fmtD(t.actual)}`:""}</div>
                  {t.note&&<div><b>Note:</b> {t.note}</div>}
                  {t.owner&&<div style={{color:"#8a6d1f"}}><b>Owner:</b> {t.owner}</div>}
                </div>
              )}
            </Fragment>);
          })}
        </Fragment>
      ))}
    </div>
    <div style={{fontSize:11,color:B.muted,marginTop:"0.75rem",lineHeight:1.6}}>
      Source: OSLO Builders Construction Schedule {SCHED_BASE} (task detail) and {SCHED_UPDATE} OAC printout (summary updates). Finish dates use Oslo's workday calendar. Click any task for dates and notes. Status is based on scheduled dates, not field-verified progress.
    </div>
  </div>);
}

// ── Value Engineering ────────────────────────────────────────────────────────
const VE_STATUS_COLOR={"Pending":B.muted,"Accepted":"#2a6b3f","Rejected":B.danger};

function veToRow(v){
  return { id:String(v.id), status:v.status||"Pending", notes:v.notes||"", updated_at:new Date().toISOString() };
}
function rowToVeStatus(r){
  return { id:r.id, status:r.status||"Pending", notes:r.notes||"" };
}

function ValueEngineering(){
  const mobile=useIsMobile();
  const [statusMap,setStatusMap]=useState({}); // id -> {status,notes}
  const [loaded,setLoaded]=useState(false);
  const [openId,setOpenId]=useState(null);
  const [saving,setSaving]=useState(null);

  useEffect(()=>{
    async function load(){
      try{
        const rows=await sbFetch("ve_status");
        const map={};
        rows.map(rowToVeStatus).forEach(r=>{map[r.id]=r;});
        setStatusMap(map);
      }catch(e){ setStatusMap({}); }
      setLoaded(true);
    }
    load();
  },[]);

  function getStatus(id){ return (statusMap[id]&&statusMap[id].status)||"Pending"; }
  function getNotes(id){ return (statusMap[id]&&statusMap[id].notes)||""; }

  async function setStatus(id,status){
    const updated={id:String(id),status,notes:getNotes(id)};
    setStatusMap(m=>({...m,[id]:updated}));
    setSaving(id);
    try{ await sbUpsert("ve_status",[veToRow(updated)]); }catch(e){}
    setSaving(null);
  }

  async function setNotes(id,notes){
    const updated={id:String(id),status:getStatus(id),notes};
    setStatusMap(m=>({...m,[id]:updated}));
  }

  async function saveNotes(id){
    setSaving(id);
    try{ await sbUpsert("ve_status",[veToRow({id,status:getStatus(id),notes:getNotes(id)})]); }catch(e){}
    setSaving(null);
  }

  if(!loaded) return <div style={{padding:"3rem",textAlign:"center",fontSize:13,color:B.muted}}>Loading…</div>;

  const savingsItems = VE_ITEMS.filter(v=>!v.isAdd);
  const addItems = VE_ITEMS.filter(v=>v.isAdd);
  const totalPotential = savingsItems.reduce((s,v)=>s+Math.abs(v.total),0);
  const acceptedSavings = savingsItems.filter(v=>getStatus(v.id)==="Accepted").reduce((s,v)=>s+Math.abs(v.total),0);
  const rejectedSavings = savingsItems.filter(v=>getStatus(v.id)==="Rejected").reduce((s,v)=>s+Math.abs(v.total),0);
  const pendingSavings = totalPotential-acceptedSavings-rejectedSavings;
  const acceptedAdds = addItems.filter(v=>getStatus(v.id)==="Accepted").reduce((s,v)=>s+v.total,0);
  const netLockedIn = acceptedSavings-acceptedAdds;
  const remainingGap = FUNDING_GAP-netLockedIn;

  const fmtV = v => (v<0?"−":"")+fmt$(Math.abs(v));

  const Row = ({item}) => {
    const status=getStatus(item.id);
    const isOpen=openId===item.id;
    return (
      <div style={{borderBottom:`1px solid ${B.light}`}}>
        <div onClick={()=>setOpenId(isOpen?null:item.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",background:isOpen?B.offwhite:B.white}}>
          <div style={{fontSize:11,color:B.muted,width:20,flexShrink:0}}>{item.number}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:B.navy}}>{item.title}{item.isAdd&&<span style={{marginLeft:8,fontSize:10,fontWeight:700,color:B.danger,textTransform:"uppercase",letterSpacing:"0.04em"}}>Cost add</span>}</div>
            <div style={{fontSize:10,color:B.muted,marginTop:1}}>{item.category}</div>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:item.isAdd?B.danger:"#2a6b3f",flexShrink:0,width:110,textAlign:"right"}}>{item.isAdd?"+":"−"}{fmt$(Math.abs(item.total))}</div>
          <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:10,background:VE_STATUS_COLOR[status]+"18",color:VE_STATUS_COLOR[status],flexShrink:0,letterSpacing:"0.03em"}}>{status.toUpperCase()}</span>
          <span style={{fontSize:11,color:B.muted,flexShrink:0}}>{isOpen?"▲":"▼"}</span>
        </div>
        {isOpen && (
          <div style={{padding:"0 14px 16px 46px",background:B.offwhite}}>
            {item.veNote && <div style={{fontSize:11,color:B.navy,background:B.white,border:`1px solid ${B.steel}`,borderRadius:6,padding:"8px 10px",marginBottom:10,maxWidth:640}}>{item.veNote}</div>}
            <div style={{border:`1px solid ${B.steel}`,borderRadius:6,overflow:"hidden",background:B.white,maxWidth:640}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 50px 50px 80px 80px",gap:6,padding:"6px 10px",background:B.light,fontSize:9,textTransform:"uppercase",letterSpacing:"0.04em",color:B.muted,fontWeight:700}}>
                <div>Description</div><div style={{textAlign:"right"}}>Qty</div><div>Unit</div><div style={{textAlign:"right"}}>Price</div><div style={{textAlign:"right"}}>Subtotal</div>
              </div>
              {item.lines.map((l,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 50px 50px 80px 80px",gap:6,padding:"6px 10px",fontSize:11,color:B.navy,borderTop:`1px solid ${B.light}`}}>
                  <div>{l.desc}</div>
                  <div style={{textAlign:"right"}}>{l.qty??""}</div>
                  <div>{l.unit}</div>
                  <div style={{textAlign:"right"}}>{fmtV(l.price)}</div>
                  <div style={{textAlign:"right",fontWeight:600}}>{fmtV(l.sub)}</div>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"flex-end",padding:"7px 10px",borderTop:`2px solid ${B.navy}`,fontSize:12,fontWeight:700,color:B.navy}}>{fmtV(item.total)}</div>
            </div>

            <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
              {["Pending","Accepted","Rejected"].map(s=>(
                <button key={s} onClick={()=>setStatus(item.id,s)} style={{fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:14,cursor:"pointer",border:`1px solid ${status===s?VE_STATUS_COLOR[s]:B.light}`,background:status===s?VE_STATUS_COLOR[s]:B.white,color:status===s?B.white:B.muted}}>{s}</button>
              ))}
              {saving===item.id && <span style={{fontSize:11,color:B.muted}}>Saving…</span>}
            </div>
            <div style={{marginTop:8,maxWidth:640}}>
              <textarea
                value={getNotes(item.id)}
                onChange={e=>setNotes(item.id,e.target.value)}
                onBlur={()=>saveNotes(item.id)}
                placeholder="Decision notes…"
                style={{...iS,height:50,resize:"vertical"}}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return(
    <div style={{padding:"1.25rem 0"}}>
      <div style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:20,fontWeight:700,color:B.navy}}>Value Engineering</div>
        <div style={{fontSize:12,color:B.muted,marginTop:2}}>OSLO Builders, Project Options — NBHD Hotel Alternates (24-037), first pass</div>
      </div>

      <div style={g4(mobile)}>
        {[
          ["Total potential savings",fmt$(totalPotential),B.navy],
          ["Accepted (locked in)","−"+fmt$(acceptedSavings),"#2a6b3f"],
          ["Rejected (kept in scope)","−"+fmt$(rejectedSavings),B.muted],
          ["Still pending",fmt$(pendingSavings),B.gold],
        ].map(([l,v,c])=>(
          <div key={l} style={SC(c)}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
            <div style={{fontSize:mobile?15:20,fontWeight:700,color:B.white}}>{v}</div>
          </div>
        ))}
      </div>

      {addItems.length>0 && (
        <div style={{fontSize:11,color:B.muted,marginBottom:12}}>
          Net of accepted cost adds ({fmt$(acceptedAdds)}): <b style={{color:netLockedIn>=0?"#2a6b3f":B.danger}}>{netLockedIn>=0?"−":"+"}{fmt$(Math.abs(netLockedIn))}</b> net savings locked in so far.
        </div>
      )}

      <div style={{...card,marginBottom:16,background:remainingGap>0?B.danger+"0d":"#2a6b3f0d",border:`1px solid ${remainingGap>0?B.danger+"44":"#2a6b3f44"}`}}>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr 1fr",gap:12}}>
          <div>
            <div style={{fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Original funding gap</div>
            <div style={{fontSize:16,fontWeight:700,color:B.navy}}>{fmt$(FUNDING_GAP)}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Net locked in so far</div>
            <div style={{fontSize:16,fontWeight:700,color:"#2a6b3f"}}>−{fmt$(Math.max(0,netLockedIn))}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Remaining gap</div>
            <div style={{fontSize:16,fontWeight:700,color:remainingGap>0?B.danger:"#2a6b3f"}}>{remainingGap>0?fmt$(remainingGap):"Closed"}</div>
          </div>
        </div>
        <div style={{fontSize:11,color:B.muted,marginTop:8}}>Updates automatically as items below are marked Accepted or Rejected. Pending items aren't counted until a decision is made.</div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"10px 14px",fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,background:B.offwhite,borderBottom:`1px solid ${B.light}`}}>Savings options ({savingsItems.length})</div>
        {savingsItems.map(item=><Row key={item.id} item={item}/>)}
      </div>

      {addItems.length>0 && (
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,background:B.offwhite,borderBottom:`1px solid ${B.light}`}}>Related cost adds ({addItems.length})</div>
          {addItems.map(item=><Row key={item.id} item={item}/>)}
        </div>
      )}

      <div style={{fontSize:11,color:B.muted,marginTop:"0.75rem"}}>Click any item to see OSLO's full line-item detail and set a decision. Notes save when you click away from the field.</div>
    </div>
  );
}

// ── Lessons Learned ──────────────────────────────────────────────────────────
const LL_CATEGORIES=["Layout/Flow","Furniture/FF&E","Materials/Finishes","Storage","MEP/Systems","Building Envelope","Housekeeping/Ops"];
const LL_PRINT_ORDER=["Building Envelope","Furniture/FF&E","Materials/Finishes","Storage","MEP/Systems","Housekeeping/Ops","Layout/Flow"];
const LL_OWNERS=["Rebel House","OSLO","SEEK","Rebel House / SEEK","SEEK / OSLO","OSLO / SEEK","ECG"];
const LL_SEVERITY_COLOR={"High":"#7a1e1e","Medium":"#8a5a00","Low":"#5f5e5a"};
const LL_STATUS_COLOR={"Flagged":B.danger,"In Barton Budget":"#2a6b3f","Needs Decision":B.gold,"Resolved":B.muted};

function llToRow(l){
  return {
    id:String(l.id), category:l.category||"", item:l.item||"", issue:l.issue||"",
    owner:l.owner||"", severity:l.severity||"Medium", status:l.status||"Flagged",
    photo_url:l.photo_url||"", notes:l.notes||"", updated_at:new Date().toISOString(),
  };
}
function rowToLesson(r){
  return {
    id:r.id, category:r.category||"", item:r.item||"", issue:r.issue||"",
    owner:r.owner||"", severity:r.severity||"Medium", status:r.status||"Flagged",
    photo_url:r.photo_url||"", notes:r.notes||"",
  };
}

function LessonsLearned(){
  const mobile=useIsMobile();
  const [items,setItems]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [loadFailed,setLoadFailed]=useState(false);
  const [saveError,setSaveError]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({});
  const [catFilter,setCatFilter]=useState("All");
  const [uploading,setUploading]=useState(false);
  const [uploadError,setUploadError]=useState(null);

  function handlePhotoFile(file){
    if(!file) return;
    setUploadError(null);
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1000;
        let w = img.width, h = img.height;
        if(w > maxDim || h > maxDim){
          if(w > h){ h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        setForm(f=>({...f, photo_url: dataUrl}));
        setUploading(false);
      };
      img.onerror = () => { setUploadError("Couldn't read that image."); setUploading(false); };
      img.src = e.target.result;
    };
    reader.onerror = () => { setUploadError("Couldn't read that file."); setUploading(false); };
    reader.readAsDataURL(file);
  }

  useEffect(()=>{
    async function load(){
      try{
        const rows=await sbFetch("lessons_learned");
        if(rows.length===0){
          await sbUpsert("lessons_learned", LESSONS_SEED.map(llToRow));
          setItems(LESSONS_SEED);
        } else {
          setItems(rows.map(rowToLesson));
        }
      }catch(e){
        setItems(LESSONS_SEED);
        setLoadFailed(true);
      }
      setLoaded(true);
    }
    load();
  },[]);

  function openNew(){
    setForm({category:LL_CATEGORIES[0],item:"",issue:"",owner:LL_OWNERS[0],severity:"Medium",status:"Flagged",photo_url:"",notes:""});
    setEditingId(null);
    setShowForm(true);
  }
  function openEdit(it){
    setForm({...it});
    setEditingId(it.id);
    setShowForm(true);
  }

  async function submitForm(){
    const item = form.item && form.item.trim();
    if(!item) return;
    const rec = editingId
      ? {...items.find(i=>i.id===editingId), ...form}
      : {id:`ll-${Date.now()}`, ...form, item};
    setItems(prev => editingId ? prev.map(i=>i.id===editingId?rec:i) : [rec, ...prev]);
    setShowForm(false);
    setSaveError(null);
    setSaving(true);
    try{ await sbUpsert("lessons_learned",[llToRow(rec)]); }catch(e){ setSaveError(String(e.message||e)); }
    setSaving(false);
  }

  async function deleteItem(id){
    setItems(prev=>prev.filter(i=>i.id!==id));
    try{ await sbDelete("lessons_learned", id); }catch(e){}
    setShowForm(false);
  }

  function exportPDF(){
    const esc = s => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const genDate = new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
    const sevOrder = {"High":0,"Medium":1,"Low":2};
    const scope = catFilter==="All" ? items : items.filter(i=>i.category===catFilter);
    const byCat = {};
    scope.forEach(i=>{ (byCat[i.category]=byCat[i.category]||[]).push(i); });
    const cats = Object.keys(byCat).sort((a,b)=>LL_PRINT_ORDER.indexOf(a)-LL_PRINT_ORDER.indexOf(b));

    const cardHtml = (it) => `
      <div class="item">
        ${it.photo_url?`<img class="photo" src="${it.photo_url}"/>`:`<div class="nophoto">No photo</div>`}
        <div class="itembody">
          <div class="itemtitle">${esc(it.item)} <span class="sev sev-${(it.severity||"").toLowerCase()}">${esc(it.severity)}</span></div>
          <div class="issue">${esc(it.issue)}</div>
          <div class="tags">
            <span class="tag">${esc(it.owner)}</span>
            <span class="tag status-${(it.status||"").replace(/\s+/g,"-").toLowerCase()}">${esc(it.status)}</span>
          </div>
          ${it.notes?`<div class="notes"><b>Notes:</b> ${esc(it.notes)}</div>`:""}
        </div>
      </div>`;

    const sectionHtml = (cat) => {
      const rows = byCat[cat].slice().sort((a,b)=>(sevOrder[a.severity]??9)-(sevOrder[b.severity]??9));
      return `<h2>${esc(cat)} (${rows.length})</h2><div class="grid">${rows.map(cardHtml).join("")}</div>`;
    };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>115 N Barton — Lessons Learned</title>
    <style>
      * { box-sizing:border-box; }
      body{ font-family:'Gill Sans','Gill Sans MT','Trebuchet MS',Arial,sans-serif; color:#021d2b; margin:0; padding:0; }
      .headerbar{ background:#021d2b; padding:28px 48px 22px 48px; display:flex; align-items:flex-end; justify-content:space-between; }
      .eyebrow{ font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:#ffffff; margin-bottom:6px; font-weight:600; }
      .headerbar h1{ font-size:23px; margin:0; letter-spacing:0.02em; color:#ffffff; font-weight:700; }
      .doclabel{ font-size:13px; letter-spacing:0.06em; text-transform:uppercase; color:#ffffff; font-weight:700; text-align:right; }
      .goldrule{ height:3px; background:#c9a84c; }
      .content{ padding:28px 48px 40px 48px; }
      .meta{ font-size:11px; color:#6b8497; margin-bottom:10px; }
      h2{ font-size:12px; text-transform:uppercase; letter-spacing:0.09em; color:#033b57; font-weight:700; border-bottom:1px solid #ccd5de; padding-bottom:6px; margin:26px 0 12px 0; }
      .grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
      .item{ display:flex; gap:12px; border:1px solid #e8edf1; border-radius:6px; padding:10px; page-break-inside:avoid; }
      .photo{ width:90px; height:90px; object-fit:cover; border-radius:4px; flex-shrink:0; border:1px solid #e8edf1; }
      .nophoto{ width:90px; height:90px; flex-shrink:0; border-radius:4px; border:1px dashed #ccd5de; display:flex; align-items:center; justify-content:center; font-size:9px; color:#6b8497; text-align:center; }
      .itembody{ flex:1; min-width:0; }
      .itemtitle{ font-size:12.5px; font-weight:700; color:#021d2b; }
      .sev{ font-size:8.5px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; margin-left:6px; }
      .sev-high{ color:#7a1e1e; }
      .sev-medium{ color:#8a5a00; }
      .sev-low{ color:#5f5e5a; }
      .issue{ font-size:10.5px; color:#5f5e5a; margin-top:4px; line-height:1.4; }
      .tags{ margin-top:6px; }
      .tag{ display:inline-block; font-size:8.5px; font-weight:700; letter-spacing:0.03em; padding:2px 7px; border-radius:8px; background:#f4f6f8; border:1px solid #e8edf1; color:#021d2b; margin-right:5px; }
      .notes{ font-size:9.5px; color:#6b8497; margin-top:5px; line-height:1.4; }
      .footer{ margin-top:36px; padding-top:12px; border-top:1px solid #ccd5de; font-size:10px; color:#6b8497; }
      @media print{
        .headerbar{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .item{ break-inside:avoid; }
      }
    </style></head><body>
      <div class="headerbar">
        <div>
          <div class="eyebrow">The Neighborhood Hotel</div>
          <h1>115 N Barton Street</h1>
        </div>
        <div class="doclabel">Lessons Learned${catFilter!=="All"?" — "+esc(catFilter):""}</div>
      </div>
      <div class="goldrule"></div>
      <div class="content">
        <div class="meta">Little Italy walkthrough — generated ${genDate}${catFilter!=="All"?"":` — ${scope.length} items`}</div>
        ${cats.map(sectionHtml).join("")}
        <div class="footer">The Neighborhood Hotel — 115 N Barton St, New Buffalo, MI</div>
      </div>
    </body></html>`;

    const w = window.open("", "_blank");
    if(!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(()=>{ w.print(); }, 350);
  }

  if(!loaded) return <div style={{padding:"3rem",textAlign:"center",fontSize:13,color:B.muted}}>Loading…</div>;

  const filtered = catFilter==="All" ? items : items.filter(i=>i.category===catFilter);
  const counts = {};
  LL_CATEGORIES.forEach(c=>{ counts[c]=items.filter(i=>i.category===c).length; });

  const chipStyle=(active)=>({fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:14,cursor:"pointer",border:`1px solid ${active?B.navy:B.light}`,background:active?B.navy:B.white,color:active?B.white:B.muted});

  return(
    <div style={{padding:"1.25rem 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:B.navy}}>Lessons Learned</div>
          <div style={{fontSize:12,color:B.muted,marginTop:2}}>Little Italy walkthrough — what doesn't work, ahead of finalizing Barton's design and budget</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportPDF} style={btn(true)}>Export PDF</button>
          <button onClick={openNew} style={btn()}>+ Add item</button>
        </div>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1.25rem"}}>
        <div onClick={()=>setCatFilter("All")} style={chipStyle(catFilter==="All")}>All ({items.length})</div>
        {LL_CATEGORIES.filter(c=>counts[c]>0 || catFilter===c).map(c=>(
          <div key={c} onClick={()=>setCatFilter(c)} style={chipStyle(catFilter===c)}>{c} ({counts[c]||0})</div>
        ))}
      </div>

      {loadFailed && <div style={{fontSize:12,color:B.danger,marginBottom:12}}>Couldn't load saved items. Check Supabase connection.</div>}
      {saveError && <div style={{fontSize:12,color:B.danger,marginBottom:12}}>Showing locally, but didn't save to the database: {saveError}</div>}

      <div style={{...card,padding:0,overflow:"hidden"}}>
        {filtered.length===0
          ? <div style={{padding:"1.5rem",textAlign:"center",color:B.muted,fontSize:13}}>Nothing in this category yet.</div>
          : filtered.map(it=>(
            <div key={it.id} onClick={()=>openEdit(it)} style={{padding:"12px 14px",borderBottom:`1px solid ${B.light}`,cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                {it.photo_url && <img src={it.photo_url} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:6,border:`1px solid ${B.light}`,flexShrink:0}}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:700,color:B.navy}}>{it.item}</span>
                    <span style={{fontSize:9,fontWeight:700,color:LL_SEVERITY_COLOR[it.severity]||B.muted,letterSpacing:"0.04em",textTransform:"uppercase"}}>{it.severity}</span>
                  </div>
                  <div style={{fontSize:12,color:B.muted,marginTop:3}}>{it.issue}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:B.offwhite,border:`1px solid ${B.light}`,color:B.navy,fontWeight:600}}>{it.category}</span>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:B.offwhite,border:`1px solid ${B.light}`,color:B.navy,fontWeight:600}}>{it.owner}</span>
                    <span style={{fontSize:10,fontWeight:700,color:LL_STATUS_COLOR[it.status]||B.muted}}>{it.status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"2rem 1rem",overflowY:"auto"}}>
          <div style={{...card,width:"100%",maxWidth:560}}>
            <div style={{fontSize:15,fontWeight:700,color:B.navy,marginBottom:"1.25rem"}}>{editingId?"Edit item":"New item"}</div>

            <div style={{marginBottom:12}}>
              <label style={lS}>Item</label>
              <input value={form.item||""} onChange={e=>setForm(f=>({...f,item:e.target.value}))} style={iS} placeholder="e.g. Shower doors leak" autoFocus/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={lS}>Issue / description</label>
              <textarea value={form.issue||""} onChange={e=>setForm(f=>({...f,issue:e.target.value}))} style={{...iS,height:70,resize:"vertical"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={lS}>Category</label>
                <select value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={iS}>
                  {LL_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lS}>Likely owner</label>
                <select value={form.owner||""} onChange={e=>setForm(f=>({...f,owner:e.target.value}))} style={iS}>
                  {LL_OWNERS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={lS}>Severity</label>
                <select value={form.severity||""} onChange={e=>setForm(f=>({...f,severity:e.target.value}))} style={iS}>
                  {["High","Medium","Low"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={lS}>Status</label>
                <select value={form.status||""} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={iS}>
                  {["Flagged","In Barton Budget","Needs Decision","Resolved"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={lS}>Photo</label>
              <div style={{display:"flex",gap:10,alignItems:"flex-start",flexWrap:"wrap"}}>
                {form.photo_url && (
                  <div style={{position:"relative"}}>
                    <img src={form.photo_url} alt="" style={{width:70,height:70,objectFit:"cover",borderRadius:6,border:`1px solid ${B.light}`}}/>
                    <button type="button" onClick={()=>setForm(f=>({...f,photo_url:""}))} style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",border:"none",background:B.danger,color:B.white,fontSize:11,lineHeight:"18px",cursor:"pointer",padding:0}}>×</button>
                  </div>
                )}
                <div style={{flex:1,minWidth:180}}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e=>handlePhotoFile(e.target.files && e.target.files[0])}
                    style={{...iS,padding:"6px 8px"}}
                  />
                  {uploading && <div style={{fontSize:11,color:B.muted,marginTop:4}}>Processing photo…</div>}
                  {uploadError && <div style={{fontSize:11,color:B.danger,marginTop:4}}>{uploadError}</div>}
                  <div style={{fontSize:10,color:B.muted,marginTop:4}}>Or paste a link instead:</div>
                  <input value={form.photo_url && form.photo_url.startsWith("data:") ? "" : (form.photo_url||"")} onChange={e=>setForm(f=>({...f,photo_url:e.target.value}))} style={{...iS,marginTop:4}} placeholder="https://..."/>
                </div>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={lS}>Notes</label>
              <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{...iS,height:60,resize:"vertical"}}/>
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={submitForm} style={btn()} disabled={saving}>{saving?"Saving…":"Save"}</button>
              <button onClick={()=>setShowForm(false)} style={btn(true)}>Cancel</button>
              {editingId && <button onClick={()=>deleteItem(editingId)} style={{...btn(),background:B.danger}}>Delete</button>}
            </div>
          </div>
        </div>
      )}

      <div style={{fontSize:11,color:B.muted,marginTop:"0.75rem"}}>Click any item to edit. Add more live during the walkthrough, from your phone.</div>
    </div>
  );
}

// ── Tasks ──────────────────────────────────────────────────────────────────
const ET={id:null,title:"",workstream:"",owner:"Jimmy",due:"",priority:"Medium",status:"Not Started",notes:""};
const taskStatusColor={"Not Started":B.muted,"In Progress":B.blue,"Complete":"#2a6b3f","Overdue":B.danger,"Blocked":B.danger};

function Tasks({tasks,setTasks,onSave,onDelete}){
  const mobile=useIsMobile();
  const [view,setView]=useState("calendar");
  const [form,setForm]=useState(null);
  const [filterOwners,setFilterOwners]=useState([]);
  const [filterStatuses,setFilterStatuses]=useState(TASK_STATUS_DISPLAY.filter(s=>s!=="Complete"));
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

  const filtered=enriched.filter(t=>(filterOwners.length===0||filterOwners.includes(t.owner))&&(filterStatuses.length===0||filterStatuses.includes(t.status)));

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

  return(
    <div style={{padding:"1rem 0"}}>
      <div style={g4(mobile)}>
        {[["Not Started",B.muted],["In Progress",B.blue],["Complete","#2a6b3f"],["Overdue",B.danger]].map(([s,c])=>(
          <div key={s} onClick={()=>setFilterStatuses(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])} style={{...SC(c),cursor:"pointer",outline:filterStatuses.includes(s)?`2px solid ${B.steel}`:"none",opacity:filterStatuses.length>0&&!filterStatuses.includes(s)?0.55:1}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{s}</div>
            <div style={{fontSize:mobile?22:28,fontWeight:700,color:B.white}}>{counts[s]}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        <MultiFilter label="Owner" options={OWNERS} selected={filterOwners} onChange={setFilterOwners}/>
        <MultiFilter label="Status" options={TASK_STATUS_DISPLAY} selected={filterStatuses} onChange={setFilterStatuses} colorMap={{"Not Started":B.muted,"In Progress":B.blue,"Complete":"#2a6b3f","Overdue":B.danger,"Blocked":B.danger}}/>
        <div style={{flex:1}}/>
        {!mobile&&<div style={{display:"flex",gap:0,border:`1px solid ${B.steel}`,borderRadius:4,overflow:"hidden"}}>
          {[["calendar","Calendar"],["table","Table"]].map(([v,label])=>(
            <button key={v} onClick={()=>setView(v)} style={{fontSize:11,padding:"7px 18px",background:view===v?B.navy:"transparent",color:view===v?B.white:B.muted,border:"none",cursor:"pointer",fontFamily:FONT,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>{label}</button>
          ))}
        </div>}
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
      {form&&(
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
      )}
    </div>
  );
}

// ── Import helpers ─────────────────────────────────────────────────────────
const LP_PORTAL_FIELDS=["bio","relationship","whatTheyCareAbout","howWeKnowThem","nextStep","linkedinUrl"];
const LN_PORTAL_FIELDS=["bio","dealsDone","minLoanSize","maxLoanSize","ltcAppetite","geographies","nextStep","linkedinUrl"];

// Generic TSV parser (existing)
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

// CSV parser (comma-separated, handles quoted fields, BOM, Windows/Mac/Unix line endings)
function parseCommaSV(text){
  // Strip BOM, normalize ALL line ending variants to \n
  let cleaned = text;
  if(cleaned.charCodeAt(0)===0xFEFF) cleaned=cleaned.slice(1); // BOM
  cleaned = cleaned.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const lines = cleaned.split('\n').filter(l=>l.trim());
  if(lines.length<2) return [];
  function splitLine(line){
    const result=[];let cur='';let inQ=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){inQ=!inQ;}
      else if(ch===','&&!inQ){result.push(cur.trim());cur='';}
      else{cur+=ch;}
    }
    result.push(cur.trim());
    return result;
  }
  const headers=splitLine(lines[0]).map(h=>h.replace(/^"|"$/g,'').trim());
  return lines.slice(1).map(line=>{
    const vals=splitLine(line);
    const obj={};
    headers.forEach((h,i)=>{obj[h]=(vals[i]||'').replace(/^"|"$/g,'').trim();});
    return obj;
  }).filter(r=>Object.values(r).some(v=>v));
}

function mapJSStatus(s){const l=s.toLowerCase();if(l==='closed')return'Committed';if(l==='contacted')return'Deck sent';if(l==='new')return'Deck sent';if(l.includes('commit'))return'Soft commit';if(l==='passed')return'Passed';return'Deck sent';}
function mapLenderStatus(s){const l=s.toLowerCase();if(l.includes('term sheet received'))return'Term sheet received';if(l.includes('term sheet'))return'Term sheet requested';if(l.includes('diligence'))return'In diligence';if(l.includes('commit'))return'Committed';if(l.includes('passed'))return'Passed';if(l.includes('target')||l.includes('outreach'))return'Outreach sent';return'Not contacted';}
function mapPriority(s){const l=(s||'').toLowerCase();if(l==='high')return'High';if(l==='low')return'Low';return'Medium';}
function mapTaskStatus(s){const l=(s||'').toLowerCase();if(l.includes('complete')||l==='done')return'Complete';if(l.includes('progress')||l.includes('active'))return'In Progress';if(l.includes('block'))return'Blocked';if(l.includes('overdue'))return'Overdue';return'Not Started';}
function mapLikelihood(s){const l=(s||'').toLowerCase().trim();if(l==='high')return'High';if(l==='low')return'Low';return'Medium';}

// ── Juniper Square CSV parser ──────────────────────────────────────────────
function parseJuniperSquareCSV(text, existing){
  const rawRows = parseCommaSV(text);
  if(rawRows.length===0) return [];
  // Normalize all keys once — strip BOM, trim whitespace
  const rows = rawRows.map(r => {
    const clean = {};
    Object.keys(r).forEach(k => { clean[k.replace(/^\uFEFF/,'').trim()] = r[k]; });
    return clean;
  }).filter(r => r['Contacts'] && r['Contacts'].trim());

  const seen = new Set();
  const incoming = [];
  const statusRank={'Deck sent':1,'Data room accessed':2,'In conversation':3,'Soft commit':4,'Committed':5,'Passed':0};

  rows.forEach(r => {
    const names = r['Contacts'].split(';').map(s=>s.trim()).filter(Boolean);
    const tag = (r['Tags']||'').trim();
    const likelihood = mapLikelihood(r['Likelihood']||'');
    const expected = parseFloat((r['Expected']||'').replace(/[$,\s]/g,''))||null;
    const dataRoom = (r['Data room']||'').trim();
    let status = mapJSStatus(r['Prospect Status']||'');
    if(dataRoom.toLowerCase().startsWith('accessed')) status = 'Data room accessed';

    names.forEach((name, idx) => {
      if(seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      const ex = existing.find(c=>c.type==='LP'&&c.name.toLowerCase()===name.toLowerCase());
      let finalStatus = status;
      if(ex && (statusRank[ex.status]||0) > (statusRank[status]||0)) finalStatus = ex.status;
      incoming.push({
        id: ex?.id || `lp-js-${r['Prospect ID']||Date.now()}-${idx}-${Math.random()}`,
        type:'LP', name, firm: r['Organization']||'', tag, likelihood,
        expectedAmount: idx===0 ? expected : null,
        status: finalStatus, priority:'Medium',
        title:'', email:'', phone:'', linkedinUrl:'',
        bio: ex?.bio||'', relationship: ex?.relationship||'',
        whatTheyCareAbout: ex?.whatTheyCareAbout||'',
        howWeKnowThem: ex?.howWeKnowThem||tag||'',
        nextStep: ex?.nextStep||'', notes: ex?.notes||'',
      });
    });
  });
  return incoming;
}

// ── HubSpot CSV parser ─────────────────────────────────────────────────────
// Expected columns: First Name, Last Name, Email, Phone Number,
//                   Lifecycle Stage, Lead Status, Company Name, Notes, etc.
function parseHubSpotCSV(text, existing){
  const rows = parseCommaSV(text).filter(r => r['First Name']||r['Last Name']||r['Email']);
  return rows.map(r => {
    const name = [r['First Name'],r['Last Name']].filter(Boolean).join(' ').trim() || r['Full Name']||r['Contact Name']||r['Email']||'Unknown';
    const email = r['Email']||r['Email Address']||'';
    const phone = r['Phone Number']||r['Phone']||'';
    const firm = r['Company Name']||r['Company']||r['Associated Company']||'';
    const notes = [r['Notes'],r['Latest Note'],r['Note']].filter(Boolean).join('\n').trim();
    const ex = existing.find(c=>c.type==='LP'&&(
      (email && c.email && c.email.toLowerCase()===email.toLowerCase()) ||
      c.name.toLowerCase()===name.toLowerCase()
    ));
    const base = {
      id: ex?.id || `lp-hs-${Date.now()}-${Math.random()}`,
      type:'LP', name, email, phone, firm,
      likelihood: ex?.likelihood||'Medium',
      status: ex?.status||'Deck sent',
      priority:'Medium', tag: ex?.tag||'',
      title:'', linkedinUrl:'', bio: ex?.bio||'',
      relationship: ex?.relationship||'', whatTheyCareAbout: ex?.whatTheyCareAbout||'',
      howWeKnowThem: ex?.howWeKnowThem||'', nextStep: ex?.nextStep||'',
      expectedAmount: ex?.expectedAmount||null,
      notes: notes || ex?.notes||'',
    };
    return ex ? {...ex,...base,bio:ex.bio||'',relationship:ex.relationship||'',whatTheyCareAbout:ex.whatTheyCareAbout||'',howWeKnowThem:ex.howWeKnowThem||'',nextStep:ex.nextStep||''} : base;
  });
}

// ── DocSend CSV parser ─────────────────────────────────────────────────────
// Actual columns: Created At, Name, Email, Likeliness, Amount, Link Name,
//                 Duration, % Completion, Link Owner, Content Version, Account
function parseDocSendCSV(text, existing){
  const rows = parseCommaSV(text).filter(r => r['Email']||r['Name']);
  // Parse duration string "H:MM:SS" or "M:SS" → total seconds
  function parseDuration(d){
    if(!d) return 0;
    const parts = d.split(':').map(Number);
    if(parts.length===3) return parts[0]*3600+parts[1]*60+parts[2];
    if(parts.length===2) return parts[0]*60+parts[1];
    return 0;
  }
  // Group by email — keep highest engagement per person
  const byEmail = {};
  rows.forEach(r => {
    const email = (r['Email']||'').toLowerCase().trim();
    const name = (r['Name']||'').trim()||email||'Unknown';
    const key = email||name.toLowerCase();
    const secs = parseDuration(r['Duration']);
    const pct = parseFloat(r['% Completion']||'0')||0;
    const engagement = secs + pct*60; // combined score
    if(!byEmail[key] || engagement > (byEmail[key]._engagement||0)){
      byEmail[key] = {...r, _name:name, _email:email, _engagement:engagement, _secs:secs, _pct:pct};
    }
  });
  return Object.values(byEmail).map(r => {
    const name = r._name;
    const email = r._email;
    const likelihood = mapLikelihood(r['Likeliness']||r['Likelihood']||'Medium');
    const expectedAmount = parseFloat((r['Amount']||'').replace(/[$,\s]/g,''))||null;
    const ex = existing.find(c=>c.type==='LP'&&(
      (email && c.email && c.email.toLowerCase()===email.toLowerCase()) ||
      c.name.toLowerCase()===name.toLowerCase()
    ));
    // Status: if they spent >30s or >50% completion → data room accessed
    let status = ex?.status||'Deck sent';
    const statusRank={'Deck sent':1,'Data room accessed':2,'In conversation':3,'Soft commit':4,'Committed':5,'Passed':0};
    const dsStatus = (r._secs>30||r._pct>0.5) ? 'Data room accessed' : 'Deck sent';
    if(!ex || (statusRank[dsStatus]||0) > (statusRank[status]||0)) status = dsStatus;
    if(ex && (statusRank[ex.status]||0) > (statusRank[status]||0)) status = ex.status;
    const base = {
      id: ex?.id||`lp-ds-${Date.now()}-${Math.random()}`,
      type:'LP', name, email,
      likelihood: ex?.likelihood||likelihood,
      expectedAmount: ex?.expectedAmount||expectedAmount,
      status,
      priority:'Medium',
      firm: ex?.firm||'', phone: ex?.phone||'', tag: ex?.tag||'',
      title:'', linkedinUrl:'', bio: ex?.bio||'',
      relationship: ex?.relationship||'', whatTheyCareAbout: ex?.whatTheyCareAbout||'',
      howWeKnowThem: ex?.howWeKnowThem||'', nextStep: ex?.nextStep||'',
      notes: ex?.notes||'',
    };
    return base;
  });
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

// ── Supabase: delete all LP contacts ──────────────────────────────────────
async function sbDeleteAllLPs(){
  // Fetch all LP contact IDs then delete each
  const res = await SB('contacts?type=eq.lp&select=id');
  if(!res.ok) throw new Error('Failed to fetch LP contacts for deletion');
  const rows = await res.json();
  await Promise.all(rows.map(r => sbDelete('contacts', r.id)));
  return rows.length;
}

// ── Import UI ──────────────────────────────────────────────────────────────
function Import({contacts,setContacts,tasks,setTasks,miles,setMiles,onSave}){
  const [jsText,setJsText]=useState('');
  const [hsText,setHsText]=useState('');
  const [dsText,setDsText]=useState('');
  const [lenderText,setLenderText]=useState('');
  const [taskText,setTaskText]=useState('');
  const [mileText,setMileText]=useState('');
  const [overrideMiles,setOverrideMiles]=useState(false);
  const [wipeLPs,setWipeLPs]=useState(false);
  const [results,setResults]=useState(null);
  const [running,setRunning]=useState(false);

  async function seedLPsNow(){
    setRunning(true);
    const log=[];
    try {
      // Delete all existing LPs first
      const deleted = await sbDeleteAllLPs();
      log.push(`🗑 Wiped ${deleted} existing LP contacts`);
      // Insert seed LPs
      await onSave("contacts", SEED_LPS);
      setContacts(prev=>[...prev.filter(c=>c.type==='Lender'),...SEED_LPS]);
      log.push(`✓ ${SEED_LPS.length} LP contacts loaded from built-in seed data`);
      log.push('  → Edit likelihood, expected amounts, and status directly in CRM');
    } catch(e){ log.push(`✗ Error: ${e.message}`); }
    setResults(log);
    setRunning(false);
  }

  async function runImport(){
    setRunning(true);
    const log=[];
    try{
      let newContacts=[...contacts];
      const lenders=contacts.filter(c=>c.type==='Lender');
      const existingLPs=contacts.filter(c=>c.type==='LP');

      // Wipe all LPs from Supabase if requested
      if(wipeLPs&&(jsText.trim()||hsText.trim()||dsText.trim())){
        const deleted = await sbDeleteAllLPs();
        log.push(`🗑 Wiped ${deleted} existing LP contacts from database`);
        newContacts=[...lenders]; // keep only lenders in memory
      }

      let mergedLPs = wipeLPs ? [] : existingLPs;

      // Juniper Square CSV
      if(jsText.trim()){
        const rawRows = parseCommaSV(jsText);
        const parsed = parseJuniperSquareCSV(jsText, mergedLPs);
        const firstKeys = rawRows.length > 0 ? Object.keys(rawRows[0]).join(' | ') : 'none';
        parsed.forEach(p=>{
          const idx=mergedLPs.findIndex(c=>c.name.toLowerCase()===p.name.toLowerCase());
          if(idx>=0) mergedLPs[idx]=p; else mergedLPs.push(p);
        });
        log.push(`✓ ${parsed.length} LP prospects parsed from Juniper Square (${rawRows.length} raw rows, keys: ${firstKeys})`);
      }

      // HubSpot CSV
      if(hsText.trim()){
        const parsed = parseHubSpotCSV(hsText, mergedLPs);
        parsed.forEach(p=>{
          const idx=mergedLPs.findIndex(c=>
            (p.email&&c.email&&c.email.toLowerCase()===p.email.toLowerCase())||
            c.name.toLowerCase()===p.name.toLowerCase()
          );
          if(idx>=0) mergedLPs[idx]={...mergedLPs[idx],...p,bio:mergedLPs[idx].bio||p.bio,nextStep:mergedLPs[idx].nextStep||p.nextStep};
          else mergedLPs.push(p);
        });
        log.push(`✓ ${parsed.length} contacts parsed from HubSpot`);
      }

      // DocSend CSV
      if(dsText.trim()){
        const parsed = parseDocSendCSV(dsText, mergedLPs);
        parsed.forEach(p=>{
          const idx=mergedLPs.findIndex(c=>
            (p.email&&c.email&&c.email.toLowerCase()===p.email.toLowerCase())||
            c.name.toLowerCase()===p.name.toLowerCase()
          );
          if(idx>=0) mergedLPs[idx]={...mergedLPs[idx],...p,bio:mergedLPs[idx].bio||'',nextStep:mergedLPs[idx].nextStep||''};
          else mergedLPs.push(p);
        });
        log.push(`✓ ${parsed.length} viewers parsed from DocSend`);
      }

      if(jsText.trim()||hsText.trim()||dsText.trim()){
        try {
          await onSave("contacts", mergedLPs);
          newContacts=[...lenders,...mergedLPs];
          setContacts(newContacts);
          log.push(`  → ${mergedLPs.length} total LP records now in system`);
          log.push('  → Bios, notes & next steps preserved on existing contacts');
        } catch(saveErr) {
          log.push(`✗ Save failed: ${saveErr.message}`);
        }
      }

      // Lender import (TSV)
      if(lenderText.trim()){
        const merged=mergeLenders(parseCSV(lenderText),newContacts);
        await onSave("contacts",merged.filter(c=>c.type==='Lender'));
        newContacts=[...newContacts.filter(c=>c.type==='LP'),...merged.filter(c=>c.type==='Lender')];
        setContacts(newContacts);
        log.push(`✓ ${merged.filter(c=>c.type==='Lender').length} lenders merged`);
      }

      if(taskText.trim()){
        const merged=mergeTasks(parseCSV(taskText),tasks);
        await onSave("tasks",merged);
        setTasks(merged);
        log.push(`✓ ${merged.length} tasks merged`);
      }
      if(mileText.trim()){
        const merged=mergeMilestones(parseCSV(mileText),miles,overrideMiles);
        await onSave("milestones",merged);
        setMiles(merged);
        log.push(overrideMiles?`✓ ${merged.length} milestones updated`:`✓ Milestones refreshed — manual date edits preserved`);
      }
      if(log.length===0) log.push('Nothing imported — paste at least one export above.');
    }catch(e){log.push(`✗ Error: ${e.message}`);}
    setResults(log);
    setRunning(false);
  }

  const box={width:'100%',minHeight:80,fontSize:12,fontFamily:'monospace',border:`1px solid ${B.steel}`,borderRadius:4,padding:'8px 10px',color:B.navy,resize:'vertical',boxSizing:'border-box'};
  const section=(label,val,setter,hint)=>(
    <div style={{marginBottom:'1.25rem'}}>
      <label style={{fontSize:11,color:B.muted,display:'block',marginBottom:4,letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:600}}>{label}</label>
      {hint&&<div style={{fontSize:11,color:B.muted,marginBottom:6}}>{hint}</div>}
      <textarea value={val} onChange={e=>setter(e.target.value)} placeholder="Paste exported data here — include the header row" style={box}/>
    </div>
  );

  return(
    <div style={{padding:'1.25rem 0',maxWidth:720}}>
      <div style={{background:"#e8f4ee",border:`1px solid #2a6b3f44`,borderRadius:8,padding:'12px 16px',marginBottom:'1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:"#2a6b3f"}}>Load contacts from built-in seed data</div>
          <div style={{fontSize:11,color:B.muted,marginTop:2}}>Wipes existing LPs and loads the 36 contacts from your Juniper Square + DocSend exports. Use this to get started immediately.</div>
        </div>
        <button onClick={seedLPsNow} disabled={running} style={{...btn(),background:"#2a6b3f",whiteSpace:'nowrap',flexShrink:0}}>{running?"Loading…":"Load seed contacts"}</button>
      </div>

      <div style={{background:B.danger+"11",border:`1px solid ${B.danger}33`,borderRadius:8,padding:'12px 16px',marginBottom:'1.5rem'}}>
        <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer'}}>
          <input type="checkbox" checked={wipeLPs} onChange={e=>setWipeLPs(e.target.checked)} style={{marginTop:2,flexShrink:0}}/>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:B.danger}}>Wipe & replace all LP contacts</div>
            <div style={{fontSize:11,color:B.muted,marginTop:2}}>Deletes all existing LP contacts from the database before importing. Lender contacts are untouched. Use this to start fresh from your exports.</div>
          </div>
        </label>
      </div>

      <div style={{fontSize:11,fontWeight:700,color:B.navy,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:"0.75rem"}}>LP Sources</div>
      {section('Juniper Square — LP Prospects (CSV)',jsText,setJsText,'Export from Juniper Square Prospects tab as CSV')}
      {section('HubSpot — Contacts (CSV)',hsText,setHsText,'Export from HubSpot Contacts → Actions → Export')}
      {section('DocSend — Visitors (CSV)',dsText,setDsText,'Export from DocSend document visitor list')}

      <div style={{fontSize:11,fontWeight:700,color:B.navy,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:"0.75rem",marginTop:"0.5rem"}}>Other</div>
      {section('Lender tracker — Google Sheet (TSV)',lenderText,setLenderText)}
      {section('Tasks — Google Sheet (TSV)',taskText,setTaskText)}
      <div style={{marginBottom:'1.25rem'}}>
        <label style={{fontSize:11,color:B.muted,display:'block',marginBottom:4,letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:600}}>Milestones — Google Sheet (TSV)</label>
        <textarea value={mileText} onChange={e=>setMileText(e.target.value)} placeholder="Paste exported data here — include the header row" style={box}/>
        {mileText.trim()&&(
          <label style={{display:'flex',alignItems:'center',gap:8,marginTop:6,fontSize:12,color:B.muted,cursor:'pointer'}}>
            <input type="checkbox" checked={overrideMiles} onChange={e=>setOverrideMiles(e.target.checked)}/>
            Also update milestone dates from sheet
          </label>
        )}
      </div>

      <button onClick={runImport} style={{...btn(),fontSize:13,padding:'10px 24px'}} disabled={running}>{running?"Importing…":"Run import"}</button>
      {results&&(
        <div style={{marginTop:'1rem',background:B.navy,borderRadius:8,padding:'1rem 1.25rem'}}>
          {results.map((r,i)=><div key={i} style={{fontSize:13,color:B.white,marginBottom:4,lineHeight:1.6}}>{r}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Budget (Sources & Uses) ────────────────────────────────────────────────
const OSLO_LINES=[
  {code:"017100",trade:"Survey and Layout",amount:14500},
  {code:"017400",trade:"Cleaning and Protection",amount:104872},
  {code:"018900",trade:"Site Requirements",amount:33400},
  {code:"024000",trade:"Demolition",amount:108190},
  {code:"030000",trade:"Cast-in-place Concrete",amount:179000},
  {code:"040000",trade:"Masonry",amount:133890},
  {code:"051000",trade:"Structural Steel",amount:124350},
  {code:"055000",trade:"Misc Metals",amount:130700},
  {code:"061000",trade:"Rough Carpentry",amount:299840},
  {code:"062000",trade:"Finish Carpentry",amount:113739},
  {code:"072100",trade:"Insulation",amount:101065},
  {code:"074600",trade:"Siding & Deck",amount:134275},
  {code:"075000",trade:"Roofing",amount:118029},
  {code:"078100",trade:"Fireproofing",amount:36550},
  {code:"079000",trade:"Joint Sealants",amount:14000},
  {code:"080000",trade:"Doors, Frames and Hardware",amount:139505},
  {code:"084000",trade:"Storefront",amount:8800},
  {code:"085000",trade:"Windows & Sliding Doors",amount:99729},
  {code:"088000",trade:"Interior Glazing",amount:19200},
  {code:"092000",trade:"Gypsum Board & Insulation",amount:148600},
  {code:"093000",trade:"Tile",amount:91728},
  {code:"096500",trade:"LVT Flooring",amount:83399},
  {code:"096800",trade:"Carpet Tile Flooring",amount:7763},
  {code:"099000",trade:"Painting",amount:89992},
  {code:"100000",trade:"Specialties",amount:23610},
  {code:"102800",trade:"Toilet Accessories",amount:13100},
  {code:"113100",trade:"Appliances",amount:43842},
  {code:"120000",trade:"Closets",amount:11850},
  {code:"122000",trade:"Window Treatments",amount:17100},
  {code:"123000",trade:"Cabinets",amount:47500},
  {code:"123600",trade:"Countertops",amount:52950},
  {code:"142000",trade:"Elevator",amount:130000},
  {code:"210000",trade:"Fire Protection",amount:114100},
  {code:"220000",trade:"Plumbing",amount:317850},
  {code:"220000",trade:"Plumbing Fixtures",amount:59382},
  {code:"230000",trade:"HVAC",amount:312000},
  {code:"260000",trade:"Electrical",amount:497700},
  {code:"260000",trade:"Light Fixtures & Lighting Control",amount:49645},
  {code:"274000",trade:"Low Voltage",amount:19950},
  {code:"310000",trade:"Earthwork",amount:75249},
  {code:"321000",trade:"Concrete & Asphalt Sitework",amount:113930},
  {code:"329000",trade:"Landscaping, Pavers & Irrigation",amount:74555},
  {code:"330000",trade:"Site Utilities",amount:115145},
];

const SEEK_LINES=[
  {phase:"Schematic Design",amount:20000,note:"Complete"},
  {phase:"Design Development",amount:62000,note:"$35k paid · $27k due Feb-26"},
  {phase:"Construction Documents",amount:80000,note:"$40k Mar-26 · $40k Apr-26"},
  {phase:"Permitting",amount:7000,note:"May-26"},
  {phase:"Construction Administration",amount:30000,note:"$3k/month × 10 months"},
  {phase:"Civil Engineering",amount:10000,note:"Consultant"},
  {phase:"MEP Engineering",amount:7000,note:"Consultant"},
  {phase:"Additional Architecture",amount:10000,note:"Consultant"},
];

const KEYS=21;
const GSF=14686;
const TOTAL_PROJECT=8433945; // original underwriting / committed Sources (debt + equity)
const DEBT=5903654;
const EQUITY=2530290;
const LP_TARGET=LP_EQUITY_TARGET;

// ── Costs to Date ──
// Source: "Construction Costs to Date - 115 Barton - 2026" workbook (Summary tab).
// Spent = Bill.com + Horizon *1633 activity through 10/8/26. Budget = original soft costs + current OSLO hard costs.
// Expected = forecast spend at completion. Variance = Budget minus Expected (negative = over budget).
const COST_ASOF="10/8/26";
const COST_SECTIONS=[
  {label:"Acquisition & Land",children:[
    {label:"115 N Barton",budget:470389,spent:459003.05,expected:459003.05},
    {label:"109 N Barton",budget:725700,spent:708032.02,expected:708032.02},
  ]},
  {label:"Hard Costs",children:[
    {label:"OSLO Hard Costs",budget:5666386,spent:0,expected:5666386},
    {label:"Hard Cost Contingency",budget:104183,spent:0,expected:0,note:"Expected assumes no draw"},
  ]},
  {label:"Soft Costs",open:true,children:[
    {label:"Architect (SEEK)",budget:170000,spent:171000,expected:200000,note:"Includes $30K CA moved from Project Management"},
    {label:"Interior Design (Rebel House)",budget:50000,spent:51948.75,expected:100000},
    {label:"Acquisition Fee",budget:23329,spent:13560,expected:23329},
    {label:"Permitting / Zoning",budget:35000,spent:50460,expected:92460,note:"Includes $42K remaining for water/sewer buy-in"},
    {label:"Other",budget:25000,spent:64079.71,expected:64079.71},
    {label:"Taxes / Insurance",budget:58918,spent:10817.31,expected:58918},
    {label:"Development Fee",budget:296453,spent:0,expected:296453},
    {label:"Project Management",budget:75000,spent:0,expected:45000,note:"$30K moved to SEEK"},
    {label:"Lender Legal / Appraisal",budget:25000,spent:35859.52,expected:35859.52,note:"All loan closing fees"},
    {label:"Signage",budget:20000,spent:0,expected:20000},
    {label:"Soft Cost Contingency",budget:73582,spent:0,expected:0,note:"Expected assumes no draw"},
  ]},
  {label:"FF&E & OS&E",children:[
    {label:"Furniture",budget:296118,spent:0,expected:296118},
    {label:"Fixtures",budget:30900,spent:0,expected:30900},
    {label:"Operating Supplies",budget:85106.87,spent:0,expected:85106.87},
    {label:"Freight / Storage / Install",budget:130807.20,spent:0,expected:130807.20},
  ]},
  {label:"Pre-Opening",children:[
    {label:"Operating Shortfall",budget:125000,spent:0,expected:125000},
    {label:"General Marketing",budget:25000,spent:0,expected:25000},
  ]},
  {label:"Interest Reserve & Loan Fees",children:[
    {label:"Loan Fees",budget:14500,spent:14812,expected:14500},
    {label:"Interest",budget:333122.04,spent:0,expected:333122.04},
  ]},
].map(sec=>({...sec,
  budget:sec.children.reduce((a,c)=>a+c.budget,0),
  spent:sec.children.reduce((a,c)=>a+c.spent,0),
  expected:sec.children.reduce((a,c)=>a+c.expected,0),
}));
const TOTAL_BUDGET=COST_SECTIONS.reduce((a,s)=>a+s.budget,0);
const TOTAL_SPENT=COST_SECTIONS.reduce((a,s)=>a+s.spent,0);
const TOTAL_EXPECTED=COST_SECTIONS.reduce((a,s)=>a+s.expected,0);
const TOTAL_USES=TOTAL_BUDGET;
const FUNDING_GAP=TOTAL_BUDGET-(DEBT+EQUITY);
const EXPECTED_GAP=TOTAL_EXPECTED-(DEBT+EQUITY);

// Prior OSLO trade-level detail (8/12/26). Sums to $5,686,444. Not yet updated to current $5,666,386.
const HARD_DETAIL_0812=[
                {label:"Permits",total:0},
                {label:"Winter Conditions Allowance",total:0},
                {label:"Survey and Layout",total:14500},
                {label:"Cleaning and Protection",total:104872},
                {label:"Site Requirements",total:33400},
                {label:"Demolition",total:51250},
                {label:"Cast-in-place Concrete",total:252209},
                {label:"Gypsum Floor Topping",total:0},
                {label:"Masonry",total:178666},
                {label:"Structural Steel",total:184500},
                {label:"Misc Metals",total:119127},
                {label:"Rough Carpentry",total:363005},
                {label:"Finish Carpentry",total:112664},
                {label:"Insulation",total:142000},
                {label:"Siding & Deck",total:181602},
                {label:"Roofing",total:117715},
                {label:"Fireproofing",total:0},
                {label:"Joint Sealants",total:0},
                {label:"Doors, Frames and Hardware",total:122922},
                {label:"Overhead Doors",total:0},
                {label:"Storefront",total:16168},
                {label:"Windows & Sliding Doors",total:87875},
                {label:"Interior Glazing",total:13138},
                {label:"Gypsum Board & Insulation",total:145546},
                {label:"EIFS & Scaffolding",total:77700},
                {label:"Tile",total:105267},
                {label:"LVT Flooring",total:61280},
                {label:"Carpet Tile Flooring",total:0},
                {label:"Painting",total:106885},
                {label:"Specialties",total:14445},
                {label:"Signage",total:5000},
                {label:"Toilet Accessories",total:10795},
                {label:"Fireplaces (infrastructure only — see Value Engineering)",total:0},
                {label:"Appliances",total:79073},
                {label:"Closets",total:11850},
                {label:"Window Treatments",total:36493},
                {label:"Cabinets",total:49750},
                {label:"Countertops",total:45689},
                {label:"Elevator",total:144000},
                {label:"Trash Chute",total:0},
                {label:"Fire Protection",total:157955},
                {label:"Plumbing",total:381800},
                {label:"Plumbing Fixtures",total:0},
                {label:"HVAC",total:354068},
                {label:"Electrical",total:525200},
                {label:"Light Fixtures & Lighting Control",total:134265},
                {label:"Low Voltage (infrastructure only — vendor TBD)",total:0},
                {label:"Earthwork",total:72750},
                {label:"Concrete & Asphalt Sitework",total:75843},
                {label:"Landscaping, Pavers & Irrigation",total:160105},
                {label:"Site Utilities",total:80500},
                {label:"General Conditions",total:295720},
                {label:"Insurance (1.00%)",total:52276},
                {label:"Overhead & Fee (2.75%)",total:145196},
                {label:"Construction Contingency (5.00%)",total:261380},
              ];

function Budget({committed}){
  const mobile=useIsMobile();
  const [openMap,setOpenMap]=useState(()=>Object.fromEntries(COST_SECTIONS.map(s=>[s.label,!!s.open])));
  const [hardOpen,setHardOpen]=useState(false);
  const toggle=l=>setOpenMap(m=>({...m,[l]:!m[l]}));
  const pKey=v=>fmt$(Math.round(v/KEYS));
  const pGSF=v=>"$"+(v/GSF).toFixed(2);
  const fmtVar=v=>{const r=Math.round(v);return r===0?"–":r<0?`(${fmt$(-r)})`:fmt$(r);};
  const varColor=v=>Math.round(v)<0?B.danger:Math.round(v)>0?"#2a6b3f":B.muted;
  const ColHead=({label})=><div style={{fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",textAlign:"right"}}>{label}</div>;
  const SU=({label,total,bold,indent,muted,pct})=>(
    <div style={{display:"grid",gridTemplateColumns:mobile?`30px 1fr 90px`:`40px 1fr 110px 90px 80px`,gap:8,padding:`${bold?"10px":"7px"} 14px`,borderBottom:`1px solid ${B.light}`,background:bold?B.offwhite:B.white,alignItems:"baseline"}}>
      <div style={{textAlign:"right",fontSize:10,color:B.muted}}>{pct||""}</div>
      <div style={{display:"flex",alignItems:"baseline"}}>
        {indent&&<span style={{display:"inline-block",width:16,flexShrink:0}}/>}
        <span style={{fontSize:bold?13:12,fontWeight:bold?700:400,color:muted?B.muted:B.navy}}>{label}</span>
      </div>
      <div style={{textAlign:"right",fontSize:bold?13:12,fontWeight:bold?700:400,color:muted?B.muted:B.navy}}>{fmt$(total)}</div>
      {!mobile&&<div style={{textAlign:"right",fontSize:11,color:B.muted}}>{pKey(total)}</div>}
      {!mobile&&<div style={{textAlign:"right",fontSize:11,color:B.muted}}>{pGSF(total)}</div>}
    </div>
  );
  const TotalBar=({label,amount})=>(
    <div style={{display:"grid",gridTemplateColumns:mobile?`1fr 90px`:`40px 1fr 110px 90px 80px`,gap:8,padding:"12px 14px",background:B.navy,alignItems:"center"}}>
      {!mobile&&<div/>}<span style={{fontSize:13,fontWeight:700,color:B.white,letterSpacing:"0.04em"}}>{label}</span>
      <span style={{textAlign:"right",fontSize:13,fontWeight:700,color:B.white}}>{fmt$(amount)}</span>
      {!mobile&&<span style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.6)"}}>{pKey(amount)}/key</span>}
      {!mobile&&<span style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.6)"}}>{pGSF(amount)}/sf</span>}
    </div>
  );
  // Costs-to-date grid
  const cols=mobile?"1fr 78px 78px 78px":"1fr 105px 105px 105px 105px";
  const CRow=({label,budget,spent,expected,note,bold,indent,onClick,open,dark})=>{
    const v=budget-expected;
    const fg=dark?B.white:B.navy;
    return(
      <div onClick={onClick} style={{display:"grid",gridTemplateColumns:cols,gap:8,padding:`${bold?"10px":"7px"} 14px`,borderBottom:`1px solid ${B.light}`,background:dark?B.navy:bold?B.offwhite:B.white,cursor:onClick?"pointer":"default",alignItems:"baseline"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:6,minWidth:0}}>
          {indent&&<span style={{display:"inline-block",width:12,flexShrink:0}}/>}
          <div style={{minWidth:0}}>
            <span style={{fontSize:bold?13:12,fontWeight:bold?700:400,color:fg}}>{label}</span>
            {onClick&&<span style={{fontSize:10,color:B.muted,marginLeft:6}}>{open?"▲":"▼"}</span>}
            {note&&<div style={{fontSize:10,color:B.muted,marginTop:2}}>{note}</div>}
          </div>
        </div>
        <div style={{textAlign:"right",fontSize:bold?13:12,fontWeight:bold?700:400,color:fg}}>{fmt$(Math.round(budget))}</div>
        <div style={{textAlign:"right",fontSize:bold?13:12,fontWeight:bold?700:400,color:dark?"rgba(255,255,255,0.8)":B.muted}}>{fmt$(Math.round(spent))}</div>
        <div style={{textAlign:"right",fontSize:bold?13:12,fontWeight:bold?700:400,color:fg}}>{fmt$(Math.round(expected))}</div>
        {!mobile&&<div style={{textAlign:"right",fontSize:bold?13:12,fontWeight:700,color:dark?(Math.round(v)<0?"#f0a0a0":"#a8d5b5"):varColor(v)}}>{fmtVar(v)}</div>}
      </div>
    );
  };
  const spentPct=TOTAL_SPENT/TOTAL_BUDGET;
  const overLines=COST_SECTIONS.flatMap(s=>s.children).filter(c=>c.budget-c.expected<-0.5).sort((a,b)=>(a.budget-a.expected)-(b.budget-b.expected));
  return(
    <div style={{padding:"1.25rem 0"}}>
      <div style={g4(mobile)}>
        {[
          ["Total Budget",fmt$(Math.round(TOTAL_BUDGET)),B.navy,"Incl. contingency"],
          ["Spent to Date",fmt$(Math.round(TOTAL_SPENT)),B.blue,`${(spentPct*100).toFixed(1)}% of budget · thru ${COST_ASOF}`],
          ["Expected at Completion",fmt$(Math.round(TOTAL_EXPECTED)),B.sage,`${fmtVar(TOTAL_BUDGET-TOTAL_EXPECTED)} vs budget`],
          ["Funding Gap",fmt$(Math.round(FUNDING_GAP)),FUNDING_GAP>0?B.danger:"#2a6b3f",`Budget vs Sources · ${fmt$(Math.round(EXPECTED_GAP))} on Expected`],
        ].map(([l,v,c,sub])=>(
          <div key={l} style={SC(c)}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
            <div style={{fontSize:mobile?15:20,fontWeight:700,color:B.white,lineHeight:1.2}}>{v}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.65)",marginTop:4}}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{marginBottom:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"0.75rem",flexWrap:"wrap",gap:6}}>
          <div style={{fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:B.muted,fontWeight:700}}>Uses · Budget vs. Costs to Date</div>
          <div style={{fontSize:11,color:B.muted}}>Spent through {COST_ASOF} · Variance = Budget less Expected</div>
        </div>
        <div style={{height:6,borderRadius:3,background:B.light,overflow:"hidden",marginBottom:"0.75rem"}}>
          <div style={{width:`${Math.min(100,spentPct*100)}%`,height:"100%",background:B.blue}}/>
        </div>
        <div style={{borderRadius:8,border:`1px solid ${B.steel}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:cols,gap:8,padding:"8px 14px",background:B.offwhite,borderBottom:`1px solid ${B.steel}`}}>
            <div/><ColHead label="Budget"/><ColHead label="Spent"/><ColHead label="Expected"/>{!mobile&&<ColHead label="Variance"/>}
          </div>
          {COST_SECTIONS.map(sec=>(
            <Fragment key={sec.label}>
              <CRow label={sec.label} budget={sec.budget} spent={sec.spent} expected={sec.expected} bold onClick={()=>toggle(sec.label)} open={openMap[sec.label]}/>
              {openMap[sec.label]&&sec.children.map(c=>(
                <CRow key={c.label} indent {...c}/>
              ))}
            </Fragment>
          ))}
          <CRow label="Total Uses" budget={TOTAL_BUDGET} spent={TOTAL_SPENT} expected={TOTAL_EXPECTED} bold dark/>
          <div style={{padding:"8px 14px",background:B.offwhite,fontSize:11,color:B.muted}}>
            Expected: {pKey(TOTAL_EXPECTED)}/key · {pGSF(TOTAL_EXPECTED)}/sf · {KEYS} keys · {GSF.toLocaleString()} GSF
          </div>
        </div>
        {overLines.length>0&&(
          <div style={{marginTop:"0.75rem",padding:"0.85rem 1rem",borderRadius:8,background:B.danger+"0d",border:`1px solid ${B.danger}33`}}>
            <div style={{fontSize:12,fontWeight:700,color:B.danger,marginBottom:4}}>Lines expected over budget: {fmt$(Math.round(-overLines.reduce((a,c)=>a+c.budget-c.expected,0)))}</div>
            <div style={{fontSize:11,color:B.navy,lineHeight:1.6}}>
              {overLines.map(c=>`${c.label} ${fmtVar(c.budget-c.expected)}`).join(" · ")}
            </div>
          </div>
        )}
      </div>

      <div style={{...g2(mobile),alignItems:"start",gap:mobile?"1rem":"1.5rem"}}>
        <div>
          <div style={{fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:B.muted,fontWeight:700,marginBottom:"0.75rem"}}>Sources</div>
          <div style={{borderRadius:8,overflow:"hidden",border:`1px solid ${B.steel}`}}>
            <div style={{display:"grid",gridTemplateColumns:mobile?`30px 1fr 90px`:`40px 1fr 110px 90px 80px`,gap:8,padding:"8px 14px",background:B.offwhite,borderBottom:`1px solid ${B.steel}`}}>
              <div/><div/><ColHead label="Total"/>{!mobile&&<ColHead label="Per Key"/>}{!mobile&&<ColHead label="Per SF"/>}
            </div>
            <SU label="Construction Debt" total={DEBT} bold pct="70%"/>
            <div style={{padding:"6px 14px 8px",borderBottom:`1px solid ${B.light}`,background:B.white}}>
              <div style={{fontSize:11,color:B.muted,paddingLeft:8}}>SOFR +2.95% · Floor 4.0% / Ceiling 10% · Loan fee 0.25% · 24 mo construction → 60 mo perm at 5-yr Treasury +2.50%</div>
            </div>
            <SU label="LP Equity (target)" total={LP_TARGET} bold pct="30%"/>
            <SU label="Committed to date" total={committed} pct={`${Math.round(committed/LP_TARGET*100)}%`} muted/>
            <SU label="Remaining to raise" total={Math.max(0,LP_TARGET-committed)} pct="" muted/>
            <TotalBar label="Total Sources" amount={DEBT+EQUITY}/>
          </div>
        </div>

        <div>
          <div style={{fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:B.muted,fontWeight:700,marginBottom:"0.75rem"}}>Returns Summary <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(Model v8, pre-update)</span></div>
          <div style={{borderRadius:8,overflow:"hidden",border:`1px solid ${B.steel}`}}>
            <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 60px 60px":"1fr 100px 80px 60px 60px",gap:8,padding:"8px 14px",background:B.offwhite,borderBottom:`1px solid ${B.steel}`}}>
              <div/>{!mobile&&<ColHead label="Cash Out"/>}{!mobile&&<ColHead label="Profit"/>}<ColHead label="IRR"/><ColHead label="MOIC"/>
            </div>
            {[
              ["Unlevered","(8,433,945)","13,340,350","14.52%","2.65x"],
              ["Levered","(2,530,290)","9,601,910","24.51%","3.78x"],
              ["Limited Partner","(3,108,666)","7,081,353","22.63%","3.28x"],
              ["Sponsor","(345,407)","2,520,557","34.73%","8.30x"],
            ].map(([label,out,profit,irr,moic])=>(
              <div key={label} style={{display:"grid",gridTemplateColumns:mobile?"1fr 60px 60px":"1fr 100px 80px 60px 60px",gap:8,padding:"9px 14px",borderBottom:`1px solid ${B.light}`,background:B.white}}>
                <span style={{fontSize:mobile?11:13,fontWeight:600,color:B.navy}}>{label}</span>
                {!mobile&&<span style={{textAlign:"right",fontSize:12,color:B.muted}}>{out}</span>}
                {!mobile&&<span style={{textAlign:"right",fontSize:12,color:"#2a6b3f",fontWeight:600}}>{profit}</span>}
                <span style={{textAlign:"right",fontSize:12,color:B.blue,fontWeight:600}}>{irr}</span>
                <span style={{textAlign:"right",fontSize:12,color:B.blue,fontWeight:600}}>{moic}</span>
              </div>
            ))}
            <div style={{padding:"8px 14px",background:B.offwhite}}>
              <div style={{fontSize:11,color:B.muted}}>Exit: May 2036 · 9.00% cap rate · $13,167,519 sale price · 9yr hold from operations. Based on $8,433,945 total cost and May 2027 opening; not yet rerun for current budget or Oct 2027 completion.</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{marginTop:"0.5rem"}}>
        <div onClick={()=>setHardOpen(o=>!o)} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:hardOpen?B.navy:B.light,cursor:"pointer",borderRadius:hardOpen?"8px 8px 0 0":8}}>
          <span style={{fontSize:12,fontWeight:600,color:hardOpen?B.white:B.navy}}>Reference: OSLO trade detail (8/12/26)<span style={{fontSize:10,fontWeight:400,marginLeft:8,opacity:0.7}}>Sums to $5,686,444. Current OSLO total $5,666,386. Line detail not yet updated.</span></span>
          <span style={{fontSize:11,color:hardOpen?"rgba(255,255,255,0.5)":B.muted}}>{hardOpen?"▲":"▼"}</span>
        </div>
        {hardOpen&&(
          <div style={{border:`1px solid ${B.steel}`,borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
            {HARD_DETAIL_0812.filter(r=>r.total>0).map((r,i)=>(
              <div key={r.label} style={{display:"grid",gridTemplateColumns:"1fr 110px",gap:8,padding:"6px 14px",borderBottom:`1px solid ${B.light}`,background:i%2?"#fafbfc":B.white}}>
                <span style={{fontSize:12,color:B.navy}}>{r.label}</span>
                <span style={{fontSize:12,color:B.navy,textAlign:"right"}}>{fmt$(r.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{marginTop:"1rem",fontSize:11,color:B.muted}}>
        Source: Construction Costs to Date workbook. Spent reflects Bill.com and Horizon *1633 activity through {COST_ASOF}. Budget = original soft costs + current OSLO hard costs. Expected assumes no contingency draw. Funding gap measured against committed Sources of {fmt$(DEBT+EQUITY)}.
      </div>
      {FUNDING_GAP>0 && (
        <div style={{marginTop:"0.75rem",padding:"0.85rem 1rem",borderRadius:8,background:B.danger+"12",border:`1px solid ${B.danger}44`}}>
          <div style={{fontSize:12,fontWeight:700,color:B.danger}}>Funding gap: {fmt$(Math.round(FUNDING_GAP))} on budget · {fmt$(Math.round(EXPECTED_GAP))} on expected spend</div>
          <div style={{fontSize:11,color:B.navy,marginTop:2}}>Total budget exceeds committed Sources (Debt + Equity). Value engineering, additional equity, or a reduced contingency need to close this before GMP is locked.</div>
        </div>
      )}
    </div>
  );
}

// ── Lender (Horizon) ───────────────────────────────────────────────────────
// Budget = what the current project budget / Model v8 (Horizon terms) carries.
// Horizon Original = Discussion Proposal dated 3/30/26.
// Horizon Final = Promissory Note dated 10/8/26 (draft), Construction Loan Agreement (draft 9/11/26), and Omnibus Rider (final form).
// Update the Final column when the fully executed set is received.
const LENDER_DOC_STATUS="Awaiting fully executed set. Final column reflects the 10/8/26 Note and 9/11/26 loan agreement (both marked draft) and the final-form Omnibus Rider.";
const LENDER_COLS=[
  {key:"budget",label:"Budget",sub:"Project budget / Model v8"},
  {key:"orig",label:"Horizon: Original",sub:"Discussion Proposal 3/30/26"},
  {key:"final",label:"Horizon: Final",sub:"Loan docs 10/8/26"},
];
const LENDER_ROWS=[
  {section:"Structure"},
  {label:"Status",budget:"Underwriting assumption",orig:"Proposal, not a commitment",final:"Closed 10/8/26 (executed set pending)"},
  {label:"Borrower",budget:"115 N Barton LLC",orig:"115 N Barton LLC",final:"115 N Barton LLC (sole member NB Expansion GP Fund LLC)"},
  {label:"Loan amount",budget:fmt$(DEBT),orig:fmt$(5925000),final:fmt$(5925000),bflag:`${fmt$(5925000-DEBT)} below the loan`},
  {label:"LTC / LTV",chg:1,budget:"70% LTC",orig:"70.3% LTC / 60% LTV",final:"70% LTV tested at conversion to perm only, 30-day cure"},
  {label:"Total project cost",budget:`${fmt$(Math.round(TOTAL_BUDGET))} (current budget)`,orig:"—",final:"$8,500,000 Approved Budget. Overrun is not a default if Borrower funds the shortfall."},
  {label:"Equity required",chg:1,budget:fmt$(EQUITY),orig:"Min $2,500,000",final:"$2,575,000. Lender may not require more than $2.5M as a funding condition."},
  {section:"Construction phase"},
  {label:"Rate",chg:1,budget:"—",orig:"SOFR + 2.95%",final:"1-Month Term SOFR + 2.75%"},
  {label:"Floor / ceiling",chg:1,budget:"—",orig:"4.00% / 10.00%",final:"4.00% / 7.10%"},
  {label:"Rate resets",chg:1,budget:"—",orig:"Monthly",final:"Quarterly (Rider)"},
  {label:"Initial rate",budget:"—",orig:"6.63% (3/30 quote)",final:"6.664% (SOFR 3.914% + 2.75%)"},
  {label:"Period",budget:"24 months",orig:"24 months",final:"24 monthly IO payments from 11/8/26. Draws allowed first 24 months."},
  {label:"Payments",budget:"Interest only",orig:"Interest only on balance drawn",final:"Interest only on balance drawn. Actual/360."},
  {label:"Budgeted interest",budget:"$333,122",orig:"—",final:"—"},
  {label:"Completion date",budget:`SC ${fmtD(SC_CURRENT)} (Oslo 10/14)`,orig:"—",final:"9/16/28, extended day-for-day for Excusable Delay (120-day cap)"},
  {section:"Permanent phase"},
  {label:"Rate",budget:"—",orig:"5-yr Treasury + 2.50%",final:"5-yr Treasury + 2.50%"},
  {label:"Floor / ceiling",budget:"—",orig:"6.00% / none",final:"6.00% floor. Note sets initial rate at 7.10% (index + margin = 7.56%). Confirm whether the 7.10% cap applies.",flag:"Ambiguous ceiling"},
  {label:"Term",budget:"60 months",orig:"60 months",final:"59 monthly P&I payments from 11/8/28, balloon 10/8/33"},
  {label:"Payments",budget:"—",orig:"P&I or seasonal (Jun to Oct), IO remaining months",final:"Fixed monthly P&I of $43,401.17. No seasonal option.",flag:"Seasonal option not in Note"},
  {label:"Amortization",chg:1,budget:"25 years",orig:"25 years",final:"Payment implies ~23.5 years (likely 25 years from Note date incl. IO period)"},
  {label:"Balloon",budget:"—",orig:"—",final:"$5,404,123.67 on 10/8/33"},
  {section:"Fees & prepayment"},
  {label:"Loan fee",budget:"$14,500",orig:"0.25%",final:"$14,812 (0.25%)"},
  {label:"Prepayment",chg:1,budget:"—",orig:"3% yr 1, 2%/yr after. 20% of original balance free per year.",final:"Same schedule (3% yr 1, 2% yrs 2 to 7, 20% free) but only on a refinance with another bank. Sale, equity, Horizon refi, DSCR/LTV cures are penalty-free."},
  {label:"Non-Horizon perm fee",budget:"—",orig:"—",final:"1% fee deleted by Rider"},
  {label:"Late / default",budget:"—",orig:"—",final:"Late fee 5% (min $50). Default rate +3%. 10-day grace once per 12 months."},
  {section:"Covenants & security"},
  {label:"DSCR covenant",budget:"1.45x at stabilization (model)",orig:"1.30x at stabilization",final:"1.30x at 12/31/28, 1.40x at 12/31/29, 1.50x at 12/31/30+. EBITDA / scheduled P&I, per tax returns. 30-day cure by paydown.",flag:"Steps to 1.50x, above model"},
  {label:"Payment guaranty",chg:1,budget:"—",orig:"Jonathan Gordon",final:"Jonathan Gordon, unlimited, limited to this loan (Rider)"},
  {label:"Completion guaranty",budget:"—",orig:"—",final:"Oslo Builders, LLC"},
  {label:"Security",chg:1,budget:"—",orig:"1st mortgage on 109 + 115 N Barton, all business assets",final:"1st mortgage and assignment of rents on 109 + 115 N Barton, all business assets. No cross-collateralization (Rider)."},
  {label:"Change orders",budget:"—",orig:"—",final:"No lender consent up to $50K each / $250K aggregate if funded from contingency or savings"},
  {label:"Deposit requirement",budget:"—",orig:"Primary depository accounts at Horizon",final:"Principal deposit accounts at Horizon"},
  {label:"Financial reporting",budget:"—",orig:"Annual tax returns, quarterly financials",final:"Annual tax returns and PFS for Jonathan. No audit or GAAP required (Rider)."},
  {label:"Governing law",budget:"—",orig:"—",final:"Indiana, venue LaPorte County. Michigan for lien matters."},
];
const LENDER_WATCH=[
  ["DSCR steps up to 1.50x by 12/31/30.","Model shows 1.45x at stabilization. Cure by paydown is available, penalty-free."],
  ["No seasonal payment option.","Term payments are a fixed $43,401.17/mo, including winter months."],
  ["Term-phase ceiling is unclear.","Note computes the initial perm rate at 7.10% though index plus margin is 7.56%. Confirm with counsel."],
  ["Approved Budget is $8.5M.",`Current budget is ${fmt$(Math.round(TOTAL_BUDGET))}. Not a default if the shortfall is funded.`],
];

function LenderMatrix() {
  const mobile=useIsMobile();
  const cellCol=(r,c)=>{
    if(c==="final"&&r.flag) return B.danger;
    if(r[c]==="—") return B.muted;
    return B.navy;
  };
  return (
    <div style={{padding:"1.25rem 0"}}>
      <div style={g4(mobile)}>
        {[
          ["Loan amount",fmt$(5925000),B.navy,"Note dated 10/8/26"],
          ["Construction rate","SOFR + 2.75%",B.blue,"6.664% initial · 4.00% floor / 7.10% cap"],
          ["Perm payment","$43,401/mo",B.sage,"From 11/8/28 · balloon 10/8/33"],
          ["DSCR covenant","1.30x → 1.50x",B.danger,"12/31/28 → 12/31/30 · model 1.45x"],
        ].map(([l,v,c,sub])=>(
          <div key={l} style={SC(c)}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
            <div style={{fontSize:mobile?15:20,fontWeight:700,color:B.white,lineHeight:1.2}}>{v}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.65)",marginTop:4}}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom:"1rem",padding:"0.75rem 1rem",borderRadius:8,background:B.gold+"18",border:`1px solid ${B.gold}55`,fontSize:11,color:B.navy}}>
        <b>Document status:</b> {LENDER_DOC_STATUS}
      </div>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:"1.25rem"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:mobile?760:900}}>
            <thead>
              <tr style={{background:B.navy}}>
                <th style={{padding:"10px 16px",textAlign:"left",fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.6)",letterSpacing:"0.06em",textTransform:"uppercase",width:mobile?120:170,position:"sticky",left:0,background:B.navy,zIndex:1}}>Term</th>
                {LENDER_COLS.map(c=>(
                  <th key={c.key} style={{padding:"10px 16px",textAlign:"left",borderLeft:"1px solid rgba(255,255,255,0.1)",width:c.key==="final"?"38%":"25%",background:c.key==="final"?"rgba(255,255,255,0.08)":undefined}}>
                    <div style={{fontSize:12,fontWeight:700,color:B.white}}>{c.label}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:400,marginTop:3}}>{c.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LENDER_ROWS.map((r,ri)=>r.section?(
                <tr key={"s"+ri} style={{background:B.light}}>
                  <td colSpan={4} style={{padding:"7px 16px",fontSize:10,fontWeight:700,color:B.navy,letterSpacing:"0.08em",textTransform:"uppercase",position:"sticky",left:0}}>{r.section}</td>
                </tr>
              ):(
                <tr key={r.label+ri} style={{background:B.white,borderBottom:`1px solid ${B.light}`,verticalAlign:"top"}}>
                  <td style={{padding:"8px 16px",color:B.navy,fontWeight:600,position:"sticky",left:0,background:B.white,borderRight:`1px solid ${B.steel}`}}>{r.label}</td>
                  {LENDER_COLS.map(c=>{
                    const changed=c.key==="final"&&r.chg;
                    return(
                      <td key={c.key} style={{padding:"8px 16px",borderLeft:`1px solid ${B.light}`,color:cellCol(r,c.key),lineHeight:1.5,background:c.key==="final"?"#fafbfc":undefined}}>
                        {r[c.key]}
                        {c.key==="final"&&r.flag&&<div style={{fontSize:10,fontWeight:700,color:B.danger,marginTop:3}}>⚑ {r.flag}</div>}
                        {c.key==="final"&&changed&&!r.flag&&<div style={{fontSize:10,color:"#8a6d1f",marginTop:3}}>Changed from original</div>}
                        {c.key==="budget"&&r.bflag&&<div style={{fontSize:10,fontWeight:700,color:B.danger,marginTop:3}}>⚑ {r.bflag}</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={card}>
        <div style={{fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:B.muted,fontWeight:700,marginBottom:"0.75rem"}}>Watch items</div>
        {LENDER_WATCH.map(([h,d])=>(
          <div key={h} style={{padding:"7px 0",borderBottom:`1px solid ${B.light}`,fontSize:12,color:B.navy}}>
            <b>{h}</b> <span style={{color:B.muted}}>{d}</span>
          </div>
        ))}
      </div>
      <div style={{marginTop:"0.75rem",fontSize:11,color:B.muted}}>
        Contact: Stacey Stephens, Horizon Bank · (269) 925-0114 · sstephens@horizonbank.com · Loan No. 9910000838
      </div>
    </div>
  );
}

// ── Risks ──────────────────────────────────────────────────────────────────
const RISK_LIKELIHOOD = ["Low", "Medium", "High"];
const RISK_IMPACT = ["Low", "Medium", "High"];
const RISK_CATEGORIES = ["Market", "Construction", "Financial", "Regulatory", "Operational", "Environmental"];

const DEFAULT_RISKS = [
  { id: "r-1", category: "Financial", description: "LP equity raise falls short of $3.33M target, forcing deal restructure or delay", likelihood: "Medium", impact: "High", mitigation: "Maintain warm pipeline of 10+ prospects; GP has capacity to bridge short gaps via bridge equity or mezz", owner: "Jimmy", status: "Open" },
  { id: "r-2", category: "Financial", description: "Interest rate increases beyond SOFR ceiling, compressing returns below model projections", likelihood: "Low", impact: "Medium", mitigation: "Horizon term sheet includes 10% ceiling; model stress-tested at +150bps. Locking rate at construction close.", owner: "Jonathan", status: "Open" },
  { id: "r-3", category: "Construction", description: "Hard cost overruns beyond 5% contingency ($244,975) due to material/labor inflation", likelihood: "Medium", impact: "High", mitigation: "OSLO GMP contract caps exposure. 5% contingency + GP co-invest buffer. Monthly draw reviews.", owner: "Jimmy", status: "Open" },
  { id: "r-4", category: "Construction", description: "Construction timeline delay beyond 24-month window, triggering loan maturity issues", likelihood: "Medium", impact: "High", mitigation: "Horizon allows construction extension provisions. Contractor approval process underway. Buffer in schedule.", owner: "Jimmy", status: "Open" },
  { id: "r-5", category: "Regulatory", description: "Permitting delays from city of Barton hold up construction start beyond Q3 2026", likelihood: "Medium", impact: "Medium", mitigation: "Architect leading permit process. Zoning confirmed. Budget includes $30k permit allowance. Early submission planned.", owner: "Jackson", status: "Open" },
  { id: "r-6", category: "Market", description: "Competitive hotel supply increases in market, compressing ADR and occupancy at stabilization", likelihood: "Low", impact: "Medium", mitigation: "Boutique positioning differentiates from chain supply. Market study confirmed underserved niche. 9yr hold reduces short-term exposure.", owner: "Jonathan", status: "Open" },
  { id: "r-7", category: "Market", description: "Macro recession reduces travel demand before stabilization (May 2027 target)", likelihood: "Low", impact: "High", mitigation: "Pre-opening reserve ($75k) covers 6-month shortfall. 1.30x DSCR covenant provides buffer. Seasonal flexibility built into loan.", owner: "Jonathan", status: "Open" },
  { id: "r-8", category: "Operational", description: "Key person risk — loss of GP team member disrupts project execution during construction", likelihood: "Low", impact: "Medium", mitigation: "Responsibilities documented and distributed across Jimmy, Jonathan, Jackson. PM contract ($75k) backstops execution.", owner: "Jimmy", status: "Open" },
  { id: "r-9", category: "Environmental", description: "Environmental review reveals contamination on 109 Barton site, delaying close or requiring remediation", likelihood: "Low", impact: "High", mitigation: "Horizon requires environmental review prior to close. Phase I ordered. Escrow holdback negotiated in purchase.", owner: "Matt", status: "Open" },
  { id: "r-10", category: "Financial", description: "DSCR falls below 1.30x covenant in first operating year, triggering Horizon default provisions", likelihood: "Low", impact: "High", mitigation: "Model shows 1.45x at stabilization. Seasonal P&I option reduces off-season obligations. $75k operating shortfall reserve.", owner: "Jonathan", status: "Open" },
];

const RISK_LIKELIHOOD_COLOR = { "Low": "#2a6b3f", "Medium": B.gold, "High": B.danger };
const RISK_IMPACT_COLOR = { "Low": B.sage, "Medium": B.gold, "High": B.danger };
const RISK_SCORE = { "Low": 1, "Medium": 2, "High": 3 };
const scoreColor = score => score >= 6 ? B.danger : score >= 3 ? B.gold : "#2a6b3f";
const scoreLabel = score => score >= 6 ? "Critical" : score >= 4 ? "High" : score >= 3 ? "Medium" : "Low";

const ER = { id: null, category: "Market", description: "", likelihood: "Medium", impact: "Medium", mitigation: "", owner: "Jimmy", status: "Open" };

function Risks({ risks, setRisks, onSave, onDelete }) {
  const mobile=useIsMobile();
  const [form, setForm] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const [saving, setSaving] = useState(false);

  const enriched = risks.map(r => ({ ...r, score: RISK_SCORE[r.likelihood] * RISK_SCORE[r.impact] }));
  const filtered = enriched.filter(r => (filterCat === "All" || r.category === filterCat) && r.status !== "Closed");
  const closed = enriched.filter(r => r.status === "Closed");
  const criticalCount = enriched.filter(r => r.score >= 6 && r.status !== "Closed").length;
  const highCount = enriched.filter(r => r.score >= 4 && r.score < 6 && r.status !== "Closed").length;

  async function saveRisk(f) {
    setSaving(true);
    try {
      const n = { ...f };
      const ex = risks.find(r => r.id === n.id);
      const updated = ex ? risks.map(r => r.id === n.id ? n : r) : [...risks, n];
      await onSave("risks", [n]);
      setRisks(updated);
      setForm(null);
    } finally { setSaving(false); }
  }

  async function deleteRisk(id) {
    setSaving(true);
    try {
      await onDelete("risks", id);
      setRisks(risks.filter(r => r.id !== id));
      setForm(null);
    } finally { setSaving(false); }
  }

  const RiskRow = ({ r }) => {
    const sc = r.score;
    return (
      <div onClick={() => setForm({ ...r })} style={{ ...card, cursor: "pointer", padding: "12px 16px", display: "grid", gridTemplateColumns: mobile?"1fr 60px 80px":"1fr 80px 80px 72px 100px", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Badge label={r.category} color={B.blue} />
            <span style={{ fontSize: 13, fontWeight: 600, color: B.navy }}>{r.description}</span>
          </div>
          <div style={{ fontSize: 11, color: B.muted, lineHeight: 1.5 }}>
            <span style={{ color: B.sage }}>↳ Mitigation:</span> {r.mitigation}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: B.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Likelihood</div>
          <Badge label={r.likelihood} color={RISK_LIKELIHOOD_COLOR[r.likelihood]} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: B.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Impact</div>
          <Badge label={r.impact} color={RISK_IMPACT_COLOR[r.impact]} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: B.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Score</div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: scoreColor(sc), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: B.white, margin: "0 auto" }}>{sc}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: B.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Owner</div>
          <div style={{ fontSize: 12, color: B.navy, fontWeight: 600 }}>{r.owner}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "1.25rem 0" }}>
      <div style={g4(mobile)}>
        {[
          ["Total Risks", risks.filter(r => r.status !== "Closed").length, B.navy],
          ["Critical (score ≥ 6)", criticalCount, criticalCount > 0 ? B.danger : "#2a6b3f"],
          ["High (score 4–5)", highCount, highCount > 0 ? B.gold : "#2a6b3f"],
          ["Mitigated / Closed", closed.length, B.sage],
        ].map(([l, v, c]) => (
          <div key={l} style={SC(c)}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: mobile?22:28, fontWeight: 700, color: B.white }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ ...card, marginBottom: "1.25rem" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: B.muted, fontWeight: 600, marginBottom: "0.75rem" }}>Risk Heat Map</div>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr", gap: 4 }}>
          <div />
          {["Low Impact", "Medium Impact", "High Impact"].map(l => (
            <div key={l} style={{ fontSize: 10, color: B.muted, textAlign: "center", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", paddingBottom: 4 }}>{l}</div>
          ))}
          {["High", "Medium", "Low"].map(likelihood => (
            <>
              <div key={likelihood + "-label"} style={{ fontSize: 10, color: B.muted, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>{likelihood}</div>
              {["Low", "Medium", "High"].map(impact => {
                const score = RISK_SCORE[likelihood] * RISK_SCORE[impact];
                const cellRisks = enriched.filter(r => r.likelihood === likelihood && r.impact === impact && r.status !== "Closed");
                const bg = score >= 6 ? B.danger + "22" : score >= 4 ? B.gold + "22" : "#2a6b3f22";
                const border = score >= 6 ? B.danger : score >= 4 ? B.gold : "#2a6b3f";
                return (
                  <div key={impact} style={{ background: bg, border: `1px solid ${border}44`, borderRadius: 6, padding: "10px 12px", minHeight: 56 }}>
                    {cellRisks.length === 0
                      ? <div style={{ fontSize: 11, color: B.muted + "88", textAlign: "center", paddingTop: 6 }}>—</div>
                      : cellRisks.map(r => (
                        <div key={r.id} onClick={() => setForm({ ...r })} style={{ fontSize: 11, color: B.navy, fontWeight: 600, marginBottom: 4, cursor: "pointer", lineHeight: 1.3 }}>
                          <Pip color={border} />{r.category}
                        </div>
                      ))
                    }
                  </div>
                );
              })}
            </>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          {[["Critical (≥6)", B.danger], ["High (4–5)", B.gold], ["Low–Medium (≤3)", "#2a6b3f"]].map(([l, c]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: B.muted }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" }} />{l}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...iS, width: "auto" }}>
          <option>All</option>
          {RISK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => setForm({ ...ER, id: `r-${Date.now()}` })} style={btn()}>+ Add risk</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...filtered].sort((a, b) => b.score - a.score).map(r => <RiskRow key={r.id} r={r} />)}
      </div>
      {closed.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontSize: 11, color: B.muted, letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.75rem" }}>Mitigated / Closed ({closed.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {closed.map(r => (
              <div key={r.id} onClick={() => setForm({ ...r })} style={{ ...card, padding: "10px 16px", cursor: "pointer", opacity: 0.6, display: "flex", alignItems: "center", gap: 12 }}>
                <Badge label={r.category} color={B.muted} />
                <span style={{ fontSize: 13, color: B.muted, flex: 1 }}>{r.description}</span>
                <Badge label="Closed" color="#2a6b3f" />
              </div>
            ))}
          </div>
        </div>
      )}
      {form && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(2,29,43,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ ...card, width: 560, maxWidth: "92vw", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: B.navy, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "1rem" }}>
              {risks.find(r => r.id === form.id) ? "Edit risk" : "New risk"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
              <div><label style={lS}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={iS}>
                  {RISK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={lS}>Owner</label>
                <select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} style={iS}>
                  {OWNERS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div><label style={lS}>Likelihood</label>
                <select value={form.likelihood} onChange={e => setForm(f => ({ ...f, likelihood: e.target.value }))} style={iS}>
                  {RISK_LIKELIHOOD.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div><label style={lS}>Impact</label>
                <select value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} style={iS}>
                  {RISK_IMPACT.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div><label style={lS}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={iS}>
                  {["Open", "Monitoring", "Closed"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: scoreColor(RISK_SCORE[form.likelihood] * RISK_SCORE[form.impact]), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: B.white, marginRight: 10 }}>
                  {RISK_SCORE[form.likelihood] * RISK_SCORE[form.impact]}
                </div>
                <div><div style={{ fontSize: 12, fontWeight: 700, color: B.navy }}>{scoreLabel(RISK_SCORE[form.likelihood] * RISK_SCORE[form.impact])}</div><div style={{ fontSize: 11, color: B.muted }}>Risk score</div></div>
              </div>
              <div style={{ gridColumn: "span 2" }}><label style={lS}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...iS, resize: "vertical" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}><label style={lS}>Mitigation strategy</label>
                <textarea value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} rows={3} style={{ ...iS, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => saveRisk(form)} style={btn()} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button onClick={() => setForm(null)} style={btn(true)}>Cancel</button>
              </div>
              {risks.find(r => r.id === form.id) && <button onClick={() => deleteRisk(form.id)} style={{ ...btn(), background: B.danger }} disabled={saving}>Delete</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Capital Timing ─────────────────────────────────────────────────────────
const COMMITTED_EQUITY = LP_EQUITY_COMMITTED;
const EQUITY_TARGET = LP_EQUITY_TARGET;
const REMAINING_RAISE = LP_EQUITY_REMAINING; // $343,724 — updated June 2 2026
const BARTON_109_PRICE = 680000;
const BARTON_109_DEPOSIT = 25000;
const BARTON_109_CLOSING = 14000;
const BARTON_109_DUE = BARTON_109_PRICE - BARTON_109_DEPOSIT + BARTON_109_CLOSING; // $669,000

const TRANCHE_1 = REMAINING_RAISE; // $343,724 — remaining raise as of June 2
const TRANCHE_2 = 0;

const CASH_FLOWS = [
  { week:"May 11",    date:"May 11",   label:"Horizon site visit",           inflow:0,               outflow:0,               category:"",           notes:"Present sequencing. Confirm loan close timing, permit requirements, and day-one land draw mechanics."},
  { week:"May 12",    date:"May 12",   label:"Entitlements hearing",         inflow:0,               outflow:0,               category:"",           notes:"Plan commission vote. 99% approval rate. Clears path to City Council ratification and CD work."},
  { week:"May 13",    date:"May 13",   label:"SEEK starts CDs",              inflow:0,               outflow:0,               category:"",           notes:"6–8 week construction documents period begins. Best case completion: June 24. Latest: July 7."},
  { week:"May 18",    date:"May 18",   label:"City Council ratification",    inflow:0,               outflow:0,               category:"",           notes:"City Council ratifies Planning Commission approval. Meeting May 18 — just 6 days after PC vote."},
  { week:"May 20",    date:"May 20",   label:"Subscription docs + OA distributed", inflow:0,            outflow:0,               category:"",           notes:"LPs and Co-GPs receive subscription documents and updated Operating Agreement."},
  { week:"May 22",    date:"May 22",   label:"Confirm capital commitments",        inflow:0,            outflow:0,               category:"",           notes:"All LP and Co-GP commitments confirmed. Sets stage for subscription signing June 5."},
  { week:"Jun 5",     date:"Jun 5",    label:"Subscription docs signed + capital wired", inflow:TRANCHE_1, outflow:0,            category:"equity",     notes:`$${(TRANCHE_1/1000).toFixed(0)}k — full remaining LP raise wired June 5. Completes $2.5M equity stack. Funds 109 Barton close and all pre-construction costs.`},
  { week:"Jun 12",    date:"Jun 12",   label:"SEEK — CD first half",         inflow:0,               outflow:32000,           category:"soft",       notes:"Construction Documents first half — $32k. Paid from capital wired June 5."},
  { week:"Mid June",  date:"Jun 15",   label:"109 Barton close",             inflow:0,               outflow:BARTON_109_DUE,  category:"land",       notes:"$680k purchase price less $25k hard deposit in escrow + ~$14k closing costs = $669k due at close. Timed so lot combo records by ~June 24–26, aligning with CD completion."},
  { week:"Mid June",  date:"Jun 16",   label:"Lot combination filed",        inflow:0,               outflow:0,               category:"",           notes:"Filed day after 109 Barton close. 7–10 days to record — targets June 23–26, aligning with SEEK CD completion."},
  { week:"Mid June",  date:"Jun 20",   label:"Appraisal + environmental",    inflow:0,               outflow:25000,           category:"soft",       notes:"Independent appraisal (min 70% LTV as-complete) + Phase I environmental. Required by Horizon before close."},
  { week:"Late June", date:"Jun 26",   label:"SEEK CDs complete",            inflow:0,               outflow:0,               category:"",           notes:"Construction Documents complete (best case, 6 weeks). Latest July 7 if 8 weeks. Permit set ready to submit."},
  { week:"Late June", date:"Jun 26",   label:"Lot combination recorded",     inflow:0,               outflow:0,               category:"",           notes:"~7–10 days after June 16 filing. Aligns with CD completion. Permit can now be submitted."},
  { week:"Late June", date:"Jun 27",   label:"Permit submitted",             inflow:0,               outflow:30000,           category:"soft",       notes:"Building permit submitted. Requires: CDs complete + owned parcel + combined lot. 6–8 week review clock starts."},
  { week:"Early July",date:"Jul 7",    label:"Construction loan closes",     inflow:5925000,         outflow:0,               category:"loan",       notes:"Horizon funds $5.925M. Day-one draw reimburses 109 Barton acquisition. Full $2.5M equity stack confirmed in."},
  { week:"Early July",date:"Jul 7",    label:"109 Barton bridge reimbursed", inflow:0,               outflow:TRANCHE_1,       category:"land",       notes:`Horizon day-one draw repays $${(TRANCHE_1/1000).toFixed(0)}k Tranche 1 bridge. Net cost to Co-GPs: zero.`},
  { week:"July",      date:"Jul 17",   label:"SEEK — CD second half",        inflow:0,               outflow:48000,           category:"soft",       notes:"Construction Documents second half — $48k due July 17."},
  { week:"July",      date:"Jul 31",   label:"SEEK — Permitting",            inflow:0,               outflow:7000,            category:"soft",       notes:"SEEK Permitting phase — $7k due July 31."},
  { week:"Mid Aug",   date:"Aug 15",   label:"Permit approved",              inflow:0,               outflow:0,               category:"",           notes:"~7 weeks after June 27 submission (best case). Latest early September if 8-week review."},
  { week:"Late Aug",  date:"Aug 24",   label:"Break ground",                 inflow:0,               outflow:150000,          category:"construction",notes:"OSLO mobilizes. 10–12 month construction window begins. SEEK CA ($3k/month × 10 months) draws from loan."},
];

const SCENARIOS = [
  {
    id:"a", label:"Path A — Co-GP bridge", color:"#2a6b3f",
    description:`Werner, Weaver & Hobbs personally fund $${(BARTON_109_DUE/1000).toFixed(0)}k to close 109 Barton in late May ($680k purchase less $25k hard deposit already in escrow + ~$14k closing costs). Horizon reimburses at construction loan close as day-one land draw. Co-GPs out of pocket ~6–8 weeks.`,
    feasibility:"Most likely path", badge:"green",
    requirements:[`Co-GPs confirm liquidity for $${(BARTON_109_DUE/1000).toFixed(0)}k bridge`,"Horizon confirms day-one land draw at close","PSA buyer entity (ECG Acquisitions LLC) confirmed for close"],
  },
  {
    id:"b", label:"Path B — Early LP wires", color:B.gold,
    description:`Ask committed high-likelihood LPs to wire early. Need ~$${(Math.max(0,BARTON_109_DUE-50000)/1000).toFixed(0)}k wired by late May ($${(BARTON_109_DUE/1000).toFixed(0)}k needed less ~$50k in bank). Works if top prospects are ready to move quickly.`,
    feasibility:"Possible but uncertain", badge:"amber",
    requirements:["Identify which LPs can wire by May 25","Execute subscription agreements immediately","Risk: LP hesitation delays the permit"],
  },
  {
    id:"c", label:"Path C — Horizon early land draw", color:B.blue,
    description:`Ask Horizon to release just the $${(BARTON_109_DUE/1000).toFixed(0)}k land acquisition draw once appraisal and environmental are clear — before full construction loan close. Uncommon but worth asking on May 11.`,
    feasibility:"Ask on May 11", badge:"blue",
    requirements:["Appraisal and environmental complete by late May","Horizon internal approval for partial early draw","May accelerate overall loan close timeline"],
  },
];

const ASKS = [
  {n:"1", text:"What is your realistic closing timeline? Our permit submission is targeting July 6 — can you close by early July? We need to know if your appraisal, environmental, and internal approvals can be completed by then."},
  {n:"2", text:"Do you need a building permit in hand before you'll fund, or is permit submission sufficient? This determines whether we can close the loan in early July while the permit is in review, or whether we need to wait until late August."},
  {n:"3", text:"We need to close 109 Barton on June 24 using a Co-GP bridge (~$750k), then have your construction loan reimburse that as a day-one land draw at close. Can you confirm that mechanic works for you?"},
  {n:"4", text:"Have you approved OSLO Builders as the contractor? Horizon requires contractor approval before funding — we want to make sure that's not a bottleneck on your end."},
];

const catColor = c => ({equity:"#2a6b3f",land:B.danger,soft:B.gold,loan:B.blue,construction:B.sage,"":B.muted}[c]||B.muted);
const catLabel = c => ({equity:"LP equity",land:"Land / acquisition",soft:"Soft costs",loan:"Construction loan",construction:"Construction draw","":"Milestone"}[c]||c);

function CapitalTiming(){
  const mobile=useIsMobile();
  const [showAll,setShowAll]=useState(false);
  const savedBal = parseInt(localStorage.getItem("ecg-starting-balance")||"1476528")||1476528;
  const [startingBalance,setStartingBalance]=useState(savedBal);
  const [balInput,setBalInput]=useState(String(savedBal));
  const gap=BARTON_109_DUE-startingBalance;
  let running=startingBalance;
  const rows=CASH_FLOWS.map(r=>{
    running=running+r.inflow-r.outflow;
    return{...r,runningAfter:running};
  });
  return(
    <div style={{padding:"1.25rem 0"}}>
      {/* KPIs */}
      <div style={g4(mobile)}>
        <div style={{...SC(gap>0?B.danger:"#2a6b3f")}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Starting cash balance</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:16,fontWeight:700,color:B.white}}>$</span>
            <input value={balInput} onChange={e=>{setBalInput(e.target.value);const n=parseInt(e.target.value.replace(/[^0-9]/g,""))||0;setStartingBalance(n);localStorage.setItem("ecg-starting-balance",String(n));}}
              style={{fontSize:mobile?16:20,fontWeight:700,color:B.white,background:"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.4)",outline:"none",width:"100%",fontFamily:FONT}}/>
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:4}}>Edit to update all projections</div>
        </div>
        {[
          ["109 Barton needed",fmt$(BARTON_109_DUE),B.navy],
          ["Funding gap",fmt$(Math.max(0,gap)),gap<=0?"#2a6b3f":B.danger],
          ["Permit deadline","~Jun 27",B.sage],
        ].map(([l,v,c])=>(
          <div key={l} style={SC(c)}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
            <div style={{fontSize:22,fontWeight:700,color:B.white,lineHeight:1.2}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Critical path timeline — centered */}
      <div style={{...card,marginBottom:"1.25rem"}}>
        <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"1rem"}}>Critical path</div>
        <div style={{columns:2,columnGap:"2rem"}}>
          {[
            {date:"May 11",label:"Horizon site visit",sub:"Present sequencing. Get answer on loan close timing.",color:B.blue},
            {date:"May 12",label:"Entitlements hearing",sub:"Plan commission vote. Approval recommended to City Council.",color:B.blue},
            {date:"May 18",label:"City Council ratification",sub:"Ratifies PC approval — fully entitled.",color:B.blue},
            {date:"May 20",label:"Subscription docs + Operating Agreement",sub:"LPs receive subscription documents and updated Operating Agreement.",color:B.blue},
            {date:"May 22",label:"Confirm capital commitments",sub:"All LP and Co-GP commitments confirmed ahead of subscription signing.",color:"#2a6b3f"},
            {date:"Jun 5", label:"Subscription docs signed + capital wired",sub:`Full remaining raise — $${(TRANCHE_1/1000).toFixed(0)}k wired. Equity raise complete.`,color:"#2a6b3f"},
            {date:"Jun 15",label:"Close 109 Barton",sub:"Own both parcels. File lot combination next day.",color:B.danger,critical:true},
            {date:"Jun 16",label:"Lot combination filed",sub:"7–10 days to record. Targets June 23–26.",color:B.gold},
            {date:"Jun 24–26",label:"CDs complete + lot combo recorded",sub:"Both must be done before permit submission.",color:B.gold},
            {date:"Jun 27",label:"Permit submitted",sub:"CDs + combined parcel. Review clock starts.",color:B.danger,critical:true},
            {date:"Jul 7",label:"Construction loan closes",sub:"Horizon funds. Bridge reimbursed day-one.",color:B.gold},
            {date:"~Aug 15",label:"Permit approved",sub:"~7 weeks after June 27. Latest early September.",color:B.sage},
            {date:"~Aug 24",label:"Break ground",sub:"OSLO mobilizes. 10–12 month build begins.",color:"#2a6b3f"},
          ].map((item,i,arr)=>(
            <div key={i} style={{display:"flex",gap:12,marginBottom:0,breakInside:"avoid"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:12,flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:item.color,flexShrink:0,marginTop:3}}/>
                {i<arr.length-1&&<div style={{width:2,flex:1,minHeight:24,background:B.light,margin:"3px 0"}}/>}
              </div>
              <div style={{paddingBottom:16,flex:1}}>
                <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,color:B.muted,letterSpacing:"0.05em",textTransform:"uppercase",flexShrink:0}}>{item.date}</span>
                  <span style={{fontSize:13,fontWeight:600,color:item.critical?B.danger:B.navy}}>{item.label}</span>
                  {item.critical&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:B.danger+"20",color:B.danger,letterSpacing:"0.06em",textTransform:"uppercase"}}>critical</span>}
                </div>
                <div style={{fontSize:12,color:B.muted,marginTop:2,lineHeight:1.5}}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cash flow table */}
      <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>Cash flow schedule</div>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:"1rem"}}>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:mobile?11:12,minWidth:mobile?400:700}}>
          <thead>
            <tr style={{background:B.navy}}>
              {[["Date","70px"],["Event",""],mobile?null:["Category","90px"],["Inflow","80px"],["Outflow","80px"],["Running balance","100px"]].filter(Boolean).map(([h,w])=>(
                <th key={h} style={{padding:"9px 12px",color:"rgba(255,255,255,0.65)",fontSize:10,fontWeight:600,textAlign:h==="Date"||h==="Category"?"left":"right",letterSpacing:"0.05em",textTransform:"uppercase",width:w||"auto",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.filter((_,i)=>showAll||i<8).map((r,i)=>{
              const bal=r.runningAfter;
              const balColor=bal<0?B.danger:bal<100000?B.gold:"#2a6b3f";
              return(
                <tr key={i} style={{borderBottom:`1px solid ${B.light}`,background:i%2===0?B.white:B.offwhite}}>
                  <td style={{padding:"8px 12px",color:B.muted,whiteSpace:"nowrap",fontSize:11}}>{r.date}</td>
                  <td style={{padding:"8px 12px",color:B.navy,fontWeight:r.category===""?400:500}}>
                    <div style={{fontSize:mobile?11:13}}>{r.label}{r.category===""&&<span style={{fontSize:10,color:B.muted,fontWeight:400}}> — milestone</span>}</div>
                    {!mobile&&r.notes&&<div style={{fontSize:11,color:B.muted,fontWeight:400,marginTop:2,lineHeight:1.4}}>{r.notes}</div>}
                  </td>
                  {!mobile&&<td style={{padding:"8px 12px"}}>
                    {r.category&&<span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:3,background:catColor(r.category)+"20",color:catColor(r.category),border:`1px solid ${catColor(r.category)}44`,letterSpacing:"0.04em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{catLabel(r.category)}</span>}
                  </td>}
                  <td style={{padding:"8px 12px",textAlign:"right",color:"#2a6b3f",fontWeight:r.inflow>0?600:400,fontSize:mobile?11:12}}>{r.inflow>0?fmt$(r.inflow):"—"}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",color:r.outflow>0?B.danger:B.muted,fontWeight:r.outflow>0?600:400,fontSize:mobile?11:12}}>{r.outflow>0?`(${fmt$(r.outflow)})`:"—"}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:balColor,whiteSpace:"nowrap",fontSize:mobile?11:12}}>{fmt$(bal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {!showAll&&rows.length>8&&(
          <div onClick={()=>setShowAll(true)} style={{padding:"10px 16px",textAlign:"center",fontSize:12,color:B.blue,cursor:"pointer",borderTop:`1px solid ${B.light}`,background:B.offwhite}}>
            Show all {rows.length} line items ↓
          </div>
        )}
      </div>

      {/* Horizon asks */}
      <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>Your 4 asks for Horizon — May 11</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ASKS.map(a=>(
          <div key={a.n} style={{...card,padding:"10px 16px",display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:B.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:B.white,flexShrink:0}}>{a.n}</div>
            <div style={{fontSize:13,color:B.navy,lineHeight:1.6}}>{a.text}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
// ── OAC To-Dos ─────────────────────────────────────────────────────────────
function todoToRow(t) {
  return {
    id: String(t.id),
    subject: t.subject || "",
    description: t.description || "",
    owner: t.owner || "ECG",
    due_date: t.due_date || null,
    done: !!t.done,
    created_at: t.created_at || new Date().toISOString(),
  };
}

function rowToTodo(r) {
  return {
    id: r.id,
    subject: r.subject || "",
    description: r.description || "",
    owner: r.owner || "ECG",
    due_date: r.due_date || "",
    done: !!r.done,
    created_at: r.created_at || "",
  };
}

const OAC_OWNERS = ["ECG", "Oslo", "SEEK", "Rebel House"];

function RichTextField({value, onChange}){
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(()=>{
    if(ref.current && !focused && ref.current.innerHTML !== (value||"")){
      ref.current.innerHTML = value || "";
    }
  },[value, focused]);

  function exec(cmd){
    const el = ref.current;
    if(!el) return;
    el.focus();
    const sel = window.getSelection();
    if(!el.textContent && !el.querySelector("br")){
      el.innerHTML = "<br>";
    }
    if(!sel.rangeCount || !el.contains(sel.anchorNode)){
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand(cmd, false, null);
    onChange(el.innerHTML);
  }

  const toolBtn = {fontSize:12,fontWeight:700,padding:"4px 10px",borderRadius:4,border:`1px solid ${B.steel}`,background:B.white,color:B.navy,cursor:"pointer"};

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:6}}>
        <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>exec("bold")} style={toolBtn}><b>B</b></button>
        <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>exec("italic")} style={{...toolBtn,fontStyle:"italic"}}>I</button>
        <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>exec("insertUnorderedList")} style={toolBtn}>• List</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={()=>setFocused(true)}
        onBlur={()=>setFocused(false)}
        onInput={e=>onChange(e.currentTarget.innerHTML)}
        style={{...iS,height:90,overflowY:"auto",lineHeight:1.5}}
      />
    </div>
  );
}

function OACTodos(){
  const mobile = useIsMobile();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({subject:"",description:"",owner:"ECG",due_date:""});
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [doneOpen, setDoneOpen] = useState(false);

  useEffect(()=>{
    async function load(){
      try{
        const rows = await sbFetch("oac_todos");
        setItems(rows.map(rowToTodo));
      } catch(e){
        setItems([]);
        setLoadFailed(true);
      }
      setLoaded(true);
    }
    load();
  },[]);

  function openNew(){
    setForm({subject:"",description:"",owner:"ECG",due_date:""});
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(it){
    setForm({subject:it.subject,description:it.description,owner:it.owner,due_date:it.due_date});
    setEditingId(it.id);
    setShowForm(true);
  }

  async function submitForm(){
    const subject = form.subject.trim();
    if(!subject) return;
    const item = editingId
      ? { ...items.find(i=>i.id===editingId), subject, description:form.description, owner:form.owner, due_date:form.due_date }
      : { id:`t-${Date.now()}`, subject, description:form.description, owner:form.owner, due_date:form.due_date, done:false, created_at:new Date().toISOString() };

    setItems(prev => editingId ? prev.map(i=>i.id===editingId?item:i) : [item, ...prev]);
    setShowForm(false);
    setSaveError(null);
    setSaving(true);
    try{ await sbUpsert("oac_todos", [todoToRow(item)]); } catch(e){ setSaveError(String(e.message||e)); }
    setSaving(false);
  }

  async function toggleDone(it){
    const updated = { ...it, done: !it.done };
    setItems(prev=>prev.map(x=>x.id===it.id?updated:x));
    try{ await sbUpsert("oac_todos", [todoToRow(updated)]); setSaveError(null); } catch(e){ setSaveError(String(e.message||e)); }
  }

  async function deleteItem(id){
    setItems(prev=>prev.filter(x=>x.id!==id));
    try{ await sbDelete("oac_todos", id); setSaveError(null); } catch(e){ setSaveError(String(e.message||e)); }
    setShowForm(false);
  }

  function exportPDF(){
    const esc = s => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const fmtDate = d => {
      if(!d) return "";
      try{ return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
      catch(e){ return d; }
    };
    const genDate = new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});

    const matches = i => ownerFilter==="All" || i.owner===ownerFilter;
    const openRows = items.filter(i=>!i.done && matches(i)).sort((a,b)=>(a.due_date||"9999").localeCompare(b.due_date||"9999"));
    const doneRows = items.filter(i=>i.done && matches(i));

    const ownerTagHtml = o => `<span class="ownertag">${esc(o)}</span>`;

    const rowHtml = (it) => {
      const overdue = it.due_date && !it.done && it.due_date < todayStr;
      return `
      <tr>
        <td class="chk">${it.done?"&#9745;":"&#9744;"}</td>
        <td class="main">
          <div class="subj">${esc(it.subject)}</div>
          ${it.description?`<div class="desc">${it.description}</div>`:""}
          <div class="tags">${ownerTagHtml(it.owner)}</div>
        </td>
        <td class="due ${overdue?"overdue":""}">${fmtDate(it.due_date)}</td>
      </tr>`;
    };

    const tableHtml = (rows) => rows.length
      ? `<table><thead><tr><th></th><th>Item</th><th>Due</th></tr></thead><tbody>${rows.map(rowHtml).join("")}</tbody></table>`
      : `<div class="empty">None</div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>115 N Barton — OAC To-Dos</title>
    <style>
      * { box-sizing:border-box; }
      body{ font-family:'Gill Sans','Gill Sans MT','Trebuchet MS',Arial,sans-serif; color:#021d2b; margin:0; padding:0; }
      .headerbar{ background:#021d2b; padding:28px 48px 22px 48px; display:flex; align-items:flex-end; justify-content:space-between; }
      .eyebrow{ font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:#ffffff; margin-bottom:6px; font-weight:600; }
      .headerbar h1{ font-size:23px; margin:0; letter-spacing:0.02em; color:#ffffff; font-weight:700; }
      .doclabel{ font-size:13px; letter-spacing:0.06em; text-transform:uppercase; color:#ffffff; font-weight:700; text-align:right; }
      .goldrule{ height:3px; background:#c9a84c; }
      .content{ padding:28px 48px 40px 48px; }
      .subtitle{ font-size:13px; color:#021d2b; font-weight:600; margin-bottom:2px; }
      .meta{ font-size:11px; color:#6b8497; margin-bottom:26px; }
      h2{ font-size:11px; text-transform:uppercase; letter-spacing:0.09em; color:#033b57; font-weight:700; border-bottom:1px solid #ccd5de; padding-bottom:6px; margin:22px 0 0 0; }
      table{ width:100%; border-collapse:collapse; margin-top:2px; }
      th{ text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:#6b8497; font-weight:600; padding:9px 6px 5px 6px; }
      td{ padding:9px 6px; border-bottom:1px solid #e8edf1; vertical-align:top; font-size:12px; }
      td.chk{ width:20px; font-size:14px; text-align:center; color:#033b57; }
      td.due{ white-space:nowrap; font-size:11px; color:#6b8497; text-align:right; }
      td.due.overdue{ color:#7a1e1e; font-weight:700; }
      .subj{ font-weight:700; color:#021d2b; }
      .desc{ font-size:11px; color:#5f5e5a; margin-top:3px; line-height:1.5; }
      .desc ul{ margin:2px 0 2px 18px; padding:0; }
      .tags{ margin-top:6px; }
      .ownertag{ display:inline-block; font-size:9.5px; font-weight:700; letter-spacing:0.03em; padding:2px 9px; border-radius:9px; background:#f4f6f8; border:1px solid #e8edf1; color:#021d2b; }
      .empty{ font-size:12px; color:#6b8497; padding:10px 6px; }
      .footer{ margin-top:36px; padding-top:12px; border-top:1px solid #ccd5de; font-size:10px; color:#6b8497; }
      @media print{ .headerbar{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head><body>
      <div class="headerbar">
        <div>
          <div class="eyebrow">The Neighborhood Hotel</div>
          <h1>115 N Barton Street</h1>
        </div>
        <div class="doclabel">OAC To-Dos${ownerFilter!=="All"?" — "+esc(ownerFilter):""}</div>
      </div>
      <div class="goldrule"></div>
      <div class="content">
        <div class="meta">Generated ${genDate}</div>

        <h2>Open (${openRows.length})</h2>
        ${tableHtml(openRows)}

        <h2>Done (${doneRows.length})</h2>
        ${tableHtml(doneRows)}

        <div class="footer">The Neighborhood Hotel — 115 N Barton St, New Buffalo, MI</div>
      </div>
    </body></html>`;

    const w = window.open("", "_blank");
    if(!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(()=>{ w.print(); }, 350);
  }

  if(!loaded) return <div style={{padding:"3rem",textAlign:"center",fontSize:13,color:B.muted}}>Loading…</div>;

  const matchesFilter = (i) => ownerFilter==="All" || i.owner===ownerFilter;
  const open = items.filter(i=>!i.done && matchesFilter(i)).sort((a,b)=>(a.due_date||"9999").localeCompare(b.due_date||"9999"));
  const done = items.filter(i=>i.done && matchesFilter(i));

  const fmtDue = (d) => {
    if(!d) return null;
    try{
      const dt = new Date(d+"T12:00:00");
      const today = new Date(); today.setHours(12,0,0,0);
      const overdue = dt < today;
      return <span style={{fontSize:11,color:overdue?B.danger:B.muted,fontWeight:overdue?700:400}}>{dt.toLocaleDateString("en-US",{month:"short",day:"numeric"})}{overdue?" · overdue":""}</span>;
    } catch(e){ return null; }
  };

  const ownerTag = (o) => (
    <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:B.offwhite,border:`1px solid ${B.light}`,color:B.navy,fontWeight:600,flexShrink:0}}>{o}</span>
  );

  const row = (it) => (
    <div key={it.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",borderBottom:`1px solid ${B.light}`}}>
      <input type="checkbox" checked={it.done} onChange={()=>toggleDone(it)} style={{width:16,height:16,flexShrink:0,cursor:"pointer",marginTop:2}}/>
      <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>openEdit(it)}>
        <div style={{fontSize:13,fontWeight:600,color:it.done?B.muted:B.navy,textDecoration:it.done?"line-through":"none"}}>{it.subject}</div>
        {it.description && <div style={{fontSize:12,color:B.muted,marginTop:2,lineHeight:1.5}} dangerouslySetInnerHTML={{__html:it.description}}/>}
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6}}>
          {ownerTag(it.owner)}
          {fmtDue(it.due_date)}
        </div>
      </div>
      <button onClick={()=>deleteItem(it.id)} style={{border:"none",background:"none",color:B.muted,cursor:"pointer",fontSize:16,flexShrink:0,padding:"0 4px"}}>×</button>
    </div>
  );

  const chipStyle = (active) => ({
    fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:14,cursor:"pointer",
    border:`1px solid ${active?B.navy:B.light}`,background:active?B.navy:B.white,color:active?B.white:B.muted,
  });

  return(
    <div style={{padding:"1.25rem 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:B.navy}}>OAC To-Dos</div>
          <div style={{fontSize:12,color:B.muted,marginTop:2}}>Action items from Owner / Architect / Contractor meetings — 115 N Barton</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportPDF} style={btn(true)}>Export PDF</button>
          <button onClick={openNew} style={btn()}>+ Add</button>
        </div>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1.25rem"}}>
        <div onClick={()=>setOwnerFilter("All")} style={chipStyle(ownerFilter==="All")}>All</div>
        {OAC_OWNERS.map(o=>(
          <div key={o} onClick={()=>setOwnerFilter(o)} style={chipStyle(ownerFilter===o)}>{o}</div>
        ))}
      </div>

      {loadFailed && <div style={{fontSize:12,color:B.danger,marginBottom:12}}>Couldn't load saved items. Check Supabase connection.</div>}
      {saveError && <div style={{fontSize:12,color:B.danger,marginBottom:12}}>Showing locally, but didn't save to the database: {saveError}</div>}

      <div style={{...card,padding:0,marginBottom:16,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,background:B.offwhite,borderBottom:`1px solid ${B.light}`}}>Open ({open.length})</div>
        {open.length===0
          ? <div style={{padding:"1.5rem",textAlign:"center",color:B.muted,fontSize:13}}>Nothing open. Add a to-do above.</div>
          : open.map(row)}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div onClick={()=>setDoneOpen(v=>!v)} style={{padding:"10px 14px",fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,background:B.offwhite,borderBottom:doneOpen?`1px solid ${B.light}`:"none",cursor:"pointer",display:"flex",justifyContent:"space-between"}}>
          <span>Done ({done.length})</span><span>{doneOpen?"▲":"▼"}</span>
        </div>
        {doneOpen && (done.length===0
          ? <div style={{padding:"1.5rem",textAlign:"center",color:B.muted,fontSize:13}}>Nothing completed yet.</div>
          : done.map(row))}
      </div>

      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"2rem 1rem",overflowY:"auto"}}>
          <div style={{...card,width:"100%",maxWidth:520}}>
            <div style={{fontSize:15,fontWeight:700,color:B.navy,marginBottom:"1.25rem"}}>{editingId?"Edit to-do":"New to-do"}</div>

            <div style={{marginBottom:12}}>
              <label style={lS}>Subject line</label>
              <input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} style={iS} placeholder="e.g. Confirm elevator shaft dimensions" autoFocus/>
            </div>

            <div style={{marginBottom:12}}>
              <label style={lS}>Description</label>
              <RichTextField value={form.description} onChange={html=>setForm(f=>({...f,description:html}))}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:12,marginBottom:"1.25rem"}}>
              <div>
                <label style={lS}>Owner</label>
                <select value={form.owner} onChange={e=>setForm(f=>({...f,owner:e.target.value}))} style={iS}>
                  {OAC_OWNERS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={lS}>Due date</label>
                <input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} style={iS}/>
              </div>
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={submitForm} style={btn()} disabled={saving}>{saving?"Saving…":"Save"}</button>
              <button onClick={()=>setShowForm(false)} style={btn(true)}>Cancel</button>
              {editingId && <button onClick={()=>deleteItem(editingId)} style={{...btn(),background:B.danger}}>Delete</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




export default function App(){
  const [nav,setNav]=useState("Dashboard");
  const [contacts,setContacts]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [miles,setMiles]=useState([]);
  const [risks,setRisks]=useState([]);  // CHANGED: empty array, loads from Supabase
  const [loaded,setLoaded]=useState(false);
  const [loadError,setLoadError]=useState(null);
  const [syncing,setSyncing]=useState(false);

  // ── Seed Supabase if tables are empty ──────────────────────────────────
  async function seedIfEmpty(contactRows, taskRows, mileRows, riskRows) {
    const promises = [];
    if (contactRows.length === 0) {
      const allSeedContacts = [...SEED_LPS, ...DEFAULT_CONTACTS.filter(c=>c.type==="Lender")];
      promises.push(sbUpsert("contacts", allSeedContacts.map(contactToRow)));
    } else if (!contactRows.some(r=>r.type==='lp')) {
      // Contacts exist but no LPs — seed just the LPs
      promises.push(sbUpsert("contacts", SEED_LPS.map(contactToRow)));
    }
    if (taskRows.length === 0) {
      promises.push(sbUpsert("tasks", DEFAULT_TASKS.map(taskToRow)));
    }
    if (mileRows.length === 0) {
      promises.push(sbUpsert("milestones", DEFAULT_MILES.map(mileToRow)));
    }
    if (riskRows.length === 0) {
      promises.push(sbUpsert("risks", DEFAULT_RISKS.map(riskToRow)));
    }
    await Promise.all(promises);
  }

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(()=>{
    async function load(){
      try{
        // CHANGED: fetch risks alongside other tables
        const [cRows, tRows, mRows, rRows] = await Promise.all([
          sbFetch("contacts"),
          sbFetch("tasks"),
          sbFetch("milestones"),
          sbFetch("risks"),
        ]);
        // Seed on first run
        if(cRows.length===0||tRows.length===0||mRows.length===0||rRows.length===0){  // CHANGED
          await seedIfEmpty(cRows, tRows, mRows, rRows);  // CHANGED
          const [c2, t2, m2, r2] = await Promise.all([  // CHANGED
            sbFetch("contacts"), sbFetch("tasks"), sbFetch("milestones"), sbFetch("risks")
          ]);
          setContacts(c2.map(rowToContact));
          setTasks(t2.map(rowToTask));
          setMiles(m2.map(rowToMile));
          setRisks(r2.map(rowToRisk));  // CHANGED
        } else {
          setContacts(cRows.map(rowToContact));
          setTasks(tRows.map(rowToTask));
          setMiles(mRows.map(rowToMile));
          setRisks(rRows.map(rowToRisk));  // CHANGED
        }
        setLoaded(true);
      }catch(e){
        console.error("Load error:",e);
        setLoadError(e.message);
        // Fall back to seed data so the app still works
        setContacts(DEFAULT_CONTACTS);
        setTasks(DEFAULT_TASKS);
        setMiles(DEFAULT_MILES);
        setRisks(DEFAULT_RISKS);  // CHANGED: fall back to defaults
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
      else if (table === "risks") rows = items.map(riskToRow);  // CHANGED: added risks case
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

  // Hidden (components kept): "Value Engineering", "Capital Timing", "OAC"
  const TABS=["Dashboard","CRM","Timeline","Tasks","Budget","Lessons Learned","Lender","Risks","Import"];

  const mobile=useIsMobile();

  if(!loaded)return(
    <div style={{fontFamily:FONT,padding:"3rem",color:B.muted,textAlign:"center",fontSize:14}}>
      <div style={{marginBottom:8}}>Connecting to database…</div>
      <div style={{fontSize:12,color:B.steel}}>bhwfnogroaxttmtvulft.supabase.co</div>
    </div>
  );
  return(<div style={{fontFamily:FONT,background:B.offwhite,minHeight:"100vh"}}>
    <div style={{background:B.navy,padding:mobile?"0 1rem":"0 2rem",display:"flex",alignItems:"center",gap:0,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {!mobile&&<div style={{marginRight:32,paddingRight:32,borderRight:"1px solid rgba(255,255,255,0.15)",flexShrink:0}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:"0.1em",textTransform:"uppercase"}}>The Neighborhood Hotel</div>
        <div style={{fontSize:14,fontWeight:700,color:B.white,letterSpacing:"0.06em",textTransform:"uppercase"}}>115 N Barton</div>
      </div>}
      {TABS.map(t=>(<button key={t} onClick={()=>setNav(t)} style={{background:"none",border:"none",borderBottom:nav===t?"2px solid #ccd5de":"2px solid transparent",color:nav===t?B.white:"rgba(255,255,255,0.55)",fontSize:mobile?10:11,fontWeight:nav===t?700:400,letterSpacing:"0.07em",textTransform:"uppercase",padding:mobile?"0.75rem 0.75rem":"1rem 1.25rem",cursor:"pointer",fontFamily:FONT,marginBottom:-1,flexShrink:0,whiteSpace:"nowrap"}}>{t}</button>))}
      <div style={{flex:1}}/>
      {syncing&&<div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:"0.05em",marginLeft:12,flexShrink:0}}>Saving…</div>}
      {loadError&&<div style={{fontSize:11,color:B.gold,letterSpacing:"0.05em",flexShrink:0}} title={loadError}>⚠ Offline</div>}
    </div>
    <div style={{maxWidth:1400,margin:"0 auto",padding:mobile?"0 0.75rem 3rem":"0 2rem 3rem"}}>
      {nav==="Dashboard"&&<Dashboard contacts={contacts} tasks={tasks} miles={miles} setNav={setNav}/>}
      {nav==="CRM"&&<CRM contacts={contacts} setContacts={setContacts} onSave={handleSave} onDelete={handleDelete}/>}
      {nav==="Timeline"&&<Timeline/>}
      {nav==="Tasks"&&<Tasks tasks={tasks} setTasks={setTasks} onSave={handleSave} onDelete={handleDelete}/>}
      {nav==="Budget"&&<Budget committed={contacts.filter(c=>c.type==="LP"&&c.status==="Committed").reduce((s,c)=>s+(Number(c.expectedAmount)||0),0)}/>}
      {nav==="Value Engineering"&&<ValueEngineering/>}
      {nav==="Lessons Learned"&&<LessonsLearned/>}
      {nav==="Lender"&&<LenderMatrix/>}
      {nav==="Risks"&&<Risks risks={risks} setRisks={setRisks} onSave={handleSave} onDelete={handleDelete}/>}
      {nav==="Capital Timing"&&<CapitalTiming/>}
      {nav==="OAC"&&<OACTodos/>}
      {nav==="Import"&&<Import contacts={contacts} setContacts={setContacts} tasks={tasks} setTasks={setTasks} miles={miles} setMiles={setMiles} onSave={handleSave}/>}
    </div>
  </div>);
}
