import { useState, useRef, useEffect } from "react";

/* ─── localStorage hook ──────────────────────────────────────────────────── */
function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });
  const set = (v) => {
    const next = typeof v === "function" ? v(val) : v;
    setVal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };
  return [val, set];
}

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const T = {
  bg:       "#f5f2eb",
  paper:    "#faf8f3",
  ink:      "#1a1a18",
  inkMid:   "#5a5a55",
  inkLight: "#9a9a90",
  line:     "#dedad2",
  accent:   "#c0392b",
  accentBg: "#fdf0ee",
  blue:     "#2471a3",
  blueBg:   "#eaf2fb",
  green:    "#1e8449",
  greenBg:  "#eafaf1",
  yellow:   "#b7950b",
  yellowBg: "#fef9e7",
  purple:   "#7d3c98",
  purpleBg: "#f5eef8",
  shadow:   "0 2px 12px rgba(0,0,0,0.08)",
  radius:   10,
};

const PROJECT_COLORS = [
  { bg: T.accentBg,  text: T.accent  },
  { bg: T.blueBg,    text: T.blue    },
  { bg: T.greenBg,   text: T.green   },
  { bg: T.yellowBg,  text: T.yellow  },
  { bg: T.purpleBg,  text: T.purple  },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const formatDate = (s) => {
  if (!s) return "";
  const [y,m,d] = s.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
};
function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDOW(y,m){ return new Date(y,m,1).getDay(); }
function heatColor(n){
  if(!n) return T.line;
  if(n===1) return "#aed6c5";
  if(n===2) return "#5cb89a";
  return T.green;
}
let _id = Date.now();
const uid = () => String(++_id);

/* ─── Shared UI ───────────────────────────────────────────────────────────── */
const inp = (extra={}) => ({
  width:"100%", boxSizing:"border-box",
  background:T.paper, border:`1.5px solid ${T.line}`,
  borderRadius:8, padding:"9px 12px",
  fontFamily:"'Lora',serif", fontSize:13.5, color:T.ink,
  outline:"none", ...extra,
});

function Btn({ children, onClick, variant="primary", style={} }){
  const base = { border:"none", borderRadius:8, padding:"9px 20px", fontSize:13,
    fontWeight:700, cursor:"pointer", fontFamily:"'Lora',serif", transition:"opacity .15s", ...style };
  const themes = {
    primary: { background:T.accent, color:"#fff" },
    ghost:   { background:"none", color:T.inkMid, border:`1.5px solid ${T.line}` },
    dashed:  { background:"none", color:T.blue, border:`1.5px dashed ${T.blue}`, width:"100%" },
  };
  return <button onClick={onClick} style={{...base,...themes[variant]}}>{children}</button>;
}

function Badge({ label, colorPair }){
  return <span style={{ background:colorPair.bg, color:colorPair.text,
    borderRadius:99, padding:"2px 10px", fontSize:11.5, fontWeight:700 }}>{label}</span>;
}

function Card({ children, style={} }){
  return <div style={{ background:T.paper, borderRadius:T.radius, border:`1px solid ${T.line}`,
    boxShadow:T.shadow, ...style }}>{children}</div>;
}

function SectionTitle({ icon, title }){
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:T.ink }}>{title}</span>
    </div>
  );
}

function EmptyState({ msg }){
  return <div style={{ textAlign:"center", color:T.inkLight, fontSize:13, padding:"28px 0" }}>{msg}</div>;
}

/* ─── Upload zone ─────────────────────────────────────────────────────────── */
function UploadZone({ accept, onFiles, label }){
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handle = f => { if(f.length) onFiles(f); };
  return (
    <div onClick={()=>ref.current.click()}
      onDragOver={e=>{e.preventDefault();setDrag(true)}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files)}}
      style={{ border:`2px dashed ${drag?T.blue:T.line}`, borderRadius:8, padding:"18px 12px",
        textAlign:"center", cursor:"pointer", background:drag?T.blueBg:"transparent", transition:"all .2s" }}>
      <div style={{fontSize:22,marginBottom:4}}>📎</div>
      <div style={{color:T.inkLight,fontSize:12.5}}>{label}</div>
      <input ref={ref} type="file" accept={accept} multiple style={{display:"none"}}
        onChange={e=>handle(e.target.files)}/>
    </div>
  );
}

/* ─── Heatmap ─────────────────────────────────────────────────────────────── */
function Heatmap({ records, onDayClick }){
  const today = new Date();
  const [year,setYear]   = useState(today.getFullYear());
  const [month,setMonth] = useState(today.getMonth());
  const MONTHS = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
  const WDAYS  = ["日","一","二","三","四","五","六"];

  const counts = {};
  records.forEach(r=>{ if(r.date) counts[r.date]=(counts[r.date]||0)+1; });

  const days=getDaysInMonth(year,month), first=getFirstDOW(year,month);
  const cells=[...Array(first).fill(null),...Array.from({length:days},(_,i)=>{
    const d=String(i+1).padStart(2,"0");
    const key=`${year}-${String(month+1).padStart(2,"0")}-${d}`;
    return {day:i+1,key,count:counts[key]||0};
  })];

  const prev=()=>month===0?(setMonth(11),setYear(y=>y-1)):setMonth(m=>m-1);
  const next=()=>month===11?(setMonth(0),setYear(y=>y+1)):setMonth(m=>m+1);
  const prefix=`${year}-${String(month+1).padStart(2,"0")}`;
  const active=Object.keys(counts).filter(k=>k.startsWith(prefix)).length;
  const total=Object.entries(counts).filter(([k])=>k.startsWith(prefix)).reduce((s,[,v])=>s+v,0);

  return (
    <Card style={{padding:22}}>
      <SectionTitle icon="🌡" title="实验热图"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <button onClick={prev} style={{background:"none",border:`1px solid ${T.line}`,borderRadius:6,
          width:30,height:30,cursor:"pointer",color:T.inkMid,fontSize:16}}>‹</button>
        <span style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:T.ink}}>
          {year} · {MONTHS[month]}
        </span>
        <button onClick={next} style={{background:"none",border:`1px solid ${T.line}`,borderRadius:6,
          width:30,height:30,cursor:"pointer",color:T.inkMid,fontSize:16}}>›</button>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        {[{label:"本月记录",val:total,bg:T.greenBg,c:T.green},{label:"活跃天数",val:active,bg:T.blueBg,c:T.blue}].map(s=>(
          <div key={s.label} style={{flex:1,background:s.bg,borderRadius:8,padding:"10px 0",textAlign:"center"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:s.c}}>{s.val}</div>
            <div style={{fontSize:11,color:T.inkLight,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
        {WDAYS.map(w=><div key={w} style={{textAlign:"center",fontSize:10.5,color:T.inkLight,fontWeight:600}}>{w}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {cells.map((c,i)=>{
          if(!c) return <div key={`e${i}`}/>;
          const isToday=c.key===todayStr();
          return (
            <div key={c.key} title={`${formatDate(c.key)} ${c.count?c.count+"条":""}`}
              onClick={()=>c.count&&onDayClick(c.key)}
              style={{aspectRatio:"1",borderRadius:5,background:heatColor(c.count),
                border:isToday?`2px solid ${T.accent}`:`2px solid transparent`,
                cursor:c.count?"pointer":"default",display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:9.5,color:c.count?"#fff":T.inkLight,fontWeight:600}}>
              {c.day}
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5,marginTop:12,justifyContent:"flex-end"}}>
        <span style={{fontSize:10.5,color:T.inkLight}}>少</span>
        {[T.line,"#aed6c5","#5cb89a",T.green].map(c=>(
          <div key={c} style={{width:11,height:11,borderRadius:3,background:c,border:`1px solid ${T.line}`}}/>
        ))}
        <span style={{fontSize:10.5,color:T.inkLight}}>多</span>
      </div>
    </Card>
  );
}

/* ─── Protocol section ────────────────────────────────────────────────────── */
function ProtocolSection({ protocols, onAdd }){
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({title:"",tags:"",notes:""});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const submit=()=>{
    if(!form.title.trim()) return;
    onAdd({id:uid(),...form,tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean),date:todayStr()});
    setForm({title:"",tags:"",notes:""}); setOpen(false);
  };
  return (
    <Card style={{padding:22}}>
      <SectionTitle icon="📋" title={`实验 Protocol（${protocols.length}）`}/>
      {!open
        ? <Btn variant="dashed" onClick={()=>setOpen(true)}>+ 添加 Protocol</Btn>
        : (
          <div style={{background:T.bg,borderRadius:8,padding:16,marginBottom:16}}>
            <input value={form.title} onChange={e=>f("title",e.target.value)} placeholder="Protocol 名称 *" style={inp()}/>
            <input value={form.tags}  onChange={e=>f("tags",e.target.value)}  placeholder="标签：PCR, Western Blot…" style={inp({marginTop:8})}/>
            <textarea value={form.notes} onChange={e=>f("notes",e.target.value)} placeholder="简要说明（可选）" rows={2}
              style={inp({marginTop:8,resize:"vertical"})}/>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn onClick={submit}>保存</Btn>
              <Btn variant="ghost" onClick={()=>setOpen(false)}>取消</Btn>
            </div>
          </div>
        )
      }
      <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:14}}>
        {protocols.length===0&&!open&&<EmptyState msg="暂无 Protocol，点击上方添加"/>}
        {protocols.map((p,i)=>(
          <div key={p.id} style={{background:T.bg,border:`1px solid ${T.line}`,borderRadius:8,
            padding:"11px 14px",display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:20,marginTop:1}}>🧪</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13.5,color:T.ink}}>{p.title}</div>
              {p.notes&&<div style={{color:T.inkMid,fontSize:12,marginTop:3}}>{p.notes}</div>}
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6,alignItems:"center"}}>
                {p.tags.map(t=><Badge key={t} label={t} colorPair={PROJECT_COLORS[i%PROJECT_COLORS.length]}/>)}
                <span style={{marginLeft:"auto",color:T.inkLight,fontSize:11}}>{formatDate(p.date)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Record form ─────────────────────────────────────────────────────────── */
function RecordForm({ projects, onSave, onCancel }){
  const [form,setForm]=useState({title:"",date:todayStr(),project:"",notes:"",images:[]});
  const [newProj,setNewProj]=useState("");
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));

  const addImages=files=>{
    const imgs=Array.from(files).filter(fi=>fi.type.startsWith("image/"))
      .map(fi=>({name:fi.name,url:URL.createObjectURL(fi)}));
    f("images",[...form.images,...imgs]);
  };

  const submit=()=>{
    if(!form.title.trim()||!form.date) return;
    const project=form.project==="__new__"?newProj.trim():form.project;
    onSave({id:uid(),...form,project,images:form.images});
  };

  return (
    <div style={{background:T.bg,borderRadius:10,padding:18,border:`1px solid ${T.line}`}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <input value={form.title} onChange={e=>f("title",e.target.value)} placeholder="实验标题 *" style={inp()}/>
        <input type="date" value={form.date} onChange={e=>f("date",e.target.value)} style={inp()}/>
      </div>
      <select value={form.project} onChange={e=>f("project",e.target.value)} style={inp({marginTop:8})}>
        <option value="">选择项目（可选）</option>
        {projects.map(p=><option key={p} value={p}>{p}</option>)}
        <option value="__new__">＋ 新建项目…</option>
      </select>
      {form.project==="__new__"&&(
        <input value={newProj} onChange={e=>setNewProj(e.target.value)} placeholder="新项目名称" style={inp({marginTop:8})}/>
      )}
      <textarea value={form.notes} onChange={e=>f("notes",e.target.value)}
        placeholder="实验过程、结果、观察…" rows={3} style={inp({marginTop:8,resize:"vertical"})}/>
      <div style={{marginTop:8}}>
        <UploadZone accept="image/*" onFiles={addImages} label="上传实验图片（可多选）"/>
      </div>
      {form.images.length>0&&(
        <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
          {form.images.map((img,i)=>(
            <div key={i} style={{position:"relative"}}>
              <img src={img.url} alt={img.name} style={{width:76,height:76,objectFit:"cover",borderRadius:8,border:`1px solid ${T.line}`}}/>
              <button onClick={()=>f("images",form.images.filter((_,j)=>j!==i))}
                style={{position:"absolute",top:-6,right:-6,background:T.accent,border:"none",
                  borderRadius:"50%",color:"#fff",width:18,height:18,cursor:"pointer",fontSize:10}}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <Btn onClick={submit}>保存记录</Btn>
        <Btn variant="ghost" onClick={onCancel}>取消</Btn>
      </div>
    </div>
  );
}

/* ─── Record card ─────────────────────────────────────────────────────────── */
function RecordCard({ record, colorPair, onDelete }){
  const [expand,setExpand]=useState(false);
  return (
    <div style={{background:T.paper,border:`1px solid ${T.line}`,borderRadius:9,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}
        onClick={()=>setExpand(e=>!e)}>
        <span style={{fontSize:18,marginTop:1}}>🔬</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13.5,color:T.ink}}>{record.title}</div>
          <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:11.5,color:T.inkLight}}>{formatDate(record.date)}</span>
            {record.project&&<Badge label={record.project} colorPair={colorPair}/>}
            {record.images&&record.images.length>0&&
              <span style={{fontSize:11,color:T.blue}}>🖼 {record.images.length}张</span>}
          </div>
        </div>
        <span style={{color:T.inkLight,fontSize:12,marginTop:2}}>{expand?"▲":"▼"}</span>
      </div>
      {expand&&(
        <div style={{borderTop:`1px solid ${T.line}`,padding:"12px 14px",background:T.bg}}>
          {record.notes&&<p style={{margin:0,color:T.inkMid,fontSize:13,lineHeight:1.7}}>{record.notes}</p>}
          {record.images&&record.images.length>0&&(
            <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
              {record.images.map((img,i)=>(
                <img key={i} src={img.url} alt={img.name}
                  style={{width:90,height:90,objectFit:"cover",borderRadius:8,border:`1px solid ${T.line}`}}/>
              ))}
            </div>
          )}
          {onDelete&&(
            <button onClick={()=>{ if(window.confirm("确认删除这条记录？")) onDelete(record.id); }}
              style={{marginTop:12,background:"none",border:`1px solid ${T.accent}`,
                color:T.accent,borderRadius:7,padding:"6px 14px",cursor:"pointer",
                fontSize:12,fontWeight:700}}>
              🗑 删除记录
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Records section ─────────────────────────────────────────────────────── */
function RecordsSection({ records, onAdd, onDelete, initialDay }){
  const [view,setView]=useState("date");
  const [addOpen,setAddOpen]=useState(false);
  const [filterDay,setFilterDay]=useState(initialDay||null);
  const [filterProj,setFilterProj]=useState(null);

  useEffect(()=>{ setFilterDay(initialDay||null); },[initialDay]);

  const projects=[...new Set(records.map(r=>r.project).filter(Boolean))];
  const projColorMap={};
  projects.forEach((p,i)=>projColorMap[p]=PROJECT_COLORS[i%PROJECT_COLORS.length]);

  let shown=[...records].reverse();
  if(filterDay)  shown=shown.filter(r=>r.date===filterDay);
  if(filterProj) shown=shown.filter(r=>r.project===filterProj);

  const grouped={};
  if(view==="date") shown.forEach(r=>{(grouped[r.date]||(grouped[r.date]=[])).push(r);});
  else              shown.forEach(r=>{const k=r.project||"未分组";(grouped[k]||(grouped[k]=[])).push(r);});
  const groupKeys=Object.keys(grouped).sort(view==="date"?(a,b)=>b.localeCompare(a):undefined);

  return (
    <Card style={{padding:22}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>🔬</span>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:T.ink}}>
            实验记录（{records.length}）
          </span>
        </div>
        <div style={{display:"flex",background:T.bg,borderRadius:8,padding:3,gap:2}}>
          {[{id:"date",label:"按日期"},{id:"project",label:"按项目"}].map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{
              background:view===v.id?T.paper:"transparent",
              border:view===v.id?`1px solid ${T.line}`:"none",
              borderRadius:6,padding:"5px 12px",cursor:"pointer",
              fontSize:12,fontWeight:600,color:view===v.id?T.ink:T.inkLight,transition:"all .15s",
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {(filterDay||filterProj)&&(
        <div style={{display:"flex",gap:6,marginBottom:14,alignItems:"center"}}>
          <span style={{fontSize:12,color:T.inkLight}}>筛选：</span>
          {filterDay&&<Badge label={`📅 ${formatDate(filterDay)}`} colorPair={{bg:T.blueBg,text:T.blue}}/>}
          {filterProj&&<Badge label={`📁 ${filterProj}`} colorPair={{bg:T.accentBg,text:T.accent}}/>}
          <button onClick={()=>{setFilterDay(null);setFilterProj(null);}}
            style={{background:"none",border:"none",color:T.accent,cursor:"pointer",fontSize:12,fontWeight:700}}>
            清除 ✕
          </button>
        </div>
      )}

      {view==="project"&&projects.length>0&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
          {projects.map(p=>(
            <button key={p} onClick={()=>setFilterProj(fp=>fp===p?null:p)} style={{
              background:filterProj===p?projColorMap[p].bg:T.bg,
              color:filterProj===p?projColorMap[p].text:T.inkMid,
              border:`1px solid ${filterProj===p?projColorMap[p].text:T.line}`,
              borderRadius:99,padding:"4px 12px",cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .15s",
            }}>{p}</button>
          ))}
        </div>
      )}

      {!addOpen
        ? <Btn variant="dashed" onClick={()=>setAddOpen(true)} style={{marginBottom:16}}>+ 新增实验记录</Btn>
        : <div style={{marginBottom:16}}>
            <RecordForm projects={projects}
              onSave={r=>{onAdd(r);setAddOpen(false);}}
              onCancel={()=>setAddOpen(false)}/>
          </div>
      }

      {shown.length===0&&<EmptyState msg="暂无记录"/>}
      {groupKeys.map(key=>(
        <div key={key} style={{marginBottom:18}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:13.5,fontWeight:700,
            color:view==="project"?(projColorMap[key]||PROJECT_COLORS[0]).text:T.accent,
            marginBottom:8,
            borderLeft:`3px solid ${view==="project"?(projColorMap[key]||PROJECT_COLORS[0]).text:T.accent}`,
            paddingLeft:10}}>
            {view==="date"?formatDate(key):key}
            <span style={{fontWeight:400,color:T.inkLight,fontSize:11.5,marginLeft:6}}>{grouped[key].length}条</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {grouped[key].map(r=>(
              <RecordCard key={r.id} record={r} colorPair={projColorMap[r.project]||PROJECT_COLORS[0]} onDelete={onDelete}/>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}

/* ─── Overview ────────────────────────────────────────────────────────────── */
function Overview({ records, protocols, onDayClick }){
  const recent=[...records].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  const projects=[...new Set(records.map(r=>r.project).filter(Boolean))];
  const projColorMap={};
  projects.forEach((p,i)=>projColorMap[p]=PROJECT_COLORS[i%PROJECT_COLORS.length]);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[
          {icon:"📋",val:protocols.length,label:"Protocol", bg:T.accentBg,c:T.accent},
          {icon:"🔬",val:records.length,  label:"实验记录",  bg:T.blueBg,  c:T.blue},
          {icon:"📁",val:projects.length, label:"项目数",    bg:T.greenBg, c:T.green},
        ].map(s=>(
          <Card key={s.label} style={{padding:"18px 14px",textAlign:"center",background:s.bg,border:`1px solid ${T.line}`}}>
            <div style={{fontSize:24}}>{s.icon}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:s.c}}>{s.val}</div>
            <div style={{fontSize:11.5,color:T.inkLight,marginTop:3}}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Heatmap records={records} onDayClick={onDayClick}/>
      {recent.length>0&&(
        <Card style={{padding:22,marginTop:20}}>
          <SectionTitle icon="⏱" title="最近记录"/>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {recent.map(r=>(
              <RecordCard key={r.id} record={r} colorPair={projColorMap[r.project]||PROJECT_COLORS[0]}/>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── Seed data ───────────────────────────────────────────────────────────── */
const SEED_RECORDS = [
  {id:"s1",title:"样品A蛋白提取",date:"2026-03-01",project:"课题一",notes:"Bradford法定量，总蛋白约2.4mg/mL，电泳条带清晰。",images:[]},
  {id:"s2",title:"HEK293传代",date:"2026-03-03",project:"课题二",notes:"传代比例1:3，细胞活力>96%，贴壁率高。",images:[]},
  {id:"s3",title:"PCR扩增验证",date:"2026-03-05",project:"课题一",notes:"目标片段500bp，特异性强，无杂带。",images:[]},
  {id:"s4",title:"免疫荧光染色",date:"2026-03-07",project:"课题三",notes:"一抗1:200孵育过夜4°C，信号强，背景低。",images:[]},
  {id:"s5",title:"流式细胞分析",date:"2026-03-07",project:"课题二",notes:"CD4+阳性率符合预期，细胞活力>95%。",images:[]},
  {id:"s6",title:"数据整理分析",date:"2026-03-09",project:"课题一",notes:"GraphPad统计，p=0.023，结果显著。",images:[]},
];
const SEED_PROTOCOLS = [
  {id:"p1",title:"Western Blot 标准流程",tags:["蛋白质","免疫"],notes:"适用于20–250kDa蛋白检测",date:"2026-02-10"},
  {id:"p2",title:"细胞培养传代 SOP",tags:["细胞培养","HEK293"],notes:"6cm皿传代标准操作",date:"2026-02-15"},
];

/* ─── App shell ───────────────────────────────────────────────────────────── */
export default function App(){
  const [tab,setTab]             = useState("overview");
  const [records,setRecords]     = useLocalStorage("labnote_records",   SEED_RECORDS);
  const [protocols,setProtocols] = useLocalStorage("labnote_protocols", SEED_PROTOCOLS);
  const [jumpDay,setJumpDay]     = useState(null);

  const handleDayClick = day => { setJumpDay(day); setTab("records"); };
  const deleteRecord = id => setRecords(rs => rs.filter(r => r.id !== id));
  useEffect(()=>{ if(tab!=="records") setJumpDay(null); },[tab]);

  const TABS=[
    {id:"overview", icon:"📊", label:"总览"},
    {id:"protocols",icon:"📋", label:"Protocol"},
    {id:"records",  icon:"🔬", label:"实验记录"},
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Lora',serif",color:T.ink}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lora:wght@400;600&display=swap');
        *{box-sizing:border-box;}
        button:hover{opacity:.85;}
        input,textarea,select{font-family:'Lora',serif!important;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-thumb{background:${T.line};border-radius:99px;}
      `}</style>

      <header style={{background:T.paper,borderBottom:`1px solid ${T.line}`,display:"flex",
        alignItems:"center",padding:"0 24px",height:58,position:"sticky",top:0,zIndex:100,gap:12}}>
        <span style={{fontSize:22}}>🧬</span>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,letterSpacing:.5}}>LabNote</span>
        <span style={{background:T.accentBg,color:T.accent,borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700}}>个人版</span>
        <span style={{marginLeft:"auto",fontSize:11,color:T.inkLight}}>数据已自动保存 💾</span>
      </header>

      <nav style={{background:T.paper,borderBottom:`1px solid ${T.line}`,display:"flex",padding:"0 20px",gap:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            background:"none",border:"none",
            borderBottom:tab===t.id?`2.5px solid ${T.accent}`:"2.5px solid transparent",
            padding:"13px 18px",cursor:"pointer",fontSize:13,fontWeight:600,
            color:tab===t.id?T.accent:T.inkMid,
            display:"flex",alignItems:"center",gap:6,transition:"color .15s",
          }}><span>{t.icon}</span>{t.label}</button>
        ))}
      </nav>

      <main style={{maxWidth:840,margin:"0 auto",padding:"24px 16px"}}>
        {tab==="overview"  && <Overview records={records} protocols={protocols} onDayClick={handleDayClick}/>}
        {tab==="protocols" && <ProtocolSection protocols={protocols} onAdd={p=>setProtocols(ps=>[...ps,p])}/>}
        {tab==="records"   && <RecordsSection records={records} onAdd={r=>setRecords(rs=>[...rs,r])} onDelete={deleteRecord} initialDay={jumpDay}/>}
      </main>
    </div>
  );
}
