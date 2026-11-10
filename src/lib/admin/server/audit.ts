import type { AdminContext } from "@/lib/admin/server/auth";
import { db } from "@/lib/admin/server/db";

export type AuditInput = {
  action: string;
  targetType: string;
  targetId: string;
  previous?: unknown;
  next?: unknown;
  reason?: string | null;
};

export function auditQuery(admin: AdminContext, entry: AuditInput) {
  const json = (value: unknown) => (value === undefined ? null : JSON.stringify(value));
  return db()`
    INSERT INTO admin_audit_log (
      admin_id, admin_name, action, target_type, target_id,
      previous_value, new_value, reason, ip, user_agent, session_ref
    ) VALUES (
      ${admin.id}, ${admin.username}, ${entry.action}, ${entry.targetType}, ${entry.targetId},
      ${json(entry.previous)}::jsonb, ${json(entry.next)}::jsonb, ${entry.reason ?? null},
      ${admin.ip}, ${admin.userAgent}, ${admin.sessionRef}
    )
  `;
}

export async function audit(admin: AdminContext, entry: AuditInput) {
  await auditQuery(admin, entry);
}
