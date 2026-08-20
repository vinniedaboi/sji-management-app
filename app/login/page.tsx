import Link from "next/link";
import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { schoolLogoUrl, schoolName } from "@/lib/format";
export const dynamic="force-dynamic";
const demos=[["Teacher","emma.morgan@school.test"],["Department Head","sarah.lee@school.test"],["Admin","olivia.brown@school.test"],["System Admin","alex.chen@school.test"]];
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string;email?:string}>}){
  if(await getCurrentUser())redirect("/");const params=await searchParams;
  return <main className="login-page"><section className="login-story"><div className="brand brand-light sji-brand"><Image src={schoolLogoUrl} alt={schoolName} width={1080} height={347} priority/><span className="brand-product">Staff Hub</span></div><div><p className="eyebrow">YOUR SCHOOL DAY, IN ONE PLACE</p><h1>Know what matters.<br/>Find what you need.</h1><p>Official notices, colleague requests, events, policies and quick links—organized for the people who keep school moving.</p></div><blockquote>“Open one page each morning and immediately understand what affects you today.”</blockquote></section><section className="login-panel"><form action="/api/auth/login" method="post" className="login-card"><div className="login-mark"><LockKeyhole size={20}/></div><h2>Welcome back</h2><p>Sign in with a demo school account.</p>{params.error&&<div className="form-error" role="alert">Email or password is incorrect.</div>}<label>Email<input name="email" type="email" defaultValue={params.email??"emma.morgan@school.test"} required autoComplete="email"/></label><label>Password<input name="password" type="password" defaultValue="SchoolHub123!" required autoComplete="current-password"/></label><button className="button button-primary" type="submit">Sign in</button><div className="demo-accounts"><strong>Demo accounts</strong><p>All accounts use <code>SchoolHub123!</code></p>{demos.map(([role,email])=><Link key={email} href={`/login?email=${encodeURIComponent(email)}`}><span>{role}</span><small>{email}</small></Link>)}</div></form></section></main>
}
