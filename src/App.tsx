import { useEffect, useState } from "react";
import { Award, Mail, House, Menu, Moon, Sun, X } from "lucide-react";
import CertificateForm from "./components/certificate/CertificateForm";
import EnvelopeForm from "./components/envelope/EnvelopeForm";
import ToastHost from "./components/ui/ToastHost";

type View = "home" | "envelopes" | "certificates";
const currentView = (): View => window.location.hash === "#certificates" ? "certificates" : window.location.hash === "#envelopes" ? "envelopes" : "home";
const base = import.meta.env.BASE_URL;
const emblem = `${base}campus/ntub-emblem-v1.png`;
const tools = [
  { id: "certificates" as const, label: "獎狀製作", icon: Award },
  { id: "envelopes" as const, label: "紅包袋製作", icon: Mail },
];

export default function App() {
  const [view, setView] = useState<View>(currentView);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const update = () => { if (["", "#home", "#envelopes", "#certificates"].includes(window.location.hash)) setView(currentView()); setDrawerOpen(false); };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    document.title = view === "home" ? "助理行政小工具" : `${view === "envelopes" ? "紅包袋" : "獎狀"}製作｜助理行政小工具`;
  }, [view]);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => {
    if (!drawerOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setDrawerOpen(false); document.getElementById("menu-toggle")?.focus(); }
    };
    window.addEventListener("keydown", close);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.getElementById("drawer-close")?.focus();
    return () => { window.removeEventListener("keydown", close); document.body.style.overflow = previous; };
  }, [drawerOpen]);

  return (
    <>
      <a className="skip-link" href={view === "home" ? "#home-main" : "#tool-main"}>跳至主要內容</a>
      <div hidden={view !== "home"} className="campus-portal">
        <header className="university-header">
          <div className="portal-width university-masthead">
            <a className="university-brand" href="#home" aria-label="國立臺北商業大學，系統首頁"><img src={emblem} alt="" width="48" height="48" /><strong>國立臺北商業大學</strong></a>
            <a className="university-official" href="https://www.ntub.edu.tw/" target="_blank" rel="noopener noreferrer">學校網站</a>
          </div>
          <nav className="university-navigation" aria-label="首頁導覽"><div className="portal-width">
            <a href="#home" aria-current="page">首頁</a>
            <a href="#envelopes">紅包袋製作</a>
            <a href="#certificates">獎狀製作</a>
          </div></nav>
        </header>
        <main id="home-main" className="campus-stage campus-home">
          <img className="campus-photo" src={`${base}campus/ntub-taipei-v1.jpg`} alt="" fetchPriority="high" />
          <div className="portal-width campus-welcome"><h1>助理行政小工具</h1><a className="portal-cta" href="#envelopes">開始製作</a><p className="mt-4 text-sm">紅包袋與獎狀製作・免登入</p></div>
        </main>
        <footer className="campus-footer"><div className="portal-width"><strong><a href="https://nasirlin.net" rel="noreferrer">Nasir Lin</a></strong></div></footer>
      </div>

      <div hidden={view === "home"}>
        {drawerOpen && <button type="button" aria-label="關閉側邊欄遮罩" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
        <aside id="system-sidebar" className="system-sidebar" data-open={drawerOpen}>
          <div className="system-brand"><a href="#home">助理行政小工具</a><button id="drawer-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="關閉側邊欄" className="system-icon lg:hidden"><X size={20} /></button></div>
          <div className="system-profile"><span className="system-avatar"><img src={emblem} alt="國立臺北商業大學校徽" width="40" height="40" /></span><strong>助理行政小工具</strong><span className="text-sm text-[var(--ink-muted)]">文件製作工具</span></div>
          <nav aria-label="工具側邊導覽" className="system-menu"><div><p>工作區</p><a href="#home"><House size={17} aria-hidden="true" /><span>系統首頁</span></a>{tools.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} onClick={() => setDrawerOpen(false)} aria-current={view === id ? "page" : undefined}><Icon size={17} aria-hidden="true" /><span>{label}</span></a>)}</div></nav>
          <a className="system-sidebar-footer" href="https://www.ntub.edu.tw/" target="_blank" rel="noopener noreferrer">學校網站</a>
        </aside>
        <header className="system-topbar">
          <button id="menu-toggle" type="button" onClick={() => setDrawerOpen(true)} aria-label="開啟選單" aria-controls="system-sidebar" aria-expanded={drawerOpen} className="system-icon lg:hidden"><Menu size={20} /></button>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">助理行政小工具</p><p className="hidden truncate text-sm text-[var(--ink-muted)] sm:block">紅包袋與獎狀製作</p></div>
          <a href="#home" aria-label="系統首頁" title="系統首頁" className="system-icon"><House size={18} /></a>
          <button type="button" onClick={() => setDark(value => !value)} aria-label={dark ? "切換淺色主題" : "切換深色主題"} className="system-icon">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </header>
        <main id="tool-main" className="system-main"><div className="system-content tools-content">
          <section hidden={view !== "certificates"} aria-labelledby="certificate-title"><div className="tool-heading"><h1 id="certificate-title">獎狀製作</h1><p>填寫名單與頒發資料，產生與範例相同樣式的 Word 檔案。</p></div><CertificateForm /></section>
          <section hidden={view !== "envelopes"} aria-labelledby="envelope-title"><div className="tool-heading"><h1 id="envelope-title">紅包袋製作</h1><p>填寫科目／活動名稱與名單，產生與範例相同樣式的 Word 檔案。</p></div><EnvelopeForm /></section>
          <p className="tool-privacy">每批最多 200 頁</p>
          <footer className="tool-footer"><a href="https://nasirlin.net" rel="noreferrer">Nasir Lin</a> · <a href="https://github.com/nasircy/cge_tools" rel="noreferrer">nasircy / cge_tools</a></footer>
        </div></main>
      </div>
      <ToastHost />
    </>
  );
}
