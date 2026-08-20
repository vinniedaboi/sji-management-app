import { requireRole } from "@/lib/auth";
export default async function ContentAdminLayout({children}:{children:React.ReactNode}){await requireRole(["admin","system_admin"]);return children}
