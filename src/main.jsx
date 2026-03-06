import { useState, useEffect, useRef, useCallback } from "react";

// ─── Persistent Storage ───────────────────────────────────────────────────────
const DB = {
  get: (k, fallback) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// ─── Default Data ─────────────────────────────────────────────────────────────
const DEFAULT_GROUPS = [
  { id: "family",  name: "Family",  emoji: "🏠", desc: "Home sweet home", color: "#5af78e" },
  { id: "friends", name: "Friends", emoji: "🎮", desc: "The squad",        color: "#57c7ff" },
  { id: "school",  name: "School",  emoji: "📚", desc: "Study & projects", color: "#ff6ac1" },
];
const DEFAULT_CHANNELS = {
  family:  [{ id:"fam-gen",id2:"general",name:"general",type:"text"},{id:"fam-plan",name:"planning",type:"text"},{id:"fam-pics",name:"photos",type:"text"}],
  friends: [{ id:"fri-gen",name:"general",type:"text"},{id:"fri-game",name:"gaming",type:"text"},{id:"fri-memes",name:"memes",type:"text"}],
  school:  [{ id:"sch-gen",name:"general",type:"text"},{id:"sch-hw",name:"homework",type:"text"},{id:"sch-proj",name:"projects",type:"text"}],
};
const EMOJI_REACTIONS = ["👍","❤️","😂","🔥","😮","😢","🎉"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (ts) => {
  const d = new Date(ts), now = new Date();
  const same = d.toDateString() === now.toDateString();
  return same
    ? d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
    : d.toLocaleDateString([],{month:"short",day:"numeric"}) + " " + d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
};
const hashColor = (s) => {
  const colors = ["#5af78e","#57c7ff","#ff6ac1","#f3f99d","#9f4fff","#ff9248","#4ef0d0"];
  let h = 0; for (let c of s) h = (h*31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
};
const initials = (name) => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

// ─── CSS ──────────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg0:#09090c;--bg1:#0e0f13;--bg2:#13141a;--bg3:#1a1b22;
  --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.13);
  --text:rgba(255,255,255,0.88);--dim:rgba(255,255,255,0.45);--dim2:rgba(255,255,255,0.25);
  --accent:#5af78e;--blue:#57c7ff;--pink:#ff6ac1;--yellow:#f3f99d;--purple:#9f4fff;
  --font:'JetBrains Mono',monospace;
  --blur:blur(20px) saturate(1.5);
  --r:6px;
}
body{font-family:var(--font);background:var(--bg0);color:var(--text);height:100vh;overflow:hidden;font-size:13px;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}
button{font-family:var(--font);cursor:pointer;border:none;background:none;color:inherit;}
input,textarea{font-family:var(--font);color:var(--text);background:none;border:none;outline:none;}
textarea{resize:none;}

/* LAYOUT */
.app{display:flex;height:100vh;flex-direction:column;}
.app-body{display:flex;flex:1;overflow:hidden;}

/* TITLEBAR */
.titlebar{height:30px;background:rgba(8,8,12,0.95);border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 12px;gap:8px;flex-shrink:0;user-select:none;}
.win-btns{display:flex;gap:5px;}
.wbtn{width:11px;height:11px;border-radius:50%;border:none;cursor:pointer;transition:filter .15s;}
.wbtn:hover{filter:brightness(1.4);}
.tb-title{flex:1;text-align:center;font-size:11px;color:var(--dim);letter-spacing:.03em;}
.tb-title span{color:var(--accent);}
.tb-clock{font-size:10.5px;color:var(--accent);font-weight:500;}

/* GROUPS (far left) */
.groups{width:56px;background:var(--bg0);border-right:1px solid var(--border);
  display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:5px;flex-shrink:0;overflow-y:auto;}
.gicon{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:18px;cursor:pointer;transition:border-radius .2s,background .15s;border:1px solid transparent;
  position:relative;flex-shrink:0;}
.gicon:hover{border-radius:12px;background:rgba(255,255,255,0.08);}
.gicon.active{border-radius:12px;}
.gicon.active::before{content:'';position:absolute;left:-8px;top:50%;transform:translateY(-50%);
  width:3px;height:18px;border-radius:0 2px 2px 0;}
.gsep{width:26px;height:1px;background:var(--border);flex-shrink:0;}
.gicon-add{border:1px dashed rgba(255,255,255,0.15)!important;font-size:20px;color:var(--accent);}

/* CHANNELS */
.channels{width:210px;background:rgba(10,11,15,0.9);border-right:1px solid var(--border);
  display:flex;flex-direction:column;flex-shrink:0;}
.ch-head{padding:11px 12px 9px;border-bottom:1px solid var(--border);display:flex;align-items:center;
  justify-content:space-between;}
.ch-head-name{font-size:12.5px;font-weight:700;letter-spacing:.04em;display:flex;align-items:center;gap:6px;}
.ch-list{flex:1;overflow-y:auto;padding:6px 5px;}
.ch-cat{font-size:9.5px;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;
  padding:8px 7px 3px;display:flex;align-items:center;justify-content:space-between;}
.ch-cat button{font-size:13px;color:var(--dim);padding:0 2px;border-radius:2px;}
.ch-cat button:hover{color:var(--text);background:rgba(255,255,255,0.06);}
.channel{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:4px;cursor:pointer;
  color:var(--dim);transition:background .1s,color .1s;font-size:12px;}
.channel:hover{background:rgba(255,255,255,0.05);color:var(--text);}
.channel.active{background:rgba(255,255,255,0.09);color:var(--text);}
.channel .ch-ico{width:13px;flex-shrink:0;text-align:center;}
.channel.active .ch-ico{color:var(--accent);}
.ch-badge{margin-left:auto;background:var(--pink);color:#000;font-size:9px;
  padding:1px 5px;border-radius:8px;font-weight:700;}

/* USER PANEL */
.user-panel{padding:8px 9px;border-top:1px solid var(--border);background:rgba(6,7,10,0.7);
  display:flex;align-items:center;gap:7px;}
.uavatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:700;color:#000;flex-shrink:0;position:relative;}
.ustatus-dot{position:absolute;bottom:-1px;right:-1px;width:8px;height:8px;border-radius:50%;
  border:2px solid rgba(6,7,10,.9);background:var(--accent);}
.uinfo{flex:1;min-width:0;}
.uname{font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.utag{font-size:9.5px;color:var(--accent);}
.upanel-btns{display:flex;gap:3px;}
.upanel-btns button{font-size:12px;padding:3px;border-radius:3px;color:var(--dim);}
.upanel-btns button:hover{color:var(--text);background:rgba(255,255,255,0.06);}

/* MAIN CHAT */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:rgba(12,13,17,0.7);}
.chat-header{height:40px;border-bottom:1px solid var(--border);display:flex;align-items:center;
  padding:0 14px;gap:10px;flex-shrink:0;background:rgba(9,10,14,0.6);}
.chat-hname{font-size:13px;font-weight:600;display:flex;align-items:center;gap:5px;}
.chat-htopic{font-size:11px;color:var(--dim);margin-left:8px;padding-left:8px;
  border-left:1px solid var(--border2);}
.hdr-actions{margin-left:auto;display:flex;gap:4px;}
.hdr-btn{font-size:11px;padding:4px 8px;border-radius:4px;color:var(--dim);display:flex;align-items:center;gap:4px;}
.hdr-btn:hover{color:var(--blue);background:rgba(87,199,255,.08);}

/* MESSAGES */
.msgs{flex:1;overflow-y:auto;padding:14px 14px 6px;display:flex;flex-direction:column;gap:1px;}
.day-sep{text-align:center;font-size:10px;color:var(--dim);padding:8px 0;display:flex;align-items:center;gap:8px;}
.day-sep::before,.day-sep::after{content:'';flex:1;height:1px;background:var(--border);}
.msg-grp{display:flex;gap:9px;padding:3px 0;border-radius:4px;transition:background .1s;}
.msg-grp:hover{background:rgba(255,255,255,0.025);}
.mavatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;
  justify-content:center;font-size:11px;font-weight:700;color:#000;margin-top:2px;align-self:flex-start;}
.mbody{flex:1;min-width:0;}
.mhead{display:flex;align-items:baseline;gap:8px;margin-bottom:3px;}
.muser{font-size:12.5px;font-weight:600;}
.mtime{font-size:10px;color:var(--dim);font-weight:400;}
.mtext{font-size:13px;color:var(--text);line-height:1.55;word-break:break-word;}
.mtext code{background:rgba(0,0,0,0.45);border:1px solid var(--border2);padding:1px 5px;
  border-radius:3px;font-size:11.5px;color:var(--accent);}
.msg-img{max-width:320px;max-height:220px;border-radius:6px;margin-top:6px;border:1px solid var(--border);cursor:pointer;display:block;}
.msg-file{display:inline-flex;align-items:center;gap:8px;margin-top:6px;padding:8px 12px;
  background:rgba(0,0,0,0.35);border:1px solid var(--border2);border-radius:5px;font-size:12px;}
.msg-file .fname{color:var(--blue);text-decoration:underline;cursor:pointer;}
.reactions{display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;}
.reaction{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:10px;
  background:rgba(255,255,255,0.06);border:1px solid var(--border);font-size:11px;cursor:pointer;transition:background .1s;}
.reaction:hover,.reaction.mine{background:rgba(90,247,142,0.12);border-color:rgba(90,247,142,0.3);}
.reaction-count{font-size:10px;color:var(--dim);}
.react-btn{opacity:0;font-size:11px;padding:2px 5px;border-radius:3px;color:var(--dim);}
.msg-grp:hover .react-btn{opacity:1;}
.react-btn:hover{background:rgba(255,255,255,0.08);color:var(--text);}

/* EMOJI PICKER */
.emoji-picker{position:absolute;bottom:100%;right:0;background:var(--bg2);border:1px solid var(--border2);
  border-radius:6px;padding:6px;display:flex;gap:4px;z-index:99;animation:popIn .12s ease;}
@keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
.emoji-opt{font-size:18px;padding:4px;border-radius:4px;cursor:pointer;transition:background .1s;}
.emoji-opt:hover{background:rgba(255,255,255,0.1);}

/* INPUT */
.input-wrap{padding:8px 14px 10px;flex-shrink:0;}
.input-box{background:rgba(8,9,13,0.9);border:1px solid var(--border2);border-radius:6px;
  display:flex;align-items:flex-end;gap:8px;padding:8px 10px;transition:border-color .2s;}
.input-box:focus-within{border-color:rgba(90,247,142,0.3);}
.prompt{color:var(--accent);font-size:11px;padding-bottom:9px;flex-shrink:0;}
.input-box textarea{flex:1;font-size:13px;line-height:1.5;max-height:110px;overflow-y:auto;
  color:var(--text);}
.input-box textarea::placeholder{color:var(--dim);}
.ibtns{display:flex;gap:5px;align-items:center;}
.ibtn{font-size:13px;padding:4px;border-radius:3px;color:var(--dim);}
.ibtn:hover{color:var(--accent);background:rgba(90,247,142,0.08);}
.send-btn{background:rgba(90,247,142,0.13);border:1px solid rgba(90,247,142,0.25);
  color:var(--accent);padding:5px 10px;border-radius:4px;font-size:11px;font-weight:600;
  letter-spacing:.04em;transition:background .15s;}
.send-btn:hover{background:rgba(90,247,142,0.25);}
.typing-bar{height:18px;font-size:10.5px;color:var(--dim);padding:0 2px;display:flex;align-items:center;gap:5px;}
.tdot{width:4px;height:4px;border-radius:50%;background:var(--accent);display:inline-block;animation:td 1.2s infinite;}
.tdot:nth-child(2){animation-delay:.2s;}.tdot:nth-child(3){animation-delay:.4s;}
@keyframes td{0%,80%,100%{opacity:.2}40%{opacity:1}}

/* MEMBERS */
.members{width:190px;background:rgba(9,10,14,0.8);border-left:1px solid var(--border);
  padding:10px 7px;overflow-y:auto;flex-shrink:0;}
.members-cat{font-size:9.5px;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;
  padding:6px 7px 3px;margin-top:4px;}
.member{display:flex;align-items:center;gap:7px;padding:4px 7px;border-radius:4px;cursor:pointer;}
.member:hover{background:rgba(255,255,255,0.05);}
.mavt{width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;
  justify-content:center;font-size:9px;font-weight:700;color:#000;position:relative;}
.mdot{position:absolute;bottom:-1px;right:-1px;width:7px;height:7px;border-radius:50%;border:2px solid rgba(9,10,14,.85);}
.minfo{min-width:0;}
.mname{font-size:11.5px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mname.on{color:var(--text);}

/* MODALS */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
  display:flex;align-items:center;justify-content:center;z-index:200;animation:fadeIn .15s;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:24px;
  width:380px;animation:slideUp .18s ease;}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.modal h2{font-size:15px;font-weight:700;margin-bottom:4px;color:var(--accent);}
.modal p{font-size:11.5px;color:var(--dim);margin-bottom:18px;}
.field{margin-bottom:12px;}
.field label{font-size:10.5px;color:var(--dim);letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:5px;}
.field input{width:100%;background:rgba(0,0,0,0.4);border:1px solid var(--border2);border-radius:4px;
  padding:8px 10px;font-size:13px;color:var(--text);transition:border-color .2s;}
.field input:focus{border-color:rgba(90,247,142,0.4);}
.modal-btns{display:flex;gap:8px;margin-top:18px;}
.btn-primary{flex:1;padding:9px;background:rgba(90,247,142,0.15);border:1px solid rgba(90,247,142,0.3);
  color:var(--accent);border-radius:5px;font-size:12.5px;font-weight:600;transition:background .15s;}
.btn-primary:hover{background:rgba(90,247,142,0.25);}
.btn-sec{flex:1;padding:9px;background:rgba(255,255,255,0.06);border:1px solid var(--border2);
  color:var(--dim);border-radius:5px;font-size:12.5px;}
.btn-sec:hover{color:var(--text);}
.error{color:var(--pink);font-size:11px;margin-top:6px;}

/* ADD CHANNEL */
.add-ch-form{padding:8px 7px;border-top:1px solid var(--border);}
.add-ch-inp{width:100%;background:rgba(0,0,0,0.4);border:1px solid var(--border2);border-radius:4px;
  padding:5px 8px;font-size:12px;}
.add-ch-inp:focus{border-color:rgba(90,247,142,0.35);}

/* IMAGE VIEWER */
.imgview{position:fixed;inset:0;background:rgba(0,0,0,0.88);display:flex;align-items:center;
  justify-content:center;z-index:300;cursor:zoom-out;}
.imgview img{max-width:90vw;max-height:90vh;border-radius:6px;border:1px solid var(--border2);}

/* PING */
@keyframes msgIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.msg-new{animation:msgIn .15s ease;}
`;

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [users,    setUsers]    = useState(() => DB.get("ac_users", []));
  const [me,       setMe]       = useState(() => DB.get("ac_me", null));
  const [messages, setMessages] = useState(() => DB.get("ac_msgs", {}));
  const [channels, setChannels] = useState(() => DB.get("ac_channels", DEFAULT_CHANNELS));
  const [groups,   setGroups]   = useState(() => DB.get("ac_groups", DEFAULT_GROUPS));
  const [activeGrp, setActiveGrp] = useState("family");
  const [activeCh,  setActiveCh]  = useState("fam-gen");
  const [input,    setInput]    = useState("");
  const [typing,   setTyping]   = useState(false);
  const [showAuth, setShowAuth] = useState(!DB.get("ac_me",null));
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [imgView,  setImgView]  = useState(null);
  const [showEmoji, setShowEmoji] = useState(null); // msgId
  const [addingCh, setAddingCh] = useState(false);
  const [newChName, setNewChName] = useState("");
  const [showMembers, setShowMembers] = useState(true);
  const msgsRef  = useRef(null);
  const fileRef  = useRef(null);
  const inputRef = useRef(null);

  // Persist
  useEffect(() => { DB.set("ac_users",    users);    }, [users]);
  useEffect(() => { DB.set("ac_msgs",     messages); }, [messages]);
  useEffect(() => { DB.set("ac_channels", channels); }, [channels]);
  useEffect(() => { DB.set("ac_groups",   groups);   }, [groups]);
  useEffect(() => { if(me) DB.set("ac_me", me); }, [me]);

  // Scroll to bottom
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, activeCh]);

  // Clock
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      setClock(`${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`);
    };
    tick(); const t = setInterval(tick, 15000); return () => clearInterval(t);
  }, []);

  const chMsgs = (messages[activeCh] || []);
  const grp = groups.find(g=>g.id===activeGrp) || groups[0];
  const chs = channels[activeGrp] || [];
  const ch  = chs.find(c=>c.id===activeCh);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const AuthModal = () => {
    const [form, setForm] = useState({username:"",password:"",display:""});
    const [err,  setErr]  = useState("");
    const submit = () => {
      if (authMode === "register") {
        if (!form.username || !form.password || !form.display) return setErr("All fields required.");
        if (users.find(u=>u.username===form.username)) return setErr("Username taken.");
        const u = { id: Date.now().toString(), username: form.username, password: form.password, display: form.display, joinedAt: Date.now() };
        setUsers(p=>[...p,u]); setMe(u); setShowAuth(false);
      } else {
        const u = users.find(u=>u.username===form.username && u.password===form.password);
        if (!u) return setErr("Invalid username or password.");
        setMe(u); setShowAuth(false);
      }
    };
    return (
      <div className="overlay">
        <div className="modal">
          <h2>{authMode==="login" ? "$ login" : "$ register"}</h2>
          <p>{authMode==="login" ? "Welcome back to ArchCord" : "Create your account"}</p>
          {authMode==="register" && (
            <div className="field">
              <label>Display Name</label>
              <input placeholder="e.g. John" value={form.display} onChange={e=>setForm(p=>({...p,display:e.target.value}))} />
            </div>
          )}
          <div className="field">
            <label>Username</label>
            <input placeholder="arch_user" value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          {err && <div className="error">{err}</div>}
          <div className="modal-btns">
            <button className="btn-primary" onClick={submit}>{authMode==="login"?"Login":"Create Account"}</button>
            <button className="btn-sec" onClick={()=>{setAuthMode(authMode==="login"?"register":"login");setErr("");}}>
              {authMode==="login"?"Register":"Back to Login"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const send = () => {
    if (!input.trim() || !me) return;
    const msg = { id: Date.now().toString(), uid: me.id, user: me.display, text: input.trim(), ts: Date.now(), reactions: {} };
    setMessages(p=>({ ...p, [activeCh]: [...(p[activeCh]||[]), msg] }));
    setInput("");
    if (inputRef.current) { inputRef.current.style.height="auto"; }
  };

  // ── File ─────────────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file || !me) return;
    const isImg = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = () => {
      const msg = {
        id: Date.now().toString(), uid: me.id, user: me.display,
        text: "", ts: Date.now(), reactions: {},
        ...(isImg ? { img: reader.result } : { file: { name: file.name, size: file.size, data: reader.result } })
      };
      setMessages(p=>({ ...p, [activeCh]: [...(p[activeCh]||[]), msg] }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Reaction ─────────────────────────────────────────────────────────────
  const react = (msgId, emoji) => {
    setMessages(p => {
      const msgs = (p[activeCh]||[]).map(m => {
        if (m.id !== msgId) return m;
        const r = {...(m.reactions||{})};
        const arr = r[emoji] ? [...r[emoji]] : [];
        const idx = arr.indexOf(me.id);
        if (idx>=0) arr.splice(idx,1); else arr.push(me.id);
        if (arr.length===0) delete r[emoji]; else r[emoji]=arr;
        return {...m, reactions: r};
      });
      return {...p, [activeCh]: msgs};
    });
    setShowEmoji(null);
  };

  // ── Add Channel ───────────────────────────────────────────────────────────
  const addChannel = () => {
    if (!newChName.trim()) return;
    const id = activeGrp + "-" + newChName.trim().toLowerCase().replace(/\s+/g,"-");
    setChannels(p=>({ ...p, [activeGrp]: [...(p[activeGrp]||[]), {id, name: newChName.trim().toLowerCase(), type:"text"}] }));
    setActiveCh(id);
    setNewChName(""); setAddingCh(false);
  };

  const logout = () => { setMe(null); DB.set("ac_me",null); setShowAuth(true); setAuthMode("login"); };

  // ── Members list (all registered users) ───────────────────────────────────
  const onlineUsers = users.filter(u=>u.id===me?.id);
  const otherUsers  = users.filter(u=>u.id!==me?.id);

  // Group messages by day
  const groupedMsgs = [];
  let lastDay = "";
  chMsgs.forEach(msg => {
    const day = new Date(msg.ts).toDateString();
    if (day !== lastDay) { groupedMsgs.push({type:"sep", day}); lastDay=day; }
    groupedMsgs.push({type:"msg", msg});
  });

  return (
    <>
      <style>{STYLES}</style>

      {showAuth && <AuthModal />}
      {imgView && (
        <div className="imgview" onClick={()=>setImgView(null)}>
          <img src={imgView} alt="preview" />
        </div>
      )}

      <div className="app">
        {/* Titlebar */}
        <div className="titlebar">
          <div className="win-btns">
            <div className="wbtn" style={{background:"#ff5f57"}} onClick={logout} title="Logout" />
            <div className="wbtn" style={{background:"#ffbd2e"}} />
            <div className="wbtn" style={{background:"#28c840"}} />
          </div>
          <div className="tb-title">— : <span>ArchCord</span> – Konsole</div>
          <div className="tb-clock">{clock}</div>
        </div>

        <div className="app-body">
          {/* Group Icons */}
          <div className="groups">
            {groups.map(g=>(
              <div key={g.id} className={`gicon ${activeGrp===g.id?"active":""}`}
                style={activeGrp===g.id ? {background:`${g.color}22`,border:`1px solid ${g.color}44`} : {}}
                title={g.name}
                onClick={()=>{ setActiveGrp(g.id); setActiveCh((channels[g.id]||[])[0]?.id||""); }}>
                {activeGrp===g.id && <div style={{position:"absolute",left:"-8px",top:"50%",transform:"translateY(-50%)",width:"3px",height:"18px",background:g.color,borderRadius:"0 2px 2px 0"}} />}
                <span>{g.emoji}</span>
              </div>
            ))}
            <div className="gsep"/>
            <div className="gicon gicon-add" title="Coming soon">+</div>
          </div>

          {/* Channels Sidebar */}
          <div className="channels">
            <div className="ch-head">
              <div className="ch-head-name" style={{color: grp?.color}}>
                <span>{grp?.emoji}</span> {grp?.name}
              </div>
            </div>
            <div className="ch-list">
              <div className="ch-cat">
                <span>▾ channels</span>
                <button onClick={()=>setAddingCh(p=>!p)}>+</button>
              </div>
              {chs.map(c=>(
                <div key={c.id} className={`channel ${activeCh===c.id?"active":""}`} onClick={()=>setActiveCh(c.id)}>
                  <span className="ch-ico">#</span>
                  {c.name}
                  {(messages[c.id]||[]).filter(m=>m.uid!==me?.id).length > 0 && activeCh!==c.id && (
                    <span className="ch-badge">{Math.min((messages[c.id]||[]).filter(m=>m.uid!==me?.id).length,9)}</span>
                  )}
                </div>
              ))}
              {addingCh && (
                <div className="add-ch-form">
                  <input className="add-ch-inp" placeholder="channel-name" value={newChName}
                    onChange={e=>setNewChName(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter") addChannel(); if(e.key==="Escape") setAddingCh(false); }}
                    autoFocus />
                </div>
              )}
            </div>
            <div className="user-panel">
              <div className="uavatar" style={{background: me ? hashColor(me.display) : "#333"}}>
                <div className="ustatus-dot"/>
                {me ? initials(me.display) : "?"}
              </div>
              <div className="uinfo">
                <div className="uname">{me?.display||"Guest"}</div>
                <div className="utag">● online · fish</div>
              </div>
              <div className="upanel-btns">
                <button title="Logout" onClick={logout}>⏏</button>
                <button title="Toggle Members" onClick={()=>setShowMembers(p=>!p)}>👥</button>
              </div>
            </div>
          </div>

          {/* Main Chat */}
          <div className="main">
            <div className="chat-header">
              <div className="chat-hname">
                <span style={{color: grp?.color}}>#</span>
                {ch?.name || "channel"}
                <span className="chat-htopic">{grp?.desc}</span>
              </div>
              <div className="hdr-actions">
                <button className="hdr-btn" onClick={()=>setShowMembers(p=>!p)}>👥 members</button>
                <button className="hdr-btn" onClick={()=>fileRef.current?.click()}>📎 attach</button>
              </div>
            </div>

            <div className="msgs" ref={msgsRef} onClick={()=>setShowEmoji(null)}>
              {groupedMsgs.length === 0 && (
                <div style={{textAlign:"center",color:"var(--dim)",padding:"40px 0",fontSize:"12px"}}>
                  <div style={{fontSize:"28px",marginBottom:"8px"}}>{grp?.emoji}</div>
                  <div>Start of <strong style={{color:"var(--text)"}}>#{ch?.name}</strong></div>
                  <div style={{fontSize:"11px",marginTop:"4px"}}>Send the first message!</div>
                </div>
              )}
              {groupedMsgs.map((item, i) => {
                if (item.type === "sep") return (
                  <div key={i} className="day-sep">{item.day === new Date().toDateString() ? "Today" : item.day}</div>
                );
                const {msg} = item;
                const isMe = msg.uid === me?.id;
                const color = hashColor(msg.user);
                return (
                  <div key={msg.id} className="msg-grp msg-new" style={{position:"relative"}}>
                    <div className="mavatar" style={{background:color}}>{initials(msg.user)}</div>
                    <div className="mbody">
                      <div className="mhead">
                        <span className="muser" style={{color}}>{msg.user}</span>
                        <span className="mtime">{fmt(msg.ts)}</span>
                        {isMe && <span style={{fontSize:"9px",color:"var(--dim)",marginLeft:"4px"}}>(you)</span>}
                      </div>
                      {msg.text && <div className="mtext">{msg.text}</div>}
                      {msg.img && <img className="msg-img" src={msg.img} alt="img" onClick={e=>{e.stopPropagation();setImgView(msg.img);}} />}
                      {msg.file && (
                        <div className="msg-file">
                          <span>📄</span>
                          <a className="fname" href={msg.file.data} download={msg.file.name}>{msg.file.name}</a>
                          <span style={{color:"var(--dim)",fontSize:"11px"}}>({(msg.file.size/1024).toFixed(1)}KB)</span>
                        </div>
                      )}
                      {/* Reactions */}
                      <div className="reactions">
                        {Object.entries(msg.reactions||{}).map(([emoji,uids])=>(
                          <span key={emoji} className={`reaction ${uids.includes(me?.id)?"mine":""}`}
                            onClick={e=>{e.stopPropagation();react(msg.id,emoji);}}>
                            {emoji} <span className="reaction-count">{uids.length}</span>
                          </span>
                        ))}
                        <span className="react-btn" onClick={e=>{e.stopPropagation();setShowEmoji(p=>p===msg.id?null:msg.id);}}>😄 +</span>
                      </div>
                      {showEmoji===msg.id && (
                        <div className="emoji-picker" onClick={e=>e.stopPropagation()}>
                          {EMOJI_REACTIONS.map(em=>(
                            <span key={em} className="emoji-opt" onClick={()=>react(msg.id,em)}>{em}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="input-wrap">
              <div className="typing-bar">
                {typing && <><span className="tdot"/><span className="tdot"/><span className="tdot"/> typing...</>}
              </div>
              <div className="input-box">
                <span className="prompt">&gt;</span>
                <textarea ref={inputRef} rows={1} placeholder={`Message #${ch?.name||"channel"}`}
                  value={input}
                  onChange={e=>{
                    setInput(e.target.value);
                    e.target.style.height="auto";
                    e.target.style.height=Math.min(e.target.scrollHeight,110)+"px";
                  }}
                  onKeyDown={e=>{
                    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}
                  }} />
                <div className="ibtns">
                  <button className="ibtn" title="Attach file" onClick={()=>fileRef.current?.click()}>📎</button>
                  <button className="ibtn" title="Image" onClick={()=>{ if(fileRef.current){ fileRef.current.accept="image/*"; fileRef.current.click(); }}}>🖼</button>
                  <button className="send-btn" onClick={send}>⏎ send</button>
                </div>
              </div>
            </div>
            <input ref={fileRef} type="file" style={{display:"none"}} onChange={handleFile} />
          </div>

          {/* Members */}
          {showMembers && (
            <div className="members">
              <div className="members-cat">Online — {users.length}</div>
              {me && (
                <div className="member">
                  <div className="mavt" style={{background:hashColor(me.display)}}>
                    {initials(me.display)}
                    <div className="mdot" style={{background:"var(--accent)"}}/>
                  </div>
                  <div className="minfo"><div className="mname on">{me.display}</div><div style={{fontSize:"9.5px",color:"var(--dim)"}}>you</div></div>
                </div>
              )}
              {otherUsers.map(u=>(
                <div key={u.id} className="member">
                  <div className="mavt" style={{background:hashColor(u.display)}}>
                    {initials(u.display)}
                    <div className="mdot" style={{background:"#555"}}/>
                  </div>
                  <div className="minfo"><div className="mname">{u.display}</div></div>
                </div>
              ))}
              {users.length === 0 && (
                <div style={{padding:"8px 7px",fontSize:"11px",color:"var(--dim)"}}>No members yet. Register to join!</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}