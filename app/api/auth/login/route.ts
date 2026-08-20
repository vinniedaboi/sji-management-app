import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { db, rows } from "@/lib/db";
export async function POST(request:Request){const form=await request.formData();const email=String(form.get("email")??"").trim().toLowerCase();const password=String(form.get("password")??"");const users=rows<{id:string;passwordHash:string;active:number}>(await db().execute({sql:`SELECT id,password_hash as passwordHash,active FROM users WHERE lower(email)=? LIMIT 1`,args:[email]}));if(!users[0]||!users[0].active||!await bcrypt.compare(password,users[0].passwordHash))return Response.redirect(new URL(`/login?error=1&email=${encodeURIComponent(email)}`,request.url),303);await createSession(users[0].id);return Response.redirect(new URL("/",request.url),303);}
