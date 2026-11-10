import { ACHIEVEMENTS } from "@/lib/achievements";
import { ADMIN_ROLES, ROLE_PERMISSIONS } from "@/lib/admin/permissions";
import { FEATURE_FLAGS, GAME_NUMBER_LIMITS } from "@/lib/admin/settings";
import { REPORT_CATEGORIES, RESTRICTION_KINDS } from "@/lib/admin/types";
import { runAdminAction } from "@/lib/admin/server/actions";
import { requireAdmin } from "@/lib/admin/server/auth";
import {
  achievementStats,
  exportAudit,
  exportPlayer,
  getAnalytics,
  getFactionsAndRoles,
  getOverview,
  getPlayer,
  listAdmins,
  listAudit,
  listMatches,
  listPlayers,
  listReports,
  listRestrictions,
} from "@/lib/admin/server/data";
import { adminFailure, adminJson, readJson } from "@/lib/admin/server/http";
import { readAllSettings, readSettings } from "@/lib/admin/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "";
    const q = url.searchParams.get("q") ?? "";
    const page = url.searchParams.get("page");

    switch (view) {
      case "overview":
        await requireAdmin(request, "overview.view");
        return adminJson({ overview: await getOverview() });
      case "players":
        await requireAdmin(request, "players.view");
        return adminJson({
          players: await listPlayers({
            q,
            status: url.searchParams.get("status") ?? "all",
            page,
          }),
        });
      case "player": {
        await requireAdmin(request, "players.view");
        const player = await getPlayer(url.searchParams.get("userId") ?? "");
        if (!player) return adminJson({ error: "not-found", message: "Player not found." }, { status: 404 });
        return adminJson({ player, achievements: ACHIEVEMENTS });
      }
      case "player-export": {
        await requireAdmin(request, "players.export");
        const data = await exportPlayer(url.searchParams.get("userId") ?? "");
        if (!data) return adminJson({ error: "not-found", message: "Player not found." }, { status: 404 });
        return adminJson({ export: data });
      }
      case "matches":
        await requireAdmin(request, "matches.view");
        return adminJson({
          matches: await listMatches({
            q,
            faction: url.searchParams.get("faction") ?? "all",
            result: url.searchParams.get("result") ?? "all",
            from: url.searchParams.get("from") ?? "",
            to: url.searchParams.get("to") ?? "",
            page,
          }),
        });
      case "reports":
        await requireAdmin(request, "moderation.view");
        return adminJson({
          reports: await listReports({
            status: url.searchParams.get("status") ?? "open",
            page,
          }),
        });
      case "restrictions":
        await requireAdmin(request, "moderation.view");
        return adminJson({ restrictions: await listRestrictions({ page }) });
      case "moderation-meta":
        await requireAdmin(request, "moderation.view");
        return adminJson({
          categories: REPORT_CATEGORIES,
          kinds: RESTRICTION_KINDS,
          settings: await readSettings("moderation"),
        });
      case "achievements":
        await requireAdmin(request, "achievements.view");
        return adminJson(await achievementStats());
      case "roles":
      case "factions":
        await requireAdmin(request, "content.view");
        return adminJson(await getFactionsAndRoles());
      case "analytics":
        await requireAdmin(request, "analytics.view");
        return adminJson({ analytics: await getAnalytics() });
      case "settings": {
        await requireAdmin(request, "config.view");
        const key = url.searchParams.get("key");
        if (key === "maintenance" || key === "game" || key === "flags" || key === "moderation") {
          return adminJson({
            key,
            settings: await readSettings(key),
            meta: {
              flags: FEATURE_FLAGS,
              gameLimits: GAME_NUMBER_LIMITS,
            },
          });
        }
        return adminJson({
          settings: await readAllSettings(),
          meta: { flags: FEATURE_FLAGS, gameLimits: GAME_NUMBER_LIMITS },
        });
      }
      case "admins":
        await requireAdmin(request, "admins.view");
        return adminJson({
          admins: await listAdmins(),
          roles: ADMIN_ROLES,
          rolePermissions: ROLE_PERMISSIONS,
        });
      case "audit":
        await requireAdmin(request, "audit.view");
        return adminJson({
          audit: await listAudit({
            q,
            action: url.searchParams.get("action") ?? "",
            targetType: url.searchParams.get("targetType") ?? "",
            admin: url.searchParams.get("admin") ?? "",
            from: url.searchParams.get("from") ?? "",
            to: url.searchParams.get("to") ?? "",
            page,
          }),
        });
      case "audit-export":
        await requireAdmin(request, "audit.export");
        return adminJson({
          export: await exportAudit({
            q,
            action: url.searchParams.get("action") ?? "",
            targetType: url.searchParams.get("targetType") ?? "",
            admin: url.searchParams.get("admin") ?? "",
            from: url.searchParams.get("from") ?? "",
            to: url.searchParams.get("to") ?? "",
          }),
        });
      case "catalog":
        await requireAdmin(request);
        return adminJson({
          achievements: ACHIEVEMENTS,
          roles: ADMIN_ROLES,
          restrictions: RESTRICTION_KINDS,
          reports: REPORT_CATEGORIES,
          flags: FEATURE_FLAGS,
        });
      default:
        return adminJson({ error: "invalid", message: "Unknown admin view." }, { status: 400 });
    }
  } catch (error) {
    return adminFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request, undefined, { mutating: true });
    const body = await readJson(request);
    const result = await runAdminAction(admin, body.action, body.payload ?? body);
    return adminJson(result);
  } catch (error) {
    return adminFailure(error);
  }
}
