import { requireRole } from "@/lib/auth";
export default async function AuditAdminLayout({children}:{children:React.ReactNode}){await requireRole(["admin","system_admin"]);return children}
