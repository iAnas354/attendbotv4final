import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  FileUploadBuilder,
  GatewayIntentBits,
  LabelBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Attachment,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
  type Interaction,
  type ModalSubmitInteraction,
} from "discord.js";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import {
  attendanceEvents,
  attendanceHourAdjustments,
  attendancePreferences,
  attendanceShifts,
  db,
  guildSettings,
  type AttendanceLanguage,
  type AttendanceHourAdjustment,
  type AttendanceShift,
  type GuildSettings,
} from "@workspace/db";
import { logger } from "../lib/logger";

type AttendanceAction = "check_in" | "check_out";
type Language = AttendanceLanguage;

const COPY = {
  ar: {
    newCheckIn: "تسجيل دخول جديد",
    newCheckOut: "تسجيل خروج جديد",
    member: "العضو",
    time: "الوقت",
    recordNumber: "رقم السجل",
    fixedFooter: "سجل ثابت للمراجعة — لا يتم تعديل السجل الأصلي",
    shiftTotal: "إجمالي مدة الشيفت",
    hoursTitle: (username: string) => `ساعات ${username}`,
    hoursDescription: "إجمالي آخر 7 أيام",
    total: "الإجمالي",
    shiftCount: "عدد الشيفتات",
    status: "الحالة",
    openSince: (time: string) => `داخل العمل منذ ${time}`,
    noOpenShift: "لا يوجد شيفت مفتوح",
    recent: "آخر السجلات",
    noRecords: "لا توجد سجلات خلال آخر 7 أيام.",
    weeklyTitle: (guildName: string) => `الجرد الأسبوعي — ${guildName}`,
    activeTitle: (guildName: string) => `الموجودون حاليًا في العمل — ${guildName}`,
    activeSince: (time: string) => `داخل العمل منذ ${time}`,
    activeCount: (count: number) => `عدد الموجودين: ${count}`,
    activeEmpty: "لا يوجد أي عضو مسجل دخول حاليًا.",
    shifts: "عدد الشيفتات",
    members: "عدد الأعضاء",
    period: "الفترة",
    last7Days: "آخر 7 أيام",
    reportFooter: "التقرير للمراجعة — السجلات الأصلية لا يتم تغييرها",
    open: "مفتوح",
    openCount: (count: number) => `${count} مفتوح`,
    hours: (hours: number, minutes: number) => `${hours} ساعة و${minutes} دقيقة`,
    actionCheckIn: "تسجيل دخول",
    actionCheckOut: "تسجيل خروج",
    alreadyCheckedIn: (time: string) => `أنت مسجل دخول بالفعل منذ **${time}**.`,
    noActiveShift: "لا يوجد لك تسجيل دخول مفتوح. سجل الدخول أولًا.",
    setupMissing: "الإعداد ناقص. خلي الإدارة تستخدم `/setup-channel` أولًا.",
    adminOnly: "الأمر ده للإدارة فقط.",
    auditOnly: "الأمر ده متاح لرتبة الجرد والإدارة فقط.",
    setupChannelDone: (channel: string) => `تم تحديد ${channel} كروم لسجل الدخول والخروج والصور.`,
    setupRolesDone: (audit: string, admin: string) =>
      `تم تحديد ${audit} كرتبة الجرد والمراجعة${admin ? ` و${admin} كرتبة إدارة البوت` : ""}.`,
    panelText: "استخدم الأزرار لتسجيل الحضور وعرض الساعات. تسجيل الدخول والخروج يحتاج صورة أو رابط صورة.",
    evidenceUploadLabel: "رفع صورة من الجهاز",
    evidenceUploadDescription: "اختياري إذا كنت ستضع رابطًا للصورة",
    evidenceLinkLabel: "رابط الصورة",
    evidenceLinkDescription: "اختياري إذا رفعت ملفًا",
    evidencePlaceholder: "https://example.com/image.jpg",
    fileMustBeImage: "الملف المرفوع لازم يكون صورة بصيغة PNG أو JPG أو JPEG أو WEBP أو GIF.",
    invalidLink: "رابط الصورة غير صحيح. استخدم رابطًا يبدأ بـ http:// أو https://.",
    evidenceRequired: "لازم ترفع صورة من الجهاز أو تضع رابط صورة قبل الإرسال.",
    memberReadFailed: "تعذر قراءة بياناتك في السيرفر.",
    roleReadFailed: "تعذر قراءة رتبتك في السيرفر.",
    serverOnly: "الأمر ده متاح داخل السيرفر فقط.",
    reportAccess: "الجرد الأسبوعي متاح لرتبة الجرد والإدارة فقط.",
    hoursAccess: "عرض ساعات أعضاء آخرين متاح لرتبة الجرد فقط.",
    languagePrompt: "اختار اللغة / Choose your language",
    languageArabic: "العربية",
    languageEnglish: "English",
    languageSaved: "تم حفظ اللغة العربية لهذا السيرفر.",
    languageSavedEnglish: "English has been saved for you in this server.",
    botError: "حصل خطأ أثناء تنفيذ العملية. حاول مرة أخرى أو راجع سجل البوت.",
    manualAdjustmentAdded: (hours: string, member: string) => `تمت إضافة ${hours} إلى ساعات ${member}.`,
    manualAdjustmentRemoved: (hours: string, member: string) => `تم خصم ${hours} من ساعات ${member}.`,
    adjustmentTitleAdded: "إضافة ساعات يدوية",
    adjustmentTitleRemoved: "خصم ساعات يدوية",
    adjustment: "التعديل",
    actor: "بواسطة",
    reason: "السبب",
    noReason: "بدون سبب",
    invalidHours: "عدد الساعات يجب أن يكون أكبر من صفر.",
    targetReadFailed: "تعذر قراءة بيانات العضو المحدد.",
  },
  en: {
    newCheckIn: "New check-in",
    newCheckOut: "New check-out",
    member: "Member",
    time: "Time",
    recordNumber: "Record number",
    fixedFooter: "Immutable review record — the original event is not edited",
    shiftTotal: "Total shift duration",
    hoursTitle: (username: string) => `${username}'s hours`,
    hoursDescription: "Total for the last 7 days",
    total: "Total",
    shiftCount: "Shifts",
    status: "Status",
    openSince: (time: string) => `Working since ${time}`,
    noOpenShift: "No open shift",
    recent: "Recent records",
    noRecords: "No records in the last 7 days.",
    weeklyTitle: (guildName: string) => `Weekly audit — ${guildName}`,
    activeTitle: (guildName: string) => `Currently working — ${guildName}`,
    activeSince: (time: string) => `Working since ${time}`,
    activeCount: (count: number) => `Currently in: ${count}`,
    activeEmpty: "No member is currently checked in.",
    shifts: "Shifts",
    members: "Members",
    period: "Period",
    last7Days: "Last 7 days",
    reportFooter: "Review report — original records are never changed",
    open: "open",
    openCount: (count: number) => `${count} open`,
    hours: (hours: number, minutes: number) => `${hours}h ${minutes}m`,
    actionCheckIn: "check-in",
    actionCheckOut: "check-out",
    alreadyCheckedIn: (time: string) => `You are already checked in since **${time}**.`,
    noActiveShift: "You do not have an open check-in. Check in first.",
    setupMissing: "Setup is incomplete. Ask an administrator to run `/setup-channel` first.",
    adminOnly: "This command is for administrators only.",
    auditOnly: "This command is available to the audit role and administrators only.",
    setupChannelDone: (channel: string) => `${channel} is now the attendance and evidence log channel.`,
    setupRolesDone: (audit: string, admin: string) =>
      `${audit} is now the audit role${admin ? ` and ${admin} is the bot admin role` : ""}.`,
    panelText: "Use the buttons to record attendance and view hours. Check-in and check-out require an image or image link.",
    evidenceUploadLabel: "Upload an image",
    evidenceUploadDescription: "Optional if you provide an image link",
    evidenceLinkLabel: "Image link",
    evidenceLinkDescription: "Optional if you upload a file",
    evidencePlaceholder: "https://example.com/image.jpg",
    fileMustBeImage: "The uploaded file must be a PNG, JPG, JPEG, WEBP, or GIF image.",
    invalidLink: "The image link is invalid. Use a link starting with http:// or https://.",
    evidenceRequired: "Upload an image or provide an image link before submitting.",
    memberReadFailed: "Could not read your server membership.",
    roleReadFailed: "Could not read your server role.",
    serverOnly: "This command is only available inside a server.",
    reportAccess: "The weekly audit is available to the audit role and administrators only.",
    hoursAccess: "Viewing another member's hours is available to the audit role only.",
    languagePrompt: "اختار اللغة / Choose your language",
    languageArabic: "العربية",
    languageEnglish: "English",
    languageSaved: "Arabic has been saved for you in this server.",
    languageSavedEnglish: "English has been saved for you in this server.",
    botError: "Something went wrong. Try again or review the bot logs.",
    manualAdjustmentAdded: (hours: string, member: string) => `Added ${hours} to ${member}'s hours.`,
    manualAdjustmentRemoved: (hours: string, member: string) => `Removed ${hours} from ${member}'s hours.`,
    adjustmentTitleAdded: "Manual hours added",
    adjustmentTitleRemoved: "Manual hours removed",
    adjustment: "Adjustment",
    actor: "By",
    reason: "Reason",
    noReason: "No reason provided",
    invalidHours: "The number of hours must be greater than zero.",
    targetReadFailed: "Could not read the selected member.",
  },
} as const;

type CopyKey = Exclude<keyof typeof COPY.ar, "hoursTitle" | "weeklyTitle" | "activeTitle" | "activeSince" | "activeCount" | "alreadyCheckedIn" | "setupChannelDone" | "setupRolesDone" | "openSince" | "openCount" | "hours" | "manualAdjustmentAdded" | "manualAdjustmentRemoved">;

function copy(language: Language, key: CopyKey): string {
  return COPY[language][key];
}

async function getLanguage(guildId: string, userId: string): Promise<Language> {
  const [preference] = await db
    .select()
    .from(attendancePreferences)
    .where(
      and(
        eq(attendancePreferences.guildId, guildId),
        eq(attendancePreferences.userId, userId),
      ),
    )
    .limit(1);
  return preference?.language === "en" ? "en" : "ar";
}

async function saveLanguage(
  guildId: string,
  userId: string,
  language: Language,
): Promise<void> {
  await db
    .insert(attendancePreferences)
    .values({ guildId, userId, language, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [attendancePreferences.guildId, attendancePreferences.userId],
      set: { language, updatedAt: new Date() },
    });
}

const PANEL_BUTTONS = {
  checkIn: "attendance:check-in",
  checkOut: "attendance:check-out",
  hours: "attendance:hours",
  weeklyReport: "attendance:weekly-report",
  language: "attendance:language",
} as const;

function settingsFor(guildId: string) {
  return db.select().from(guildSettings).where(eq(guildSettings.guildId, guildId));
}

async function getSettings(guildId: string): Promise<GuildSettings | undefined> {
  const [settings] = await settingsFor(guildId).limit(1);
  return settings;
}

async function ensureSettings(guildId: string): Promise<GuildSettings> {
  const existing = await getSettings(guildId);
  if (existing) return existing;

  const [created] = await db
    .insert(guildSettings)
    .values({ guildId })
    .returning();
  if (!created) throw new Error("تعذر إنشاء إعدادات السيرفر.");
  return created;
}

function cairoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function cairoTime(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function cairoScheduleParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    weekday: parts.find((part) => part.type === "weekday")?.value,
    hour: parts.find((part) => part.type === "hour")?.value,
    minute: parts.find((part) => part.type === "minute")?.value,
  };
}

function durationMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function formatDuration(minutes: number, language: Language): string {
  const sign = minutes < 0 ? "-" : "";
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;
  return `${sign}${COPY[language].hours(hours, remainingMinutes)}`;
}

function actionLabel(action: AttendanceAction, language: Language): string {
  return action === "check_in"
    ? COPY[language].actionCheckIn
    : COPY[language].actionCheckOut;
}

async function getHourAdjustments(
  guildId: string,
  userId: string,
  since: Date,
): Promise<AttendanceHourAdjustment[]> {
  return db
    .select()
    .from(attendanceHourAdjustments)
    .where(
      and(
        eq(attendanceHourAdjustments.guildId, guildId),
        eq(attendanceHourAdjustments.userId, userId),
        gte(attendanceHourAdjustments.createdAt, since),
      ),
    )
    .orderBy(desc(attendanceHourAdjustments.createdAt));
}

function sumAdjustmentMinutes(adjustments: AttendanceHourAdjustment[]): number {
  return adjustments.reduce((total, adjustment) => total + adjustment.minutes, 0);
}

function evidenceUrl(attachment?: Attachment | null): string | undefined {
  if (!attachment) return undefined;
  return attachment.contentType?.startsWith("image/") ? attachment.url : undefined;
}

function isAdministrator(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

function hasAuditAccess(member: GuildMember, settings: GuildSettings): boolean {
  return (
    isAdministrator(member) ||
    (!!settings.auditRoleId && member.roles.cache.has(settings.auditRoleId)) ||
    (!!settings.adminRoleId && member.roles.cache.has(settings.adminRoleId))
  );
}

async function fetchMember(
  guild: Guild,
  userId: string,
): Promise<GuildMember | undefined> {
  try {
    return await guild.members.fetch(userId);
  } catch (error) {
    logger.warn({ err: error, guildId: guild.id, userId }, "Could not fetch guild member");
    return undefined;
  }
}

async function sendAttendanceLog(
  client: Client,
  guild: Guild,
  settings: GuildSettings,
  shift: AttendanceShift,
  action: AttendanceAction,
  language: Language,
  evidence?: string,
): Promise<void> {
  if (!settings.logChannelId) return;

  const channel = await client.channels.fetch(settings.logChannelId);
  if (!channel || !channel.isTextBased() || !("send" in channel)) return;

  const isCheckIn = action === "check_in";
  const embed = new EmbedBuilder()
    .setColor(isCheckIn ? 0x18a46b : 0xd97706)
    .setTitle(isCheckIn ? copy(language, "newCheckIn") : copy(language, "newCheckOut"))
    .setDescription(`<@${shift.userId}> — **${actionLabel(action, language)}**`)
    .addFields(
      { name: copy(language, "member"), value: `${shift.username} (<@${shift.userId}>)`, inline: true },
      {
        name: copy(language, "time"),
        value: cairoTime(isCheckIn ? shift.checkInAt : shift.checkOutAt ?? new Date(), language),
        inline: true,
      },
      { name: copy(language, "recordNumber"), value: `#${shift.id}`, inline: true },
    )
    .setFooter({ text: copy(language, "fixedFooter") })
    .setTimestamp(new Date());

  if (!isCheckIn && shift.checkOutAt) {
    embed.addFields({
      name: copy(language, "shiftTotal"),
      value: formatDuration(durationMinutes(shift.checkInAt, shift.checkOutAt), language),
      inline: false,
    });
  }
  if (evidence) embed.setImage(evidence);

  await channel.send({ embeds: [embed] });
}

async function sendHourAdjustmentLog(
  client: Client,
  guild: Guild,
  settings: GuildSettings,
  adjustment: AttendanceHourAdjustment,
  language: Language,
): Promise<void> {
  if (!settings.logChannelId) return;

  const channel = await client.channels.fetch(settings.logChannelId);
  if (!channel || !channel.isTextBased() || !("send" in channel)) return;

  const added = adjustment.minutes > 0;
  const embed = new EmbedBuilder()
    .setColor(added ? 0x16a34a : 0xdc2626)
    .setTitle(added ? copy(language, "adjustmentTitleAdded") : copy(language, "adjustmentTitleRemoved"))
    .setDescription(
      `<@${adjustment.userId}> — ${formatDuration(Math.abs(adjustment.minutes), language)}`,
    )
    .addFields(
      {
        name: copy(language, "member"),
        value: `${adjustment.username} (<@${adjustment.userId}>)`,
        inline: true,
      },
      {
        name: copy(language, "adjustment"),
        value: formatDuration(adjustment.minutes, language),
        inline: true,
      },
      {
        name: copy(language, "actor"),
        value: `<@${adjustment.actorUserId}>`,
        inline: true,
      },
      {
        name: copy(language, "reason"),
        value: adjustment.reason?.trim() || copy(language, "noReason"),
        inline: false,
      },
    )
    .setFooter({ text: copy(language, "fixedFooter") })
    .setTimestamp(adjustment.createdAt);

  await channel.send({ embeds: [embed] });
}

async function recordCheckIn(
  client: Client,
  guild: Guild,
  member: GuildMember,
  evidence: string | undefined,
  sourceMessageId: string | undefined,
  language: Language,
): Promise<{ ok: true; shift: AttendanceShift } | { ok: false; message: string }> {
  const settings = await ensureSettings(guild.id);
  const [active] = await db
    .select()
    .from(attendanceShifts)
    .where(
      and(
        eq(attendanceShifts.guildId, guild.id),
        eq(attendanceShifts.userId, member.id),
        isNull(attendanceShifts.checkOutAt),
      ),
    )
    .limit(1);

  if (active) {
    return {
      ok: false,
      message: COPY[language].alreadyCheckedIn(cairoTime(active.checkInAt, language)),
    };
  }

  const [shift] = await db
    .insert(attendanceShifts)
    .values({
      guildId: guild.id,
      userId: member.id,
      username: member.user.username,
      checkInEvidenceUrl: evidence,
      checkInEvidenceMessageId: sourceMessageId,
    })
    .returning();
  if (!shift) throw new Error("تعذر حفظ تسجيل الدخول.");

  await db.insert(attendanceEvents).values({
    guildId: guild.id,
    shiftId: shift.id,
    userId: member.id,
    username: member.user.username,
    eventType: "check_in",
    evidenceUrl: evidence,
    sourceMessageId,
    actorUserId: member.id,
    metadata: { timezone: settings.timezone, recordedAt: new Date().toISOString() },
  });
  await sendAttendanceLog(client, guild, settings, shift, "check_in", language, evidence);

  return { ok: true, shift };
}

async function recordHourAdjustment(
  client: Client,
  guild: Guild,
  target: GuildMember,
  actor: GuildMember,
  minutes: number,
  reason: string | undefined,
  sourceMessageId: string,
  language: Language,
): Promise<AttendanceHourAdjustment> {
  const settings = await ensureSettings(guild.id);
  const [adjustment] = await db
    .insert(attendanceHourAdjustments)
    .values({
      guildId: guild.id,
      userId: target.id,
      username: target.user.username,
      minutes,
      reason: reason?.trim() || null,
      actorUserId: actor.id,
    })
    .returning();
  if (!adjustment) throw new Error("تعذر حفظ تعديل الساعات.");

  await db.insert(attendanceEvents).values({
    guildId: guild.id,
    userId: target.id,
    username: target.user.username,
    eventType: minutes > 0 ? "manual_hours_add" : "manual_hours_remove",
    occurredAt: adjustment.createdAt,
    sourceMessageId,
    actorUserId: actor.id,
    metadata: {
      minutes,
      reason: reason?.trim() || null,
      language,
    },
  });
  await sendHourAdjustmentLog(client, guild, settings, adjustment, language);
  return adjustment;
}

async function recordCheckOut(
  client: Client,
  guild: Guild,
  member: GuildMember,
  evidence: string | undefined,
  sourceMessageId: string | undefined,
  language: Language,
): Promise<{ ok: true; shift: AttendanceShift } | { ok: false; message: string }> {
  const settings = await ensureSettings(guild.id);
  const [active] = await db
    .select()
    .from(attendanceShifts)
    .where(
      and(
        eq(attendanceShifts.guildId, guild.id),
        eq(attendanceShifts.userId, member.id),
        isNull(attendanceShifts.checkOutAt),
      ),
    )
    .limit(1);

  if (!active) {
    return {
      ok: false,
      message: copy(language, "noActiveShift"),
    };
  }

  const now = new Date();
  const [shift] = await db
    .update(attendanceShifts)
    .set({
      checkOutAt: now,
      checkOutEvidenceUrl: evidence,
      checkOutEvidenceMessageId: sourceMessageId,
      updatedAt: now,
    })
    .where(eq(attendanceShifts.id, active.id))
    .returning();
  if (!shift) throw new Error("تعذر حفظ تسجيل الخروج.");

  await db.insert(attendanceEvents).values({
    guildId: guild.id,
    shiftId: shift.id,
    userId: member.id,
    username: member.user.username,
    eventType: "check_out",
    evidenceUrl: evidence,
    sourceMessageId,
    actorUserId: member.id,
    metadata: {
      timezone: settings.timezone,
      recordedAt: now.toISOString(),
      durationMinutes: durationMinutes(active.checkInAt, now),
    },
  });
  await sendAttendanceLog(client, guild, settings, shift, "check_out", language, evidence);

  return { ok: true, shift };
}

async function buildHoursEmbed(
  guildId: string,
  userId: string,
  username: string,
  language: Language,
): Promise<EmbedBuilder> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const shifts = await db
    .select()
    .from(attendanceShifts)
    .where(
      and(
        eq(attendanceShifts.guildId, guildId),
        eq(attendanceShifts.userId, userId),
        gte(attendanceShifts.checkInAt, since),
      ),
    )
    .orderBy(desc(attendanceShifts.checkInAt));
  const adjustments = await getHourAdjustments(guildId, userId, since);

  const totalMinutes = shifts.reduce(
    (total, shift) =>
      total +
      (shift.checkOutAt
        ? durationMinutes(shift.checkInAt, shift.checkOutAt)
        : durationMinutes(shift.checkInAt, new Date())),
    0,
  );
  const adjustmentMinutes = sumAdjustmentMinutes(adjustments);
  const openShift = shifts.find((shift) => !shift.checkOutAt);

  const embed = new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle(COPY[language].hoursTitle(username))
    .setDescription(copy(language, "hoursDescription"))
    .addFields(
      {
        name: copy(language, "total"),
        value: formatDuration(totalMinutes + adjustmentMinutes, language),
        inline: true,
      },
      { name: copy(language, "shiftCount"), value: String(shifts.length), inline: true },
      {
        name: copy(language, "status"),
        value: openShift
          ? COPY[language].openSince(cairoTime(openShift.checkInAt, language))
          : copy(language, "noOpenShift"),
        inline: false,
      },
    )
    .setTimestamp(new Date());

  const recent = shifts
    .slice(0, 5)
    .map((shift) => {
      const duration = shift.checkOutAt
        ? formatDuration(durationMinutes(shift.checkInAt, shift.checkOutAt), language)
        : copy(language, "open");
      return `• ${cairoDate(shift.checkInAt)} — ${duration} — ${copy(language, "recordNumber")} #${shift.id}`;
    })
    .join("\n");
  if (recent) embed.addFields({ name: copy(language, "recent"), value: recent });
  if (adjustmentMinutes) {
    embed.addFields({
      name: copy(language, "adjustment"),
      value: formatDuration(adjustmentMinutes, language),
      inline: true,
    });
  }
  return embed;
}

async function buildWeeklyReportEmbed(
  guildId: string,
  guildName: string,
  language: Language,
): Promise<EmbedBuilder> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const shifts = await db
    .select()
    .from(attendanceShifts)
    .where(
      and(eq(attendanceShifts.guildId, guildId), gte(attendanceShifts.checkInAt, since)),
    )
    .orderBy(desc(attendanceShifts.checkInAt));
  const adjustments = await db
    .select()
    .from(attendanceHourAdjustments)
    .where(
      and(
        eq(attendanceHourAdjustments.guildId, guildId),
        gte(attendanceHourAdjustments.createdAt, since),
      ),
    );

  const grouped = new Map<
    string,
    { username: string; minutes: number; shifts: number; open: number }
  >();
  for (const shift of shifts) {
    const current = grouped.get(shift.userId) ?? {
      username: shift.username,
      minutes: 0,
      shifts: 0,
      open: 0,
    };
    current.shifts += 1;
    if (shift.checkOutAt) {
      current.minutes += durationMinutes(shift.checkInAt, shift.checkOutAt);
    } else {
      current.minutes += durationMinutes(shift.checkInAt, new Date());
      current.open += 1;
    }
    grouped.set(shift.userId, current);
  }
  for (const adjustment of adjustments) {
    const current = grouped.get(adjustment.userId) ?? {
      username: adjustment.username,
      minutes: 0,
      shifts: 0,
      open: 0,
    };
    current.minutes += adjustment.minutes;
    grouped.set(adjustment.userId, current);
  }

  const lines = [...grouped.entries()]
    .sort(([, left], [, right]) => right.minutes - left.minutes)
    .slice(0, 20)
    .map(
      ([userId, row], index) =>
        `${index + 1}. <@${userId}> — **${formatDuration(row.minutes, language)}** — ${row.shifts} ${language === "ar" ? "شيفت" : "shift"}${row.open ? ` — ${COPY[language].openCount(row.open)}` : ""}`,
    );

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle(COPY[language].weeklyTitle(guildName))
    .setDescription(
      lines.length
        ? lines.join("\n")
        : copy(language, "noRecords"),
    )
    .addFields(
      { name: copy(language, "shifts"), value: String(shifts.length), inline: true },
      { name: copy(language, "members"), value: String(grouped.size), inline: true },
      { name: copy(language, "period"), value: copy(language, "last7Days"), inline: true },
    )
    .setFooter({ text: copy(language, "reportFooter") })
    .setTimestamp(new Date());

  if (grouped.size > 20) {
    embed.addFields({
      name: "ملاحظة",
      value: `تم عرض أول 20 عضوًا من أصل ${grouped.size}.`,
    });
  }
  return embed;
}

async function buildActiveMembersEmbed(
  guildId: string,
  guildName: string,
  language: Language,
): Promise<EmbedBuilder> {
  const activeShifts = await db
    .select()
    .from(attendanceShifts)
    .where(
      and(
        eq(attendanceShifts.guildId, guildId),
        isNull(attendanceShifts.checkOutAt),
      ),
    )
    .orderBy(desc(attendanceShifts.checkInAt));

  const lines = activeShifts.map(
    (shift, index) =>
      `${index + 1}. <@${shift.userId}> — **${shift.username}** — ${COPY[language].activeSince(cairoTime(shift.checkInAt, language))}`,
  );

  return new EmbedBuilder()
    .setColor(0x18a46b)
    .setTitle(COPY[language].activeTitle(guildName))
    .setDescription(lines.length ? lines.join("\n") : copy(language, "activeEmpty"))
    .addFields({
      name: COPY[language].activeCount(activeShifts.length),
      value: String(activeShifts.length),
      inline: true,
    })
    .setFooter({ text: copy(language, "reportFooter") })
    .setTimestamp(new Date());
}

function commandList() {
  return [
    new SlashCommandBuilder()
      .setName("setup-channel")
      .setDescription("تحديد روم سجل الحضور والانصراف")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("الروم الذي ستظهر فيه عمليات الدخول والخروج والصور")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ),
    new SlashCommandBuilder()
      .setName("setup-roles")
      .setDescription("تحديد رتبة الجرد والمراجعة")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addRoleOption((option) =>
        option
          .setName("audit_role")
          .setDescription("الرتبة التي يمكنها رؤية تقارير الفريق")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("admin_role")
          .setDescription("رتبة إدارة البوت، اختيارية")
          .setRequired(false),
      ),
    new SlashCommandBuilder()
      .setName("attendance-panel")
      .setDescription("إرسال لوحة أزرار تسجيل الحضور")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("who-is-in")
      .setDescription("معرفة الأعضاء الموجودين حاليًا في العمل"),
    new SlashCommandBuilder()
      .setName("add-hour")
      .setDescription("إضافة ساعات يدوية لعضو")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("العضو الذي ستتم إضافة الساعات له")
          .setRequired(true),
      )
      .addNumberOption((option) =>
        option
          .setName("hours")
          .setDescription("عدد الساعات المراد إضافتها")
          .setMinValue(0.01)
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("سبب التعديل، اختياري")
          .setRequired(false),
      ),
    new SlashCommandBuilder()
      .setName("remove-hour")
      .setDescription("خصم ساعات من عضو")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("العضو الذي ستتم إزالة الساعات منه")
          .setRequired(true),
      )
      .addNumberOption((option) =>
        option
          .setName("hours")
          .setDescription("عدد الساعات المراد خصمها")
          .setMinValue(0.01)
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("سبب التعديل، اختياري")
          .setRequired(false),
      ),
  ];
}

async function isAdminOrConfiguredRole(
  member: GuildMember,
  settings: GuildSettings,
): Promise<boolean> {
  return (
    isAdministrator(member) ||
    (!!settings.adminRoleId && member.roles.cache.has(settings.adminRoleId))
  );
}

async function replyError(
  interaction: ChatInputCommandInteraction,
  error: unknown,
  language: Language,
): Promise<void> {
  logger.error({ err: error, guildId: interaction.guildId }, "Discord interaction failed");
  const content = copy(language, "botError");
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content, ephemeral: true });
  } else {
    await interaction.reply({ content, ephemeral: true });
  }
}

function buildEvidenceModal(action: AttendanceAction, language: Language): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`attendance:evidence:${action}`)
    .setTitle(actionLabel(action, language))
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(copy(language, "evidenceUploadLabel"))
        .setDescription(copy(language, "evidenceUploadDescription"))
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId("evidence_file")
            .setMinValues(0)
            .setMaxValues(1)
            .setRequired(false),
        ),
      new LabelBuilder()
        .setLabel(copy(language, "evidenceLinkLabel"))
        .setDescription(copy(language, "evidenceLinkDescription"))
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("evidence_url")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(copy(language, "evidencePlaceholder"))
            .setRequired(false),
        ),
    );
}

function parseImageLink(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function showEvidenceModal(
  interaction: Interaction & { guild?: Guild | null },
  action: AttendanceAction,
): Promise<void> {
  if (!interaction.guild) return;
  const language = await getLanguage(interaction.guild.id, interaction.user.id);
  const settings = await getSettings(interaction.guild.id);
  if (!settings?.logChannelId) {
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: copy(language, "setupMissing"),
        ephemeral: true,
      });
    }
    return;
  }
  if (interaction.isButton()) {
    await interaction.showModal(buildEvidenceModal(action, language));
  }
}

async function handleEvidenceModal(
  client: Client,
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.guild || !interaction.customId.startsWith("attendance:evidence:")) return;
  const language = await getLanguage(interaction.guild.id, interaction.user.id);

  const action: AttendanceAction = interaction.customId.endsWith("check_in")
    ? "check_in"
    : "check_out";
  const uploadedFiles = interaction.fields.getUploadedFiles("evidence_file", false);
  const uploadedFile = uploadedFiles?.first();
  const linkValue = interaction.fields.getTextInputValue("evidence_url").trim();
  const linkedEvidence = parseImageLink(linkValue);

  if (uploadedFile && !evidenceUrl(uploadedFile)) {
    await interaction.reply({
      content: copy(language, "fileMustBeImage"),
      ephemeral: true,
    });
    return;
  }
  if (linkValue && !linkedEvidence) {
    await interaction.reply({
      content: copy(language, "invalidLink"),
      ephemeral: true,
    });
    return;
  }

  const evidence = evidenceUrl(uploadedFile) ?? linkedEvidence;
  if (!evidence) {
    await interaction.reply({
      content: copy(language, "evidenceRequired"),
      ephemeral: true,
    });
    return;
  }

  const member = await fetchMember(interaction.guild, interaction.user.id);
  if (!member) {
    await interaction.reply({ content: copy(language, "memberReadFailed"), ephemeral: true });
    return;
  }

  const result =
    action === "check_in"
      ? await recordCheckIn(client, interaction.guild, member, evidence, interaction.id, language)
      : await recordCheckOut(client, interaction.guild, member, evidence, interaction.id, language);
  await interaction.reply({
    content: result.ok
      ? `${actionLabel(action, language)} ${language === "ar" ? "تم بنجاح في" : "completed at"} **${cairoTime(action === "check_in" ? result.shift.checkInAt : result.shift.checkOutAt ?? new Date(), language)}**.`
      : result.message,
    ephemeral: true,
  });
}

async function handleChatCommand(
  client: Client,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({ content: copy("ar", "serverOnly"), ephemeral: true });
    return;
  }

  const guild = interaction.guild;
  const language = await getLanguage(guild.id, interaction.user.id);
  const member = await fetchMember(guild, interaction.user.id);
  if (!member) {
    await interaction.reply({ content: copy(language, "roleReadFailed"), ephemeral: true });
    return;
  }

  try {
    const settings = await ensureSettings(guild.id);

    if (interaction.commandName === "setup-channel") {
      if (!(await isAdminOrConfiguredRole(member, settings))) {
        await interaction.reply({ content: copy(language, "adminOnly"), ephemeral: true });
        return;
      }
      const channel = interaction.options.getChannel("channel", true);
      await db
        .update(guildSettings)
        .set({ logChannelId: channel.id, updatedAt: new Date() })
        .where(eq(guildSettings.guildId, guild.id));
      await interaction.reply({
        content: COPY[language].setupChannelDone(String(channel)),
        ephemeral: true,
      });
      return;
    }

    if (interaction.commandName === "setup-roles") {
      if (!(await isAdminOrConfiguredRole(member, settings))) {
        await interaction.reply({ content: copy(language, "adminOnly"), ephemeral: true });
        return;
      }
      const auditRole = interaction.options.getRole("audit_role", true);
      const adminRole = interaction.options.getRole("admin_role", false);
      await db
        .update(guildSettings)
        .set({
          auditRoleId: auditRole.id,
          adminRoleId: adminRole?.id ?? settings.adminRoleId,
          updatedAt: new Date(),
        })
        .where(eq(guildSettings.guildId, guild.id));
      await interaction.reply({
        content: COPY[language].setupRolesDone(String(auditRole), adminRole ? String(adminRole) : ""),
        ephemeral: true,
      });
      return;
    }

    if (interaction.commandName === "who-is-in") {
      if (!hasAuditAccess(member, settings)) {
        await interaction.reply({ content: copy(language, "reportAccess"), ephemeral: true });
        return;
      }
      const embed = await buildActiveMembersEmbed(guild.id, guild.name, language);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (interaction.commandName === "add-hour" || interaction.commandName === "remove-hour") {
      if (!hasAuditAccess(member, settings)) {
        await interaction.reply({ content: copy(language, "auditOnly"), ephemeral: true });
        return;
      }

      const targetUser = interaction.options.getUser("member", true);
      const requestedHours = interaction.options.getNumber("hours", true);
      const minutes = Math.round(requestedHours * 60);
      if (minutes <= 0) {
        await interaction.reply({ content: copy(language, "invalidHours"), ephemeral: true });
        return;
      }

      const targetMember = await fetchMember(guild, targetUser.id);
      if (!targetMember) {
        await interaction.reply({ content: copy(language, "targetReadFailed"), ephemeral: true });
        return;
      }

      const signedMinutes =
        interaction.commandName === "add-hour" ? minutes : -minutes;
      await recordHourAdjustment(
        client,
        guild,
        targetMember,
        member,
        signedMinutes,
        interaction.options.getString("reason", false) ?? undefined,
        interaction.id,
        language,
      );
      const formattedHours = formatDuration(minutes, language);
      await interaction.reply({
        content:
          interaction.commandName === "add-hour"
            ? COPY[language].manualAdjustmentAdded(formattedHours, targetMember.displayName)
            : COPY[language].manualAdjustmentRemoved(formattedHours, targetMember.displayName),
        ephemeral: true,
      });
      return;
    }

    if (interaction.commandName === "attendance-panel") {
      if (!(await isAdminOrConfiguredRole(member, settings))) {
        await interaction.reply({ content: copy(language, "adminOnly"), ephemeral: true });
        return;
      }
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(PANEL_BUTTONS.checkIn)
          .setLabel("تسجيل دخول")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(PANEL_BUTTONS.checkOut)
          .setLabel("تسجيل خروج")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(PANEL_BUTTONS.hours)
          .setLabel("عرض ساعاتي")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(PANEL_BUTTONS.weeklyReport)
          .setLabel("الجرد الأسبوعي")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(PANEL_BUTTONS.language)
          .setLabel("Language / اللغة")
          .setStyle(ButtonStyle.Secondary),
      );
      await interaction.reply({
        content: copy(language, "panelText"),
        components: [row],
      });
      return;
    }

  } catch (error) {
    await replyError(interaction, error, language);
  }
}

async function handleButton(client: Client, interaction: Interaction): Promise<void> {
  if (!interaction.isButton() || !interaction.guild) return;
  if (interaction.customId === PANEL_BUTTONS.language) {
    const currentLanguage = await getLanguage(interaction.guild.id, interaction.user.id);
    const languageMenu = new StringSelectMenuBuilder()
      .setCustomId("attendance:language-select")
      .setPlaceholder(copy(currentLanguage, "languagePrompt"))
      .addOptions(
        { label: "العربية", value: "ar", description: "استخدم البوت بالعربية" },
        { label: "English", value: "en", description: "Use the bot in English" },
      );
    await interaction.reply({
      content: copy(currentLanguage, "languagePrompt"),
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(languageMenu)],
      ephemeral: true,
    });
    return;
  }
  if (interaction.customId === PANEL_BUTTONS.hours) {
    const language = await getLanguage(interaction.guild.id, interaction.user.id);
    const member = await fetchMember(interaction.guild, interaction.user.id);
    if (!member) {
      await interaction.reply({ content: copy(language, "memberReadFailed"), ephemeral: true });
      return;
    }
    const embed = await buildHoursEmbed(
      interaction.guild.id,
      interaction.user.id,
      member.displayName,
      language,
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }
  if (interaction.customId === PANEL_BUTTONS.weeklyReport) {
    const language = await getLanguage(interaction.guild.id, interaction.user.id);
    const settings = await getSettings(interaction.guild.id);
    const member = await fetchMember(interaction.guild, interaction.user.id);
    if (!settings || !member || !hasAuditAccess(member, settings)) {
      await interaction.reply({
        content: copy(language, "reportAccess"),
        ephemeral: true,
      });
      return;
    }
    const embed = await buildWeeklyReportEmbed(interaction.guild.id, interaction.guild.name, language);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }
  if (interaction.customId === PANEL_BUTTONS.checkIn) {
    await showEvidenceModal(interaction, "check_in");
  } else if (interaction.customId === PANEL_BUTTONS.checkOut) {
    await showEvidenceModal(interaction, "check_out");
  }
}

async function handleLanguageSelect(interaction: Interaction): Promise<void> {
  if (
    !interaction.isStringSelectMenu() ||
    interaction.customId !== "attendance:language-select" ||
    !interaction.guild
  ) {
    return;
  }

  const language: Language = interaction.values[0] === "en" ? "en" : "ar";
  await saveLanguage(interaction.guild.id, interaction.user.id, language);
  await interaction.update({
    content: language === "en" ? COPY.en.languageSavedEnglish : COPY.ar.languageSaved,
    components: [],
  });
}

async function registerCommands(client: Client): Promise<void> {
  const commands = commandList().map((command) => command.toJSON());
  for (const guild of client.guilds.cache.values()) {
    await guild.commands.set(commands);
  }
}

async function registerCommandsForGuild(guild: Guild): Promise<void> {
  await guild.commands.set(commandList().map((command) => command.toJSON()));
  logger.info({ guildId: guild.id, guildName: guild.name }, "Discord commands registered");
}

async function runScheduledReports(client: Client): Promise<void> {
  const schedule = cairoScheduleParts(new Date());
  if (schedule.weekday !== "Sun" || schedule.hour !== "23" || schedule.minute !== "55") {
    return;
  }

  const configurations = await db
    .select()
    .from(guildSettings)
    .where(gte(guildSettings.updatedAt, new Date(0)));
  const reportKey = cairoDate(new Date());
  for (const settings of configurations) {
    if (!settings.logChannelId || settings.lastWeeklyReportKey === reportKey) continue;
    const guild = client.guilds.cache.get(settings.guildId);
    if (!guild) continue;
    const channel = await client.channels.fetch(settings.logChannelId);
    if (!channel || !channel.isTextBased() || !("send" in channel)) continue;
    const embed = await buildWeeklyReportEmbed(guild.id, guild.name, "ar");
    await channel.send({ embeds: [embed] });
    await db
      .update(guildSettings)
      .set({ lastWeeklyReportKey: reportKey, updatedAt: new Date() })
      .where(eq(guildSettings.guildId, guild.id));
  }
}

export function startDiscordBot(): void {
  // Railway injects service variables into process.env at runtime.
  // Keep the token out of source control and configure it as a Railway variable.
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) {
    logger.error(
      "DISCORD_BOT_TOKEN is missing. Add it to Railway Variables before starting the service.",
    );
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once("clientReady", async (readyClient) => {
    logger.info(
      { user: readyClient.user.tag, guilds: readyClient.guilds.cache.size },
      "Discord attendance bot is ready",
    );
    await registerCommands(readyClient);
    setInterval(() => {
      runScheduledReports(readyClient).catch((error) =>
        logger.error({ err: error }, "Scheduled weekly report failed"),
      );
    }, 60_000);
  });

  client.on("guildCreate", (guild) => {
    registerCommandsForGuild(guild).catch((error) =>
      logger.error({ err: error, guildId: guild.id }, "Could not register commands for new guild"),
    );
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleChatCommand(client, interaction);
      } else if (interaction.isButton()) {
        await handleButton(client, interaction);
      } else if (interaction.isStringSelectMenu()) {
        await handleLanguageSelect(interaction);
      } else if (interaction.isModalSubmit()) {
        await handleEvidenceModal(client, interaction);
      }
    } catch (error) {
      logger.error({ err: error }, "Unhandled Discord interaction error");
    }
  });

  client.login(token).catch((error) => {
    logger.error({ err: error }, "Discord bot login failed");
  });
}