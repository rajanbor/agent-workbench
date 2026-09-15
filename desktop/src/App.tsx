import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import "./App.css";

type Snapshot = { computer: { operatingSystem: string; architecture: string; deviceKind: string; runtimeStatus: string }; providers: { id: string; name: string; detail: string }[]; models: { name: string; size: string; memoryHint: string }[]; sessions: { id: string; title: string; project: string }[] };
const fallback: Snapshot = { computer: { operatingSystem: "Loading", architecture: "—", deviceKind: "Computer", runtimeStatus: "Checking runtime" }, providers: [], models: [], sessions: [] };
const glyphs: Record<string, string> = { plus: "+", chat: "⌁", grid: "⊞", terminal: "›_", cube: "◇", computer: "▣", settings: "⚙", arrow: "↗", spark: "✦" };
function Icon({ name }: { name: string }) { return <span className="icon" aria-hidden="true">{glyphs[name] ?? "·"}</span>; }

export default function App() {
  const [data, setData] = useState<Snapshot>(fallback);
  const [activeSession, setActiveSession] = useState("welcome");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { invoke<Snapshot>("desktop_snapshot").then(setData).catch(() => setNotice("The desktop engine could not be reached.")); }, []);
  const current = data.sessions.find((session) => session.id === activeSession) ?? data.sessions[0];
  const send = () => { if (message.trim()) { setNotice("Session actions will be enabled as each provider adapter is migrated."); setMessage(""); } };
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">A</span><span>Agent Workbench</span><span className="alpha">ALPHA</span></div>
      <button className="new-session" onClick={() => setNotice("New session creation is the next shared-engine capability.")}><Icon name="plus" />New session</button>
      <div className="search">⌕ <span>Search workspace</span><kbd>⌘ K</kbd></div>
      <nav><p className="nav-label">WORKSPACE</p><button className="nav-item active"><Icon name="chat" />Sessions <span>{data.sessions.length}</span></button><button className="nav-item"><Icon name="grid" />Projects</button><button className="nav-item"><Icon name="terminal" />Runtimes</button><p className="nav-label space">RECENT</p>{data.sessions.map((session) => <button key={session.id} onClick={() => setActiveSession(session.id)} className={`recent ${activeSession === session.id ? "selected" : ""}`}><span className="session-dot" />{session.title}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Icon name="computer" />{data.computer.deviceKind}</button><button className="profile"><span>RB</span><div><strong>Rajan Bor</strong><small>Local workspace</small></div><b>···</b></button></div>
    </aside>
    <section className="workspace"><header className="topbar"><div className="crumb"><span className="status-orb" /><strong>{current?.title ?? "Loading workspace"}</strong><span className="muted">/ {current?.project ?? ""}</span></div><div className="top-actions"><button className="quiet-button">Share</button><button className="quiet-button"><Icon name="settings" /></button><button className="avatar">RB</button></div></header>
      <div className="conversation"><div className="hero-copy"><div className="eyebrow"><Icon name="spark" /> A PRIVATE, LOCAL WORKSPACE</div><h1>Build with agents<br />on your terms.</h1><p>Connect a provider, choose a project and run each session in a clear, isolated workspace.</p></div><article className="welcome-card"><div className="card-icon"><Icon name="spark" /></div><div><h2>Portable engine, native feel.</h2><p>This client reads a shared Rust engine. The same core targets macOS, Windows, and Linux; each system gets its own safe runtime adapter.</p></div></article>{notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}</div>
      <div className="composer"><button className="add"><Icon name="plus" /></button><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder="Give your agent a task…" /><button className="runtime-chip"><span />Host runtime</button><button className="send" onClick={send}>↑</button></div>
    </section>
    <aside className="inspector"><section><div className="panel-title"><span>Environment</span><button>···</button></div><div className="computer-card"><div className="computer-icon"><Icon name="computer" /></div><strong>{data.computer.deviceKind}</strong><small>{data.computer.operatingSystem} · {data.computer.architecture}</small><span className="ready"><i />{data.computer.runtimeStatus}</span></div></section><section><div className="panel-title"><span>Providers</span><button><Icon name="plus" /></button></div>{data.providers.map((provider) => <div className="provider" key={provider.id}><span className={`provider-logo ${provider.id}`}>{provider.name.slice(0, 1)}</span><div><strong>{provider.name}</strong><small>{provider.detail}</small></div><button className="connect">Connect</button></div>)}</section><section><div className="panel-title"><span>Local models</span><button>View all <Icon name="arrow" /></button></div>{data.models.map((model) => <div className="model" key={model.name}><span><Icon name="cube" /></span><div><strong>{model.name}</strong><small>{model.size} · {model.memoryHint}</small></div><em>Not installed</em></div>)}</section></aside>
  </main>;
}
