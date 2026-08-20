import { requireRole } from "@/lib/auth";
export default async function AcknowledgementAdminLayout({children}:{children:React.ReactNode}){await requireRole(["admin","system_admin"]);return children}
