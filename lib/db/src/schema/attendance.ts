import {
  integer,
  jsonb,
  primaryKey,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type AttendanceLanguage = "ar" | "en";

export const guildSettings = pgTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  logChannelId: text("log_channel_id"),
  auditRoleId: text("audit_role_id"),
  adminRoleId: text("admin_role_id"),
  timezone: text("timezone").notNull().default("Africa/Cairo"),
  lastWeeklyReportKey: text("last_weekly_report_key"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const attendancePreferences = pgTable(
  "attendance_preferences",
  {
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    language: text("language").$type<AttendanceLanguage>().notNull().default("ar"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.guildId, table.userId] })],
);

export const attendanceHourAdjustments = pgTable("attendance_hour_adjustments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  minutes: integer("minutes").notNull(),
  reason: text("reason"),
  actorUserId: text("actor_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const attendanceShifts = pgTable("attendance_shifts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  checkInAt: timestamp("check_in_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  checkOutAt: timestamp("check_out_at", { withTimezone: true }),
  checkInEvidenceUrl: text("check_in_evidence_url"),
  checkInEvidenceMessageId: text("check_in_evidence_message_id"),
  checkOutEvidenceUrl: text("check_out_evidence_url"),
  checkOutEvidenceMessageId: text("check_out_evidence_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const attendanceEvents = pgTable("attendance_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  guildId: text("guild_id").notNull(),
  shiftId: integer("shift_id"),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  eventType: text("event_type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  evidenceUrl: text("evidence_url"),
  sourceMessageId: text("source_message_id"),
  actorUserId: text("actor_user_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

export type GuildSettings = typeof guildSettings.$inferSelect;
export type AttendancePreference = typeof attendancePreferences.$inferSelect;
export type AttendanceHourAdjustment = typeof attendanceHourAdjustments.$inferSelect;
export type AttendanceShift = typeof attendanceShifts.$inferSelect;
export type AttendanceEvent = typeof attendanceEvents.$inferSelect;