"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, CalendarDays, ExternalLink, FileText, Home, LayoutDashboard, LogOut, Menu, MessageSquare, Search, ShieldCheck, Users, X } from "lucide-react";
import { useState } from "react";
import type { HubUser } from "@/lib/types";
import { initials, schoolName } from "@/lib/format";
import { isAdmin } from "@/lib/types";

const nav=[
  ["/", "Home", Home], ["/notices","Notices",FileText], ["/staff-board","Staff Board",MessageSquare], ["/events","Events",CalendarDays], ["/documents","Documents",BookOpen], ["/links","Quick Links",ExternalLink], ["/directory","Directory",Users],
] as const;

export function AppShell({user,children}:{user:HubUser;children:React.ReactNode}){
  const pathname=usePathname(); const [open,setOpen]=useState(false);
  return <div className="app-shell">
    <aside className={`sidebar ${open?"sidebar-open":""}`}>
      <div className="sidebar-top"><Link href="/" className="brand"><span>SH</span><div><strong>School Staff Hub</strong><small>{schoolName}</small></div></Link><button className="icon-button sidebar-close" onClick={()=>setOpen(false)} aria-label="Close navigation"><X size={20}/></button></div>
      <nav aria-label="Primary navigation">{nav.map(([href,label,Icon])=><Link onClick={()=>setOpen(false)} key={href} href={href} className={pathname===href||href!=="/"&&pathname.startsWith(href)?"active":""}><Icon size={17}/><span>{label}</span></Link>)}</nav>
      {user.role!=="teacher"&&<div className="admin-nav"><span>ADMINISTRATION</span><Link href={isAdmin(user)?"/admin":"/admin/notices"} className={pathname.startsWith("/admin")?"active":""}><ShieldCheck size={17}/>{isAdmin(user)?"Admin console":"Notice management"}</Link></div>}
      <div className="sidebar-user"><span className="avatar">{initials(user.fullName)}</span><div><strong>{user.fullName}</strong><small>{user.jobTitle}</small></div><a href="/api/auth/logout" title="Sign out" aria-label="Sign out"><LogOut size={16}/></a></div>
    </aside>
    {open&&<button className="sidebar-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>} 
    <div className="app-main"><div className="mobile-bar"><button className="icon-button" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><strong>School Staff Hub</strong><div><Link href="/search" aria-label="Search"><Search size={19}/></Link><Link href="/notifications" aria-label="Notifications"><Bell size={19}/></Link></div></div><div className="app-content">{children}</div></div>
  </div>
}

export function PageHeader({eyebrow,title,description,actions}:{eyebrow?:string;title:string;description?:string;actions?:React.ReactNode}){return <header className="page-header"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="header-actions">{actions}</div>}</header>}
export function Badge({children,tone="neutral"}:{children:React.ReactNode;tone?:"critical"|"important"|"success"|"neutral"|"info"}){return <span className={`badge badge-${tone}`}>{children}</span>}
export function EmptyState({title,description}:{title:string;description:string}){return <div className="empty-state"><LayoutDashboard size={28}/><strong>{title}</strong><p>{description}</p></div>}
