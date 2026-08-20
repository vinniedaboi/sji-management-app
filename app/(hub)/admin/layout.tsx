import { requireRole } from "@/lib/auth";
export default async function AdminLayout({children}:{children:React.ReactNode}){await requireRole(["department_head","admin","system_admin"]);return children}
