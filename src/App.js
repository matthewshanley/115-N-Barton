import { useState, useEffect } from "react";

const B = {
  navy:"#021d2b",blue:"#033b57",steel:"#ccd5de",sage:"#5e7361",
  white:"#ffffff",offwhite:"#f4f6f8",muted:"#6b8497",border:"#ccd5de",
  danger:"#7a1e1e",gold:"#c9a84c",light:"#e8edf1",
};
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

const store={
  get:key=>{try{const v=localStorage.getItem(key);return v?{value:v}:null;}catch(_){return null;}},
  set:(key,val)=>{try{localStorage.setItem(key,val);}catch(_){}},
};

const fmt$=n=>(!n&&n!==0)?"—":"$"+Number(n).toLocaleString();
const initials=n=>(n||"?").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
const today=new Date();

const Pip=({color})=><span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:color||B.muted,marginRight:6,flexShrink:0}}/>;
const Badge=({label,color=B.muted})=><span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:3,background:color+"20",color,border:`1px solid ${color}44`,letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>;
const Avatar=({name,color=B.navy})=><div style={{width:36,height:36,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:B.white,flexShrink:0,letterSpacing:"0.04em"}}>{initials(name)}</div>;
const Field=({label,value})=><div><div style={{fontSize:10,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>{label}</div><div style={{fontSize:13,color:B.navy}}>{value||"—"}</div></div>;

const card={background:B.white,border:`1px solid ${B.steel}`,borderRadius:8,padding:"1rem 1.25rem"};
const statCard=(accent=B.navy)=>({background:accent,borderRadius:6,padding:"14px 16px"});
const btn=(ghost=false)=>({fontSize:11,padding:"7px 16px",borderRadius:4,cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:FONT,fontWeight:600,background:ghost?"transparent":B.navy,color:ghost?B.navy:B.white,border:ghost?`1px solid ${B.navy}`:"none"});
const inputStyle={fontSize:13,fontFamily:FONT,border:`1px solid ${B.steel}`,borderRadius:4,padding:"7px 10px",color:B.navy,background:B.white,width:"100%",boxSizing:"border-box"};
const labelStyle={fontSize:11,color:B.muted,display:"block",marginBottom:4,letterSpacing:"0.05em",textTransform:"uppercase"};

const DEFAULT_CONTACTS=[
  {id:1,type:"LP",name:"Jeff Aeder",firm:"JDI Realty",title:"",email:"jaeder@jdirealty.com",phone:"(773) 680-8490",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:25,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($150k committed via Mah Jong LLC)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:2,type:"LP",name:"Daniel Kahan",firm:"JDI Realty",title:"",email:"DKahan@jdirealty.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:25,expectedAmount:12500,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($150k committed via Mah Jong LLC)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:3,type:"LP",name:"Dominic Sergi",firm:"West Shore Capital / Gleneagles Group",title:"",email:"ds@westshorecg.com",phone:"(630) 688-3832",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark, 1431 W Taylor, 801 W Madison ($50k+ per deal via SB Companies LLC)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:4,type:"LP",name:"Anthony Casaccio",firm:"West Shore Capital",title:"",email:"ac@westshorecg.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:25000,tag:"2616 N Clark",bio:"",relationship:"Co-investor with Dominic Sergi across multiple ECG deals",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:5,type:"LP",name:"Eric Augustyn",firm:"August Hill",title:"",email:"eric@augusthill.co",phone:"(203) 500-6712",linkedinUrl:"",status:"Data room accessed",priority:"Medium",likelihood:50,expectedAmount:25000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($25k via UT-STL LLC)",whatTheyCareAbout:"",howWeKnowThem:"18 W Merchant investor",nextStep:"",notes:"Data room accessed Mar 9."},
  {id:6,type:"LP",name:"Vann Avedisian",firm:"New Bond",title:"",email:"vavedisian@newbond.com",phone:"(312) 310-9580",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:7,type:"LP",name:"Thomas Bohac",firm:"SB Group LLC",title:"",email:"thomas@sbgroupllc.com",phone:"(312) 515-1708",linkedinUrl:"",status:"In conversation",priority:"High",likelihood:50,expectedAmount:50000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($50k committed personally)",whatTheyCareAbout:"",howWeKnowThem:"18 W Merchant investor",nextStep:"Follow up after April 9 meeting",notes:"Phone call Mar 10 — chatted 115 N Barton development."},
  {id:8,type:"LP",name:"Ryan Brown",firm:"Chaifetz Group",title:"",email:"rbrown@chaifetzgroup.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:9,type:"LP",name:"Michael Carney",firm:"Starshot Ventures",title:"",email:"michael@starshot.ventures",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:10,type:"LP",name:"Ross Chaifetz",firm:"Chaifetz Group",title:"",email:"rosschaifetz@chaifetzgroup.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:11,type:"LP",name:"John Daley",firm:"Daley Strategy",title:"",email:"John@daleystrategy.com",phone:"",linkedinUrl:"",status:"Data room accessed",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room accessed Mar 18."},
  {id:12,type:"LP",name:"Patrick R. Daley",firm:"",title:"",email:"patrickrdaley@gmail.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($75k via Tur Holdings)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:13,type:"LP",name:"Anthony Disano",firm:"Parkvue Realty",title:"",email:"adisano@parkvuerealty.com",phone:"(312) 296-0950",linkedinUrl:"",status:"Data room accessed",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($50k via AS LLC)",whatTheyCareAbout:"",howWeKnowThem:"18 W Merchant investor",nextStep:"",notes:"Data room accessed Mar 10."},
  {id:14,type:"LP",name:"Connor P. Doherty",firm:"",title:"",email:"Connordoherty33@gmail.com",phone:"(802) 236-7887",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($50k personally)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:15,type:"LP",name:"Dan Drexler",firm:"Crown Chicago",title:"",email:"ddrexler@crown-chicago.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:16,type:"LP",name:"Benjamin J. Firestone",firm:"Blueprint HCRE",title:"",email:"bfirestone@blueprintHCRE.com",phone:"(312) 545-4505",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 19400 Ravine ($50k), 2616 N Clark ($25k), 801 W Madison ($50k)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:17,type:"LP",name:"Harry Quaid",firm:"Realty ADS",title:"",email:"harry.quaid@realtyads.com",phone:"(847) 436-2521",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k via HAM Wave LLC)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:18,type:"LP",name:"Paul Gassel",firm:"WWM Investment",title:"",email:"pgassel@wwminvestment.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($75k personally)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:19,type:"LP",name:"Jimmy Georgantas",firm:"ECG / NBHD Hotels",title:"Co-GP",email:"jimmy@nbhdhotels.com",phone:"(815) 302-7392",linkedinUrl:"",status:"Committed",priority:"High",likelihood:100,expectedAmount:13126,tag:"Co-GP",bio:"",relationship:"Co-GP — internal",whatTheyCareAbout:"",howWeKnowThem:"Internal",nextStep:"",notes:"Closed / committed."},
  {id:20,type:"LP",name:"Alex Gilbert",firm:"Brightcare Direct",title:"",email:"alex.gilbert@brightcaredirect.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($25k personally)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Missing phone. Data room granted Mar 18."},
  {id:21,type:"LP",name:"Julie & Gregory Goldstein",firm:"Metis MD",title:"",email:"ggoldstein@metismd.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($50k via Goldstein Revocable Trust)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Missing phone. Data room granted Mar 18."},
  {id:22,type:"LP",name:"Zachary Goodman",firm:"Goodman Enterprises",title:"",email:"zach.s.goodman@gmail.com",phone:"(248) 763-6009",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 19400 Ravine ($50k via Superba Group), 2616 N Clark ($50k via Goodman Enterprises)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:23,type:"LP",name:"Jonathan Gordon",firm:"ECG",title:"Primary Owner / Co-GP",email:"jonomg@yahoo.com",phone:"(773) 710-4748",linkedinUrl:"",status:"Committed",priority:"High",likelihood:100,expectedAmount:null,tag:"Co-GP",bio:"",relationship:"Primary Owner of ECG. Invested across all ECG deals.",whatTheyCareAbout:"",howWeKnowThem:"Internal",nextStep:"",notes:"Co-GP / internal."},
  {id:24,type:"LP",name:"David Alan Helfand",firm:"EQC Real Estate",title:"",email:"dhelfand@eqcre.com",phone:"(312) 965-1200",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 19400 Ravine ($100k), 2616 N Clark ($100k), 801 W Madison ($75k)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:25,type:"LP",name:"Michael Hobbs",firm:"",title:"Co-GP",email:"mikehobbs1919@gmail.com",phone:"",linkedinUrl:"",status:"Committed",priority:"High",likelihood:100,expectedAmount:257260,tag:"Co-GP",bio:"",relationship:"Co-GP. Prior investor in 18 W Merchant ($75k) and NB Expansion GP Fund ($205.8k via trust).",whatTheyCareAbout:"",howWeKnowThem:"Co-GP / internal",nextStep:"",notes:"Closed / committed."},
  {id:26,type:"LP",name:"Ross Holdren",firm:"LandEx LLC",title:"",email:"ross@landexllc.com",phone:"(720) 335-9996",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:27,type:"LP",name:"William Hughes",firm:"",title:"",email:"WilliamHughes400@outlook.com",phone:"(847) 867-8114",linkedinUrl:"",status:"Data room accessed",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($25k personally)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room accessed Mar 19."},
  {id:28,type:"LP",name:"Jerry J. Jaeger",firm:"",title:"",email:"jjjalj425@aol.com",phone:"(847) 337-4800",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:25,expectedAmount:50000,tag:"18 W Investor",bio:"",relationship:"Major repeat investor — $100k per deal across 19400 Ravine, 18 W Merchant, 2616 N Clark, 1431 W Taylor, 801 W Madison",whatTheyCareAbout:"",howWeKnowThem:"18 W Merchant investor",nextStep:"",notes:"Data room granted Mar 9. Not yet accessed."},
  {id:29,type:"LP",name:"Greg Janes",firm:"Evelyn Alan Investments",title:"",email:"evelynalan@janesfamily.org",phone:"(319) 899-2423",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($100k via Evelyn Alan Investments)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:30,type:"LP",name:"Michael Kaulentis",firm:"",title:"",email:"michael.kaulentis@gmail.com",phone:"(312) 330-8200",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($50k personally)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:31,type:"LP",name:"Benny Kay",firm:"Gray Capital Investors",title:"",email:"benny_kay@graycapitalinvestors.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:32,type:"LP",name:"Kevin P. Kolb",firm:"Altitude Chicago",title:"",email:"kevin@altitudechicago.com",phone:"(312) 282-4375",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k personally)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:33,type:"LP",name:"Bennett Kramer",firm:"",title:"",email:"bennettmkramer@gmail.com",phone:"(914) 552-3735",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k personally)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:""},
  {id:34,type:"LP",name:"Jack Krasaeath",firm:"Diversey Real Estate",title:"",email:"jack.krasaeath@diverseyrealestate.com",phone:"(773) 263-4979",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:25000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($25k) and 2616 N Clark ($25k via Diversey RE)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 9. Not yet accessed."},
  {id:35,type:"LP",name:"Liam Krehbiel",firm:"Topography",title:"",email:"krehbiel@topography.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"Family Office",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:36,type:"LP",name:"Keegan Kuhn",firm:"",title:"",email:"keegankuhn@gmail.com",phone:"(773) 569-5846",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 2616 N Clark ($100k personally)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:37,type:"LP",name:"Garrett Lalich",firm:"Buttons Investments",title:"",email:"garrett.lalich@gmail.com",phone:"(773) 951-9153",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($50k via Buttons Investments)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:38,type:"LP",name:"Josh Leitner",firm:"3J Capital / Leitner Properties",title:"",email:"josh@leitnerprops.com",phone:"(917) 656-2138",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Major repeat investor — 19400 Ravine ($100k), 1431 W Taylor ($182k+), 801 W Madison ($100k) via 3J Capital",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:39,type:"LP",name:"Anthony Leopardo",firm:"Alexander West Capital",title:"",email:"ajl@alexanderwestcapital.com",phone:"(847) 707-2013",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:40,type:"LP",name:"Eli Levenfeld",firm:"Levenfeld Investments",title:"",email:"elevenfeld97@gmail.com",phone:"(847) 508-7594",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k via Levenfeld Investments)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:41,type:"LP",name:"Scott Levenfeld",firm:"",title:"",email:"slevenfeld@earthlink.net",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:42,type:"LP",name:"Sam Levinson",firm:"Lev Capital",title:"",email:"levcapital@aol.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"Family Office",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:43,type:"LP",name:"Barry Levy",firm:"",title:"",email:"bil1323@sbcglobal.net",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k via Barry I. Levy Declaration of Trust)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Missing phone. Data room granted Mar 18."},
  {id:44,type:"LP",name:"Israel Levy",firm:"Israel Levy Revocable Trust",title:"",email:"israellevy@msn.com",phone:"(847) 858-6601",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($150k via Israel Levy Revocable Trust)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:45,type:"LP",name:"Noah Levy",firm:"",title:"",email:"Noahnlevy@gmail.com",phone:"(847) 477-4613",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($100k) and 801 W Madison ($100k) personally",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:46,type:"LP",name:"Ross Levy",firm:"",title:"",email:"levy.ross@gmail.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k via Ross Levy Trust)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Missing phone."},
  {id:47,type:"LP",name:"Dean Lurie",firm:"SPK Law",title:"",email:"dlurie@spklaw.com",phone:"(312) 286-5005",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:25000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 19400 Ravine ($25k) and 18 W Merchant ($25k). Also Knob Town Investors.",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 9. Not yet accessed."},
  {id:48,type:"LP",name:"Drew Marticke",firm:"",title:"",email:"dmarticke@gmail.com",phone:"(917) 860-2630",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Major repeat investor — 19400 Ravine ($200k) and 2616 N Clark ($200k)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:49,type:"LP",name:"Ethan Meers",firm:"Kinship Capital",title:"",email:"ethan.meers@kinshipcapital.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:50,type:"LP",name:"Alan Mellovitz",firm:"",title:"",email:"amellov2@gmail.com",phone:"(847) 363-5860",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k personally)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:51,type:"LP",name:"Jordan Mellovitz",firm:"3 Edgewood",title:"",email:"jordan.mellovitz@3edgewood.com",phone:"(847) 254-5860",linkedinUrl:"",status:"Data room accessed",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($33k personally)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room accessed Mar 18."},
  {id:52,type:"LP",name:"Jonathan Metzl",firm:"Cushman & Wakefield",title:"",email:"jonathan.metzl@cushwake.com",phone:"(773) 771-9680",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 19400 Ravine ($50k), 18 W Merchant ($50k), 801 W Madison ($50k)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 9. Not yet accessed."},
  {id:53,type:"LP",name:"Max Meyers",firm:"Anagram Capital",title:"",email:"max@anagramcapital.com",phone:"(312) 933-5498",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"Private Equity",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:54,type:"LP",name:"Ian Murphy",firm:"IJM Ventures",title:"",email:"ian@ijmurphyventures.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:25000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($25k via IJM RE Investment LLC)",whatTheyCareAbout:"",howWeKnowThem:"18 W Merchant investor",nextStep:"",notes:"Data room granted Mar 9. Not yet accessed."},
  {id:55,type:"LP",name:"Steven B. Nasatir",firm:"JUF",title:"",email:"stevennasatir@juf.org",phone:"(312) 560-7597",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:25000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($25k), 2616 N Clark ($25k), 801 W Madison ($50k)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 9. Not yet accessed."},
  {id:56,type:"LP",name:"Tony Olson",firm:"Webster Capital Management",title:"",email:"tolson@webstercm.com",phone:"(847) 867-7932",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:57,type:"LP",name:"Noah O'Neill",firm:"Stone Real Estate",title:"",email:"noah@stonerealestate.com",phone:"(312) 343-2683",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k personally)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:58,type:"LP",name:"Mason Phelps",firm:"",title:"",email:"mason1741@gmail.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:59,type:"LP",name:"Josh Piuma",firm:"KF Partners",title:"",email:"josh@kf-partners.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"Family Office",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""},
  {id:60,type:"LP",name:"Lisa Rome",firm:"Lisa S. Rome Revocable Trust",title:"",email:"luckymia18@gmail.com",phone:"(918) 691-6446",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($25k via Lisa S. Rome Revocable Trust)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:61,type:"LP",name:"Daniel Rosen",firm:"Renovo Financial",title:"",email:"drosen@renovofinancial.com",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:25000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 19400 Ravine ($25k), 18 W Merchant ($25k).",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Missing phone. Data room granted Mar 9."},
  {id:62,type:"LP",name:"Robert Rothschild",firm:"Rothschild Agency",title:"",email:"rob@rothschildagency.com",phone:"(219) 680-6960",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:25000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($50k) and 2616 N Clark ($25k)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 9. Not yet accessed."},
  {id:63,type:"LP",name:"Allen Samuel",firm:"",title:"",email:"allenbsam@gmail.com",phone:"(312) 498-4905",linkedinUrl:"",status:"In conversation",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($50k via Lesley M. Samuel Revocable Living Trust)",whatTheyCareAbout:"",howWeKnowThem:"18 W Merchant investor",nextStep:"",notes:"Data room accessed Mar 10."},
  {id:64,type:"LP",name:"Joe Sauer",firm:"Abbell",title:"",email:"joe@abbell.com",phone:"(312) 961-8748",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:25000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 19400 Ravine ($25k) and 18 W Merchant ($25k)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 9. Not yet accessed."},
  {id:65,type:"LP",name:"Roger Schoenfeld",firm:"CK Capital",title:"",email:"rschoenfeld@ckcap.com",phone:"(847) 732-2162",linkedinUrl:"",status:"In conversation",priority:"High",likelihood:50,expectedAmount:50000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($50k), 2616 N Clark ($50k), 801 W Madison ($50k)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"Reach out after April 9 meeting to confirm funding date",notes:"Phone call Mar 18 — LIKELY IN FOR $50K. Follow up after April 9 meeting for funding date."},
  {id:66,type:"LP",name:"Lawrence Segal",firm:"Lawrence Segal Trust",title:"",email:"lawrence@legalsegal.com",phone:"(310) 550-4840",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 2616 N Clark ($50k via Lawrence Segal Trust)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:67,type:"LP",name:"Kurt Siedensticker",firm:"Starshot Ventures",title:"",email:"kurt@starshot.ventures",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:68,type:"LP",name:"Morris Silverman",firm:"USAN Financial / MS Investment",title:"",email:"ms@usanfsc.com",phone:"(847) 919-4800",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Major repeat investor — 2616 N Clark ($100k), 1431 W Taylor ($273k+), 801 W Madison ($300k) via MS Investment Holding",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Annette Wax accessed data room Mar 18."},
  {id:69,type:"LP",name:"Richard Silverman",firm:"MJK Real Estate",title:"",email:"rs@mjkre.com",phone:"(847) 530-9512",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($50k), 1431 W Taylor ($59k+) personally",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:70,type:"LP",name:"Mike Simpson",firm:"Torburn",title:"",email:"msimpson@torburn.com",phone:"(847) 858-5103",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:null,expectedAmount:null,tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:"Data room granted Mar 24. Not yet accessed."},
  {id:71,type:"LP",name:"Seth Singerman",firm:"Singerman Real Estate",title:"",email:"ssingerman@singermanre.com",phone:"(312) 543-8599",linkedinUrl:"",status:"Data room accessed",priority:"High",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($50k personally)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room accessed Mar 19."},
  {id:72,type:"LP",name:"Shoshana Vernick",firm:"Avathon Capital",title:"",email:"svernick@avathoncapital.com",phone:"(312) 286-4527",linkedinUrl:"",status:"Data room accessed",priority:"High",likelihood:50,expectedAmount:100000,tag:"18 W Investor",bio:"",relationship:"Major repeat investor — 19400 Ravine ($100k), 18 W Merchant ($100k), 2616 N Clark ($100k), 1431 W Taylor ($182k+), 801 W Madison ($100k)",whatTheyCareAbout:"",howWeKnowThem:"Multi-deal investor",nextStep:"",notes:"Kevin Vernick accessed data room Mar 9."},
  {id:73,type:"LP",name:"Jay Weaver",firm:"Quartz Lake Capital",title:"Co-GP",email:"weaver@quartzlakecap.com",phone:"(312) 925-0792",linkedinUrl:"",status:"Committed",priority:"High",likelihood:100,expectedAmount:128630,tag:"Co-GP",bio:"",relationship:"Co-GP. NB Expansion GP Fund ($102.9k committed via Jay Weaver).",whatTheyCareAbout:"",howWeKnowThem:"Co-GP / internal",nextStep:"",notes:"Closed / committed."},
  {id:74,type:"LP",name:"Tyler Weinberg",firm:"2616 N Clark Investors LLC",title:"",email:"tylerweinberg@gmail.com",phone:"(410) 913-6602",linkedinUrl:"",status:"Deck sent",priority:"High",likelihood:50,expectedAmount:50000,tag:"2616 N Clark",bio:"",relationship:"Prior investor in 2616 N Clark ($250k via 2616 N Clark Investors LLC)",whatTheyCareAbout:"",howWeKnowThem:"2616 N Clark investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:75,type:"LP",name:"Kevin Werner",firm:"Renovo Financial",title:"Co-GP",email:"kevin@renovofinancial.com",phone:"(312) 543-1379",linkedinUrl:"",status:"Committed",priority:"High",likelihood:100,expectedAmount:257260,tag:"Co-GP",bio:"",relationship:"Co-GP. Prior investor in 19400 Ravine ($75k), 18 W Merchant ($75k), NB Expansion GP Fund ($205.8k).",whatTheyCareAbout:"",howWeKnowThem:"Co-GP / internal",nextStep:"",notes:"Closed / committed."},
  {id:76,type:"LP",name:"Brad Zaransky",firm:"MZ Capital Partners",title:"",email:"brad@mzcapitalpartners.com",phone:"(847) 370-9004",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"Grand Beach",bio:"",relationship:"Prior investor in 19400 Ravine ($25k personally)",whatTheyCareAbout:"",howWeKnowThem:"Grand Beach investor",nextStep:"",notes:"Data room granted Mar 18. Not yet accessed."},
  {id:77,type:"LP",name:"Lisa Zhao",firm:"",title:"",email:"lisa.q.zhao@gmail.com",phone:"(312) 307-4185",linkedinUrl:"",status:"Data room accessed",priority:"Medium",likelihood:50,expectedAmount:50000,tag:"18 W Investor",bio:"",relationship:"Prior investor in 18 W Merchant ($50k via Qin Lisa Zhao Revocable Trust)",whatTheyCareAbout:"",howWeKnowThem:"18 W Merchant investor",nextStep:"",notes:"Data room accessed Mar 16."},
  {id:2001,type:"Lender",name:"Kevin Murphy",firm:"Burling Bank",title:"",email:"kmurphy@burlingbank.com",phone:"",linkedinUrl:"",status:"Outreach sent",priority:"Medium",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"Follow-up",notes:"Owner: Jimmy. Stage: Target."},
  {id:2002,type:"Lender",name:"Bruce Piekarski",firm:"Horizon Bank",title:"",email:"bpiekarski@horizonbank.com",phone:"",linkedinUrl:"",status:"Term sheet requested",priority:"High",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"Receive term sheet",notes:"Co-contact: Stacey Stephens. Owner: Jimmy."},
  {id:2003,type:"Lender",name:"Jim Lesko",firm:"Green State Credit Union",title:"",email:"",phone:"",linkedinUrl:"",status:"Outreach sent",priority:"Medium",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"Follow-up",notes:"Owner: Jimmy."},
  {id:2004,type:"Lender",name:"Mark Ptacek",firm:"Heartland Bank",title:"",email:"",phone:"",linkedinUrl:"",status:"Outreach sent",priority:"Medium",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"Follow-up",notes:"Co-contact: Jeff Wisenwski. Owner: Jimmy."},
  {id:2005,type:"Lender",name:"Ben Bochnowski",firm:"Centier Bank",title:"",email:"",phone:"",linkedinUrl:"",status:"Outreach sent",priority:"Medium",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"Follow-up",notes:"Owner: Jimmy."},
  {id:2006,type:"Lender",name:"Chris Metcalf",firm:"PanAmerican Bank",title:"",email:"",phone:"",linkedinUrl:"",status:"Outreach sent",priority:"High",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"In-person meeting",notes:"In-person meeting scheduled 3/26 @ 2PM. Owner: Jimmy."},
];

const DEFAULT_MILES=[
  {id:1,label:"Project Entitlements",start:"2025-07-01",end:"2026-05-01",phase:"Initiation"},
  {id:2,label:"Design Development",start:"2025-07-01",end:"2026-02-01",phase:"Planning"},
  {id:3,label:"GC Budgeting",start:"2025-10-01",end:"2026-02-01",phase:"Planning"},
  {id:4,label:"Site Plan Submittal",start:"2026-02-01",end:"2026-04-01",phase:"Execution"},
  {id:5,label:"LP Fundraising",start:"2026-03-01",end:"2026-05-01",phase:"Execution"},
  {id:6,label:"Construction Documents",start:"2026-03-01",end:"2026-06-01",phase:"Execution"},
  {id:7,label:"Permitting",start:"2026-05-01",end:"2026-06-15",phase:"Execution"},
  {id:8,label:"Demo / Break Ground",start:"2026-06-01",end:"2026-07-01",phase:"Execution"},
  {id:9,label:"Construction",start:"2026-06-01",end:"2027-02-01",phase:"Execution"},
  {id:10,label:"FF&E / Punchlist",start:"2027-02-01",end:"2027-04-01",phase:"Go Live"},
  {id:11,label:"Marketing / Photography",start:"2027-01-01",end:"2027-04-01",phase:"Go Live"},
  {id:12,label:"Grand Opening",start:"2027-04-01",end:"2027-07-01",phase:"Go Live"},
];

const DEFAULT_TASKS=[
  {id:1,title:"Close on 109 N Barton parcel",owner:"Jonathan",due:"2026-06-01",priority:"High",status:"In progress",notes:"Under contract. Needs ZBA parking variance and final site plan."},
  {id:2,title:"Submit final site plan",owner:"Jimmy",due:"2026-04-15",priority:"High",status:"To do",notes:""},
  {id:3,title:"Complete LP fundraising",owner:"Matt",due:"2026-05-15",priority:"High",status:"In progress",notes:"77 prospects in JS. Roger Schoenfeld likely in for $50k — follow up after April 9."},
  {id:4,title:"Secure construction loan",owner:"Jimmy",due:"2026-06-01",priority:"High",status:"In progress",notes:"PanAmerican meeting 3/26. Horizon term sheet pending."},
  {id:5,title:"Finalize GMP with OSLO Builders",owner:"Jonathan",due:"2026-05-01",priority:"High",status:"To do",notes:""},
  {id:6,title:"Engage interior design team",owner:"Jackson",due:"2026-07-01",priority:"Medium",status:"To do",notes:"Rebel House Interior Design already on project team."},
  {id:7,title:"Long-lead procurement",owner:"Jimmy",due:"2026-07-01",priority:"Medium",status:"To do",notes:"FF&E & OS&E budget: $542,932"},
  {id:8,title:"Building permit submittal",owner:"Jonathan",due:"2026-05-01",priority:"High",status:"To do",notes:""},
];

// ── Shared styles ──────────────────────────────────────────────────────────
const card={background:B.white,border:`1px solid ${B.steel}`,borderRadius:8,padding:"1rem 1.25rem"};
const statCard=(accent=B.navy)=>({background:accent,borderRadius:6,padding:"14px 16px"});
const btn=(ghost=false)=>({fontSize:11,padding:"7px 16px",borderRadius:4,cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:FONT,fontWeight:600,background:ghost?"transparent":B.navy,color:ghost?B.navy:B.white,border:ghost?`1px solid ${B.navy}`:"none"});
const inputStyle={fontSize:13,fontFamily:FONT,border:`1px solid ${B.steel}`,borderRadius:4,padding:"7px 10px",color:B.navy,background:B.white,width:"100%",boxSizing:"border-box"};
const labelStyle={fontSize:11,color:B.muted,display:"block",marginBottom:4,letterSpacing:"0.05em",textTransform:"uppercase"};

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({contacts,tasks,miles}){
  const lps=contacts.filter(c=>c.type==="LP");
  const lenders=contacts.filter(c=>c.type==="Lender");
  const committed=lps.filter(c=>c.status==="Committed").reduce((s,c)=>s+(Number(c.expectedAmount)||0),0);
  const weighted=lps.filter(c=>c.expectedAmount&&c.likelihood).reduce((s,c)=>s+(Number(c.expectedAmount)||0)*(Number(c.likelihood)||0)/100,0);
  const warm=lps.filter(c=>["Data room accessed","In conversation","Soft commit"].includes(c.status)).length;
  const activeLenders=lenders.filter(c=>!["Not contacted","Passed"].includes(c.status)).length;
  const highTasks=tasks.filter(t=>t.priority==="High"&&t.status!=="Done").length;
  const phaseColors={"Initiation":B.navy,"Planning":B.sage,"Execution":B.blue,"Go Live":B.gold};
  const GS=new Date("2025-07-01"),GE=new Date("2027-07-01"),GT=GE-GS;
  const toPct=d=>((new Date(d)-GS)/GT)*100;
  const nowPct=Math.min(100,Math.max(0,((today-GS)/GT)*100));
  const urgentTasks=tasks.filter(t=>t.priority==="High"&&t.status!=="Done").slice(0,4);
  const warmLPs=lps.filter(c=>["Data room accessed","In conversation","Soft commit"].includes(c.status)).slice(0,5);

  return(
    <div style={{padding:"1.25rem 0"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:"1.25rem"}}>
        {[["LP Pipeline (weighted)",fmt$(Math.round(weighted)),B.navy],["Committed capital",fmt$(committed),"#2a6b3f"],["Warm prospects",warm,B.blue],["Active lenders",activeLenders,B.sage]].map(([l,v,c])=>(
          <div key={l} style={statCard(c)}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
            <div style={{fontSize:24,fontWeight:700,color:B.white}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
        <div style={card}>
          <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>Project timeline</div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.muted,marginBottom:4}}><span>Jul 2025</span><span>Today</span><span>Jul 2027</span></div>
            <div style={{height:6,background:B.light,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${nowPct}%`,background:B.blue,borderRadius:3}}/></div>
          </div>
          {miles.slice(0,6).map(m=>{
            const s=new Date(m.start),e=new Date(m.end);
            const left=toPct(m.start),width=((e-s)/GT)*100;
            return(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{fontSize:11,color:B.navy,width:160,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</div>
                <div style={{flex:1,height:6,background:B.light,borderRadius:3,position:"relative"}}>
                  <div style={{position:"absolute",left:`${left}%`,width:`${Math.max(width,2)}%`,height:"100%",background:phaseColors[m.phase]||B.muted,borderRadius:3}}/>
                </div>
              </div>
            );
          })}
        </div>
        <div style={card}>
          <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>
            High-priority tasks <span style={{marginLeft:8,background:B.danger+"20",color:B.danger,padding:"1px 6px",borderRadius:3,fontSize:10}}>{highTasks} open</span>
          </div>
          {urgentTasks.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${B.light}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:B.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:B.white,fontWeight:700,flexShrink:0}}>{t.owner?.[0]}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:B.navy}}>{t.title}</div>
                <div style={{fontSize:11,color:B.muted,marginTop:1}}>{t.owner} · Due {t.due||"TBD"}</div>
              </div>
              <Badge label={t.status} color={t.status==="In progress"?B.blue:t.status==="Blocked"?B.danger:B.muted}/>
            </div>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={{fontSize:11,letterSpacing:"0.07em",textTransform:"uppercase",color:B.muted,fontWeight:600,marginBottom:"0.75rem"}}>Warm LP pipeline</div>
        {warmLPs.length===0?<div style={{fontSize:13,color:B.muted}}>No warm prospects yet.</div>:
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {warmLPs.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${B.light}`}}>
                <Avatar name={c.name} color={B.navy}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:B.navy}}>{c.name}</div>
                  <div style={{fontSize:11,color:B.muted}}>{c.firm||c.tag||""}</div>
                </div>
                <div style={{fontSize:13,color:B.navy,fontWeight:600}}>{fmt$(c.expectedAmount)}</div>
                <div style={{display:"flex",alignItems:"center",fontSize:11,color:statCol(c.status)}}><Pip color={statCol(c.status)}/>{c.status}</div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

// ── CRM ────────────────────────────────────────────────────────────────────
const EMPTY_LP={id:null,type:"LP",name:"",firm:"",title:"",email:"",phone:"",linkedinUrl:"",status:"Deck sent",priority:"Medium",likelihood:"",expectedAmount:"",tag:"",bio:"",relationship:"",whatTheyCareAbout:"",howWeKnowThem:"",nextStep:"",notes:""};
const EMPTY_LN={id:null,type:"Lender",name:"",firm:"",title:"",email:"",phone:"",linkedinUrl:"",status:"Not contacted",priority:"Medium",projectedLoanAmount:"",loanType:"Construction-to-perm",dealsDone:"",minLoanSize:"",maxLoanSize:"",ltcAppetite:"",geographies:"",bio:"",nextStep:"",notes:""};

function CRM({contacts,setContacts}){
  const [tab,setTab]=useState("LP");
  const [sf,setSf]=useState("All");
  const [tf,setTf]=useState("All");
  const [q,setQ]=useState("");
  const [view,setView]=useState("list");
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState(EMPTY_LP);

  const statuses=tab==="LP"?LP_STATUSES:LN_STATUSES;
  const lpTags=["All",...Array.from(new Set(contacts.filter(c=>c.type==="LP"&&c.tag).map(c=>c.tag))).sort()];
  const visible=contacts.filter(c=>{
    if(c.type!==tab)return false;
    if(sf!=="All"&&c.status!==sf)return false;
    if(tab==="LP"&&tf!=="All"&&c.tag!==tf)return false;
    if(q&&!`${c.name} ${c.firm} ${c.email} ${c.tag||""}`.toLowerCase().includes(q.toLowerCase()))return false;
    return true;
  });

  const lps=contacts.filter(c=>c.type==="LP");
  const lnds=contacts.filter(c=>c.type==="Lender");
  const lpExp=lps.filter(c=>c.expectedAmount).reduce((s,c)=>s+(Number(c.expectedAmount)||0),0);
  const lpW=lps.filter(c=>c.expectedAmount&&c.likelihood).reduce((s,c)=>s+(Number(c.expectedAmount)||0)*(Number(c.likelihood)||0)/100,0);
  const lpWarm=lps.filter(c=>["Data room accessed","In conversation","Soft commit"].includes(c.status)).length;
  const lnTotal=lnds.reduce((s,c)=>s+(Number(c.projectedLoanAmount)||0),0);

  function openNew(){setForm(tab==="LP"?{...EMPTY_LP,id:Date.now()}:{...EMPTY_LN,id:Date.now()});setView("form");}
  function openEdit(c){setForm({...c});setView("form");}
  function openDetail(c){setSel(c);setView("detail");}
  function goBack(){setView("list");setSel(null);}
  function submit(){
    const ex=contacts.find(c=>c.id===form.id);
    const up=ex?contacts.map(c=>c.id===form.id?{...form}:c):[...contacts,{...form}];
    setContacts(up);
    if(sel?.id===form.id)setSel({...form});
    setView(sel?.id===form.id?"detail":"list");
  }
  function del(id){setContacts(contacts.filter(c=>c.id!==id));goBack();}

  const tabBtn=active=>({fontSize:11,padding:"8px 18px",background:"none",border:"none",borderBottom:active?`2px solid ${B.navy}`:"2px solid transparent",fontWeight:active?700:400,color:active?B.navy:B.muted,cursor:"pointer",marginBottom:-1,letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:FONT});

  if(view==="detail"&&sel){
    const c=contacts.find(x=>x.id===sel.id)||sel;
    return(
      <div style={{padding:"1rem 0"}}>
        <div style={{display:"flex",gap:8,marginBottom:"1rem"}}>
          <button onClick={goBack} style={btn(true)}>← Back</button>
          <button onClick={()=>openEdit(c)} style={btn()}>Edit</button>
          <button onClick={()=>del(c.id)} style={{...btn(),background:B.danger}}>Delete</button>
        </div>
        <div style={card}>
          <div style={{display:"flex",gap:14,marginBottom:"1rem",alignItems:"flex-start"}}>
            <Avatar name={c.name} color={c.type==="LP"?B.navy:B.sage}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <h3 style={{margin:0,fontSize:17,fontWeight:700,color:B.navy}}>{c.name||"Unnamed"}</h3>
                <Badge label={c.type} color={c.type==="LP"?B.navy:B.sage}/>
                <Badge label={c.priority} color={c.priority==="High"?B.danger:c.priority==="Low"?B.muted:B.blue}/>
                {c.tag&&<Badge label={c.tag} color={B.sage}/>}
              </div>
              <div style={{fontSize:13,color:B.muted,marginTop:3}}>{[c.title,c.firm].filter(Boolean).join(" · ")}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",fontSize:12,color:statCol(c.status),fontWeight:600}}><Pip color={statCol(c.status)}/>{c.status}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px 20px",marginBottom:"1rem",paddingTop:"1rem",borderTop:`1px solid ${B.light}`}}>
            <Field label="Email" value={c.email}/>
            <Field label="Phone" value={c.phone}/>
            {c.type==="LP"&&<><Field label="Likelihood" value={c.likelihood?`${c.likelihood}%`:null}/><Field label="Expected amount" value={fmt$(c.expectedAmount)}/><Field label="How we know them" value={c.howWeKnowThem}/><Field label="What they care about" value={c.whatTheyCareAbout}/></>}
            {c.type==="Lender"&&<><Field label="Projected loan" value={fmt$(c.projectedLoanAmount)}/><Field label="Loan type" value={c.loanType}/><Field label="LTC appetite" value={c.ltcAppetite?`${c.ltcAppetite}%`:null}/><Field label="Geographies" value={c.geographies}/><Field label="Deals done" value={c.dealsDone}/></>}
          </div>
          {c.relationship&&<div style={{marginBottom:"0.75rem"}}><div style={labelStyle}>Prior deal history</div><div style={{fontSize:13,color:B.navy,lineHeight:1.6}}>{c.relationship}</div></div>}
          {c.bio&&<div style={{marginBottom:"0.75rem"}}><div style={labelStyle}>Bio</div><div style={{fontSize:13,color:B.navy,lineHeight:1.6}}>{c.bio}</div></div>}
          {c.nextStep&&<div style={{background:"#e8f0f7",borderRadius:6,padding:"10px 14px",marginBottom:"0.75rem"}}><div style={{...labelStyle,color:B.blue}}>Next step</div><div style={{fontSize:13,color:B.navy}}>{c.nextStep}</div></div>}
          {c.notes&&<div><div style={labelStyle}>Notes</div><div style={{fontSize:13,color:B.navy,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{c.notes}</div></div>}
        </div>
      </div>
    );
  }

  if(view==="form"){
    const F=({label,field,type="text",opts,span})=>(
      <div style={span?{gridColumn:"span 2"}:{}}>
        <label style={labelStyle}>{label}</label>
        {opts?<select value={form[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} style={inputStyle}>{opts.map(o=><option key={o}>{o}</option>)}</select>
        :<input type={type} value={form[field]||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} style={inputStyle}/>}
      </div>
    );
    return(
      <div style={{padding:"1rem 0"}}>
        <div style={{display:"flex",gap:8,marginBottom:"1rem"}}><button onClick={()=>setView(sel?"detail":"list")} style={btn(true)}>Cancel</button></div>
        <div style={card}>
          <h3 style={{margin:"0 0 1rem",fontSize:15,fontWeight:700,color:B.navy,letterSpacing:"0.04em",textTransform:"uppercase"}}>{contacts.find(c=>c.id===form.id)?"Edit":"New"} {form.type}</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 16px"}}>
            <F label="Name" field="name"/><F label="Firm" field="firm"/>
            <F label="Title" field="title"/><F label="Email" field="email" type="email"/>
            <F label="Phone" field="phone" type="tel"/><F label="LinkedIn URL" field="linkedinUrl" type="url"/>
            <F label="Status" field="status" opts={form.type==="LP"?LP_STATUSES:LN_STATUSES}/>
            <F label="Priority" field="priority" opts={PRIORITIES}/>
            {form.type==="LP"&&<>
              <F label="Expected amount ($)" field="expectedAmount" type="number"/>
              <F label="Likelihood (%)" field="likelihood" type="number"/>
              <F label="Tag" field="tag"/><F label="How we know them" field="howWeKnowThem"/>
              <F label="What they care about" field="whatTheyCareAbout" span/>
            </>}
            {form.type==="Lender"&&<>
              <F label="Projected loan ($)" field="projectedLoanAmount" type="number"/>
              <F label="Loan type" field="loanType" opts={["Construction-to-perm","Bridge","Construction only","Permanent","SBA","Other"]}/>
              <F label="Min loan ($)" field="minLoanSize" type="number"/><F label="Max loan ($)" field="maxLoanSize" type="number"/>
              <F label="LTC appetite (%)" field="ltcAppetite" type="number"/><F label="Geographies" field="geographies"/>
              <F label="Deals done together" field="dealsDone" span/>
            </>}
          </div>
          {["relationship","bio","nextStep","notes"].map(f=>(
            <div key={f} style={{marginTop:12}}>
              <label style={labelStyle}>{f==="relationship"?"Prior deal history":f==="nextStep"?"Next step":f}</label>
              <textarea value={form[f]||""} onChange={e=>setForm(fm=>({...fm,[f]:e.target.value}))} rows={f==="notes"?4:2} style={{...inputStyle,resize:"vertical"}}/>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:"1rem"}}><button onClick={submit} style={btn()}>Save contact</button></div>
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:"1rem 0"}}>
      <div style={{display:"flex",gap:0,marginBottom:"1rem",borderBottom:`1px solid ${B.steel}`}}>
        {["LP","Lender"].map(t=>(
          <button key={t} onClick={()=>{setTab(t);setSf("All");setTf("All");}} style={tabBtn(tab===t)}>
            {t}s ({contacts.filter(c=>c.type===t).length})
          </button>
        ))}
        <div style={{flex:1}}/>
        <button onClick={openNew} style={{...btn(),fontSize:11,margin:"4px 0"}}>+ Add {tab}</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:"1rem"}}>
        {(tab==="LP"
          ?[["Prospects",lps.length],["Expected (gross)",fmt$(lpExp)],["Weighted pipeline",fmt$(Math.round(lpW))],["Warm / active",lpWarm]]
          :[["Lenders",lnds.length],["Projected loan",fmt$(lnTotal)],["Target",fmt$(5925000)],["Active",lnds.filter(c=>!["Not contacted","Passed"].includes(c.status)).length]]
        ).map(([l,v])=>(
          <div key={l} style={statCard()}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.65)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>{l}</div>
            <div style={{fontSize:20,fontWeight:700,color:B.white}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap"}}>
        <input placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} style={{...inputStyle,flex:1,minWidth:140}}/>
        <select value={sf} onChange={e=>setSf(e.target.value)} style={{...inputStyle,width:"auto"}}><option>All</option>{statuses.map(s=><option key={s}>{s}</option>)}</select>
        {tab==="LP"&&<select value={tf} onChange={e=>setTf(e.target.value)} style={{...inputStyle,width:"auto"}}>{lpTags.map(t=><option key={t}>{t}</option>)}</select>}
      </div>
      {visible.length===0
        ?<div style={{textAlign:"center",padding:"3rem",color:B.muted,fontSize:14}}>{contacts.filter(c=>c.type===tab).length===0?"No contacts yet.":"No contacts match your filters."}</div>
        :<div style={{display:"flex",flexDirection:"column",gap:6}}>
          {visible.map(c=>(
            <div key={c.id} onClick={()=>openDetail(c)} style={{...card,cursor:"pointer",display:"flex",alignItems:"center",gap:12,padding:"10px 14px"}}>
              <Avatar name={c.name} color={c.type==="LP"?B.navy:B.sage}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:600,fontSize:14,color:B.navy}}>{c.name||"Unnamed"}</span>
                  {c.firm&&<span style={{fontSize:12,color:B.muted}}>{c.firm}</span>}
                  {c.tag&&<Badge label={c.tag} color={B.sage}/>}
                  <Badge label={c.priority} color={c.priority==="High"?B.danger:c.priority==="Low"?B.muted:B.blue}/>
                </div>
                <div style={{display:"flex",gap:12,marginTop:3,flexWrap:"wrap"}}>
                  {c.type==="LP"&&c.expectedAmount&&<span style={{fontSize:12,color:B.muted}}>Expected: {fmt$(c.expectedAmount)}{c.likelihood?` · ${c.likelihood}%`:""}</span>}
                  {c.type==="Lender"&&c.projectedLoanAmount&&<span style={{fontSize:12,color:B.muted}}>Loan: {fmt$(c.projectedLoanAmount)}</span>}
                  {c.nextStep&&<span style={{fontSize:12,color:B.sage}}>↳ {c.nextStep}</span>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",fontSize:11,color:statCol(c.status),fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}><Pip color={statCol(c.status)}/>{c.status}</div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────
const phaseColors={"Initiation":B.navy,"Planning":B.sage,"Execution":B.blue,"Go Live":B.gold};
const GS=new Date("2025-07-01"),GE=new Date("2027-07-01"),GT=GE-GS;
const toPct=d=>((new Date(d)-GS)/GT)*100;
const wPct=(s,e)=>Math.max(((new Date(e)-new Date(s))/GT)*100,1);
const QUARTERS=[];
for(let y=2025;y<=2027;y++)for(let q=0;q<4;q++){const d=new Date(y,q*3,1);if(d>=GS&&d<=GE)QUARTERS.push({label:`Q${q+1} ${y}`,pct:toPct(d)});}

function Timeline({miles,setMiles}){
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({});
  const nowPct=toPct(today);
  function save(){setMiles(miles.map(m=>m.id===form.id?{...form}:m));setEditing(null);}
  return(
    <div style={{padding:"1rem 0"}}>
      <div style={{fontSize:11,color:B.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"1rem",display:"flex",gap:16,flexWrap:"wrap"}}>
        {Object.entries(phaseColors).map(([ph,col])=><span key={ph} style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:2,background:col,display:"inline-block"}}/>{ph}</span>)}
      </div>
      <div style={{...card,overflowX:"auto"}}>
        <div style={{display:"flex",marginBottom:8,marginLeft:180,position:"relative",height:20}}>
          {QUARTERS.map(q=><div key={q.label} style={{position:"absolute",left:`${q.pct}%`,fontSize:10,color:B.muted,letterSpacing:"0.04em",whiteSpace:"nowrap",transform:"translateX(-50%)"}}>{q.label}</div>)}
        </div>
        <div style={{position:"relative"}}>
          {miles.map(m=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}} onClick={()=>{setEditing(m.id);setForm({...m});}}>
              <div style={{width:172,flexShrink:0,fontSize:12,color:B.navy,fontWeight:editing===m.id?700:400,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</div>
              <div style={{flex:1,height:20,background:B.light,borderRadius:4,position:"relative",cursor:"pointer"}}>
                <div style={{position:"absolute",left:`${Math.max(0,toPct(m.start))}%`,width:`${wPct(m.start,m.end)}%`,height:"100%",background:phaseColors[m.phase]||B.muted,borderRadius:4,opacity:0.85}}/>
                <div style={{position:"absolute",left:`${nowPct}%`,top:0,bottom:0,width:1.5,background:B.danger,zIndex:2}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      {editing&&<div style={{...card,marginTop:"1rem"}}>
        <div style={{fontSize:12,fontWeight:700,color:B.navy,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"0.75rem"}}>Edit milestone</div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:12}}>
          <div><label style={labelStyle}>Label</label><input value={form.label||""} onChange={e=>setForm(f=>({...f,label:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>Start</label><input type="date" value={form.start||""} onChange={e=>setForm(f=>({...f,start:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>End</label><input type="date" value={form.end||""} onChange={e=>setForm(f=>({...f,end:e.target.value}))} style={inputStyle}/></div>
          <div><label style={labelStyle}>Phase</label><select value={form.phase||""} onChange={e=>setForm(f=>({...f,phase:e.target.value}))} style={inputStyle}>{Object.keys(phaseColors).map(p=><option key={p}>{p}</option>)}</select></div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={save} style={btn()}>Save</button>
          <button onClick={()=>setEditing(null)} style={btn(true)}>Cancel</button>
        </div>
      </div>}
      <div style={{fontSize:11,color:B.muted,marginTop:"0.75rem"}}>Click any milestone row to edit dates.</div>
    </div>
  );
}

// ── Tasks ──────────────────────────────────────────────────────────────────
const EMPTY_TASK={id:null,title:"",owner:"Jimmy",due:"",priority:"Medium",status:"To do",notes:""};
const statusColor={"To do":B.muted,"In progress":B.blue,"Done":"#2a6b3f","Blocked":B.danger};

function Tasks({tasks,setTasks}){
  const [form,setForm]=useState(null);
  const [filter,setFilter]=useState("All");
  const [ownerF,setOwnerF]=useState("All");
  const visible=tasks.filter(t=>(filter==="All"||t.status===filter)&&(ownerF==="All"||t.owner===ownerF));
  function save(){
    const ex=tasks.find(t=>t.id===form.id);
    setTasks(ex?tasks.map(t=>t.id===form.id?{...form}:t):[...tasks,{...form}]);
    setForm(null);
  }
  return(
    <div style={{padding:"1rem 0"}}>
      <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{...inputStyle,width:"auto"}}><option>All</option>{TASK_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select value={ownerF} onChange={e=>setOwnerF(e.target.value)} style={{...inputStyle,width:"auto"}}><option>All</option>{OWNERS.map(o=><option key={o}>{o}</option>)}</select>
        <div style={{flex:1}}/>
        <button onClick={()=>setForm({...EMPTY_TASK,id:Date.now()})} style={btn()}>+ Add task</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
        {TASK_STATUSES.map(col=>(
          <div key={col}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:statusColor[col],marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:statusColor[col],display:"inline-block"}}/>
              {col} <span style={{color:B.muted,fontWeight:400}}>({visible.filter(t=>t.status===col).length})</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {visible.filter(t=>t.status===col).map(t=>(
                <div key={t.id} onClick={()=>setForm({...t})} style={{...card,cursor:"pointer",padding:"10px 12px"}}>
                  <div style={{fontSize:13,fontWeight:600,color:B.navy,marginBottom:4}}>{t.title}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:t.notes?6:0}}>
                    <Badge label={t.priority} color={t.priority==="High"?B.danger:t.priority==="Low"?B.muted:B.blue}/>
                    <Badge label={t.owner} color={B.navy}/>
                    {t.due&&<span style={{fontSize:10,color:B.muted}}>Due {t.due}</span>}
                  </div>
                  {t.notes&&<div style={{fontSize:11,color:B.muted,lineHeight:1.5,borderTop:`1px solid ${B.light}`,paddingTop:6,marginTop:4}}>{t.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {form&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(2,29,43,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div style={{...card,width:480,maxWidth:"90vw",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontSize:13,fontWeight:700,color:B.navy,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:"1rem"}}>{tasks.find(t=>t.id===form.id)?"Edit task":"New task"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
              <div style={{gridColumn:"span 2"}}><label style={labelStyle}>Title</label><input value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={inputStyle}/></div>
              {[["Owner","owner","select",OWNERS],["Priority","priority","select",PRIORITIES],["Status","status","select",TASK_STATUSES],["Due date","due","date",null]].map(([l,f,type,opts])=>(
                <div key={f}>
                  <label style={labelStyle}>{l}</label>
                  {opts?<select value={form[f]||""} onChange={e=>setForm(fm=>({...fm,[f]:e.target.value}))} style={inputStyle}>{opts.map(o=><option key={o}>{o}</option>)}</select>
                  :<input type={type} value={form[f]||""} onChange={e=>setForm(fm=>({...fm,[f]:e.target.value}))} style={inputStyle}/>}
                </div>
              ))}
              <div style={{gridColumn:"span 2"}}><label style={labelStyle}>Notes</label><textarea value={form.notes||""} onChange={e=>setForm(fm=>({...fm,notes:e.target.value}))} rows={3} style={{...inputStyle,resize:"vertical"}}/></div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:"1rem",justifyContent:"space-between"}}>
              <div style={{display:"flex",gap:8}}>
                <button onClick={save} style={btn()}>Save</button>
                <button onClick={()=>setForm(null)} style={btn(true)}>Cancel</button>
              </div>
              {tasks.find(t=>t.id===form.id)&&<button onClick={()=>{setTasks(tasks.filter(t=>t.id!==form.id));setForm(null);}} style={{...btn(),background:B.danger}}>Delete</button>}
            </div>
          </div>
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

  useEffect(()=>{
    const cr=store.get(CRM_KEY);
    const tr=store.get(TASK_KEY);
    const mr=store.get(MILE_KEY);
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
  if(!loaded)return <div style={{fontFamily:FONT,padding:"3rem",color:B.muted,textAlign:"center",fontSize:14}}>Loading ECG Portal...</div>;

  return(
    <div style={{fontFamily:FONT,background:B.offwhite,minHeight:"100vh"}}>
      <div style={{background:B.navy,padding:"0 2rem",display:"flex",alignItems:"center",gap:0}}>
        <div style={{marginRight:32,paddingRight:32,borderRight:"1px solid rgba(255,255,255,0.15)"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:"0.1em",textTransform:"uppercase"}}>The Neighborhood Hotel</div>
          <div style={{fontSize:14,fontWeight:700,color:B.white,letterSpacing:"0.06em",textTransform:"uppercase"}}>115 N Barton</div>
        </div>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setNav(t)} style={{background:"none",border:"none",borderBottom:nav===t?"2px solid #ccd5de":"2px solid transparent",color:nav===t?B.white:"rgba(255,255,255,0.55)",fontSize:11,fontWeight:nav===t?700:400,letterSpacing:"0.07em",textTransform:"uppercase",padding:"1rem 1.25rem",cursor:"pointer",fontFamily:FONT,marginBottom:-1}}>{t}</button>
        ))}
      </div>
      <div style={{maxWidth:980,margin:"0 auto",padding:"0 1.5rem 3rem"}}>
        {nav==="Dashboard"&&<Dashboard contacts={contacts} tasks={tasks} miles={miles}/>}
        {nav==="CRM"&&<CRM contacts={contacts} setContacts={setContacts}/>}
        {nav==="Timeline"&&<Timeline miles={miles} setMiles={setMiles}/>}
        {nav==="Tasks"&&<Tasks tasks={tasks} setTasks={setTasks}/>}
      </div>
    </div>
  );
}
