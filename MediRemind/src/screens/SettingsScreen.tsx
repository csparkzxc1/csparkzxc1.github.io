import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

import type { RootStackParamList } from "../types";
import { PRIVACY_POLICY_URL } from "../config";
import { useDoseStore } from "../store/doseStore";
import { useMedicineStore } from "../store/medicineStore";
import { useEntitlement } from "../purchase/EntitlementProvider";
import { PURCHASE_CONFIG } from "../purchase/purchase.config";
import {
  loadReminderSettings,
  openSystemSettings,
  saveReminderSettings,
  sendTestNotification,
  syncNotifications,
  type ReminderSettings,
} from "../notifications/notifications";
import { exportBackup, importBackup } from "../lib/backup";
import { dateKey } from "../lib/schedule";
import { checkAndApplyUpdate, getBuildInfo } from "../utils/updateUtils";
import { useI18n } from "../i18n/I18nProvider";
import { formatShortDate, LANGUAGES, LANGUAGE_NAMES, type LanguagePref } from "../i18n/core";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import {
  cardShadow,
  type Scheme,
  type ThemeColors,
  type ThemeMode,
} from "../theme/theme";
import TextSizeSlider from "../components/TextSizeSlider";
import ScreenHeader from "../components/ScreenHeader";
import { guardianAvailable } from "../guardian/config";
import { useFamilySummary } from "../guardian/useFamilySummary";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function SettingRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  danger,
  value,
  badge,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  /** Current setting, shown before the chevron. */
  value?: string;
  /** Red count, e.g. doses family missed today. */
  badge?: number;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "22" }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {right ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        ) : null)}
    </TouchableOpacity>
  );
}

function SheetChoice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.sheetRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.sheetText, active && styles.sheetTextOn]}>
        {label}
      </Text>
      {active && <Ionicons name="checkmark" size={20} color={colors.brand} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { t, pref: langPref, setLanguage } = useI18n();
  const [sheet, setSheet] = useState<null | "theme" | "text" | "lang">(null);
  // Once linked, the row reads like a status line instead of an ad for the feature.
  const family = useFamilySummary();
  const missedCount = family?.reduce((n, m) => n + m.missed.length, 0) ?? 0;
  const familyNames = family
    ?.map((m) => m.patient.name || t("guardian.unnamed"))
    .join(", ");
  const familyLine = !family?.length
    ? null
    : missedCount
      ? t("settings.familyMissed", { names: familyNames!, n: missedCount })
      : t("settings.familyOk", { names: familyNames! });
  const langName = (v: LanguagePref) =>
    v === "system" ? t("settings.langSystem") : LANGUAGE_NAMES[v];
  const { colors, mode, setMode, textScale } = useTheme();
  const themeName = (m: ThemeMode) =>
    t(
      m === "system"
        ? "settings.themeSystem"
        : m === "light"
          ? "settings.themeLight"
          : "settings.themeDark",
    );
  const styles = useThemedStyles(makeStyles);
  const { isPro, product, restore, family: familyPlan, manageSubscriptions } = useEntitlement();
  const planDate = (ms: number) => formatShortDate(dateKey(new Date(ms)));
  const familyPlanLine =
    familyPlan.kind !== "subscribed"
      ? null
      : familyPlan.subscription.trial
        ? t("settings.familyTrial", { date: planDate(familyPlan.subscription.expiresAt) })
        : t(familyPlan.subscription.willRenew ? "settings.familyRenews" : "settings.familyEnds", {
            date: planDate(familyPlan.subscription.expiresAt),
          });

  const [settings, setSettings] = useState<ReminderSettings>({
    sound: true,
    vibration: true,
  });
  const [busy, setBusy] = useState<
    null | "update" | "export" | "import" | "restore"
  >(null);
  const buildInfo = getBuildInfo();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const { clearAllRecords, syncDoses } = useDoseStore();
  const { medicines, loadMedicines } = useMedicineStore();

  useEffect(() => {
    loadReminderSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  const updateSettings = async (next: ReminderSettings) => {
    setSettings(next);
    Haptics.selectionAsync().catch(() => {});
    await saveReminderSettings(next);
    await syncNotifications(useMedicineStore.getState().medicines);
  };

  const handleTestNotification = async () => {
    const result = await sendTestNotification();
    if (result.status === "denied") {
      Alert.alert(t("notif.permTitle"), t("notif.permBody"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("notif.openSettings"), onPress: openSystemSettings },
      ]);
      return;
    }
    // Make sure the real schedule is in place too.
    await syncNotifications(useMedicineStore.getState().medicines);
    Alert.alert(
      t("settings.testSentTitle"),
      t("settings.testSentBody", { n: result.scheduledDoses }),
    );
  };

  const handleRestore = async () => {
    setBusy("restore");
    try {
      const ok = await restore();
      Alert.alert(
        ok ? t("settings.restoreDoneTitle") : t("settings.restoreNoneTitle"),
        ok ? t("settings.restoreDoneBody") : t("settings.restoreNoneBody"),
      );
    } catch {
      Alert.alert(t("common.error"), t("settings.restoreFail"));
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    setBusy("export");
    try {
      await exportBackup();
    } catch (e) {
      console.warn("[settings] export failed", e);
      Alert.alert(t("common.error"), t("backup.exportFail"));
    } finally {
      setBusy(null);
    }
  };

  const handleImport = () => {
    Alert.alert(
      t("settings.importConfirmTitle"),
      t("settings.importConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.ok"),
          onPress: async () => {
            setBusy("import");
            try {
              const result = await importBackup();
              if (result.cancelled) return;
              await loadMedicines();
              const meds = useMedicineStore.getState().medicines;
              await syncDoses(meds, dateKey(new Date()));
              await syncNotifications(meds);
              Alert.alert(
                t("common.done"),
                t("settings.importDone", {
                  m: result.medicines,
                  r: result.doseRecords,
                }),
              );
            } catch (e) {
              Alert.alert(
                t("common.error"),
                e instanceof Error ? e.message : t("backup.readError"),
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Alert.alert(t("settings.resetTitle"), t("settings.resetBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.resetConfirm"),
        style: "destructive",
        onPress: async () => {
          await clearAllRecords();
          await syncDoses(
            useMedicineStore.getState().medicines,
            dateKey(new Date()),
          );
          Alert.alert(t("common.done"), t("settings.resetDone"));
        },
      },
    ]);
  };

  const handleCheckUpdate = async () => {
    if (__DEV__) {
      Alert.alert(t("settings.sectionUpdate"), t("settings.updateDev"));
      return;
    }
    setBusy("update");
    const result = await checkAndApplyUpdate();
    setBusy(null);
    if (result.isError)
      Alert.alert(t("common.error"), t("settings.updateFail"));
    else if (!result.isAvailable)
      Alert.alert(t("settings.sectionUpdate"), t("settings.updateLatest"));
  };

  const spinner = (key: typeof busy) =>
    busy === key ? <ActivityIndicator color={colors.brand} /> : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title={t("settings.title")} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Free users: one clear upgrade card on top. Pro status lives under About. */}
        {!isPro && (
          <TouchableOpacity
            style={styles.upgrade}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Paywall")}
            accessibilityRole="button"
          >
            <View style={styles.upgradeIcon}>
              <Ionicons name="sparkles" size={20} color={colors.onBrand} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.upgradeTitle}>
                {t("settings.upgradeTitle")}
              </Text>
              <Text style={styles.upgradeSub}>
                {t("settings.upgradeSub", {
                  price:
                    product?.priceLabel ?? PURCHASE_CONFIG.fallbackPriceLabel,
                })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onBrand} />
          </TouchableOpacity>
        )}

        {/* ─ Family ─ */}
        {guardianAvailable() && (
          <>
            <Text style={styles.sectionLabel}>
              {t("settings.sectionFamily")}
            </Text>
            <View style={styles.card}>
              <SettingRow
                icon="people"
                iconColor={colors.success}
                title={t("settings.guardian")}
                subtitle={familyLine ?? t("settings.guardianSub")}
                badge={missedCount}
                onPress={() => navigation.navigate("Guardian")}
              />
            </View>
          </>
        )}

        {/* ─ Notifications ─ */}
        <Text style={styles.sectionLabel}>{t("settings.sectionNotif")}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="volume-high"
            iconColor={colors.brand}
            title={t("settings.sound")}
            right={
              <Switch
                value={settings.sound}
                onValueChange={(v) => updateSettings({ ...settings, sound: v })}
                trackColor={{ false: colors.surfaceMuted, true: colors.brand }}
                thumbColor="#FFF"
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="notifications-outline"
            iconColor={colors.success}
            title={t("settings.testNotif")}
            subtitle={t("settings.testNotifSub")}
            onPress={handleTestNotification}
          />
          {/* iOS decides notification vibration itself; the toggle only works on Android. */}
          {Platform.OS === "android" && (
            <>
              <View style={styles.divider} />
              <SettingRow
                icon="phone-portrait"
                iconColor="#8B5CF6"
                title={t("settings.vibration")}
                right={
                  <Switch
                    value={settings.vibration}
                    onValueChange={(v) =>
                      updateSettings({ ...settings, vibration: v })
                    }
                    trackColor={{ false: colors.surfaceMuted, true: "#8B5CF6" }}
                    thumbColor="#FFF"
                  />
                }
              />
            </>
          )}
        </View>

        {/* ─ Display: one line each, details in a sheet ─ */}
        <Text style={styles.sectionLabel}>{t("settings.sectionDisplay")}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="contrast"
            iconColor="#6366F1"
            title={t("settings.theme")}
            value={themeName(mode)}
            onPress={() => setSheet("theme")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="text"
            iconColor="#F59E0B"
            title={t("settings.textSize")}
            value={`${Math.round(textScale * 100)}%`}
            onPress={() => setSheet("text")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="globe-outline"
            iconColor="#0EA5E9"
            title={t("settings.language")}
            value={langName(langPref)}
            onPress={() => setSheet("lang")}
          />
        </View>

        {/* ─ Data ─ */}
        <Text style={styles.sectionLabel}>{t("settings.sectionData")}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="share-outline"
            iconColor="#14B8A6"
            title={t("settings.export")}
            subtitle={t("settings.exportSub")}
            onPress={busy ? undefined : handleExport}
            right={spinner("export")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="download-outline"
            iconColor={colors.brand}
            title={t("settings.import")}
            subtitle={t("settings.importSub")}
            onPress={busy ? undefined : handleImport}
            right={spinner("import")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trash-outline"
            iconColor={colors.danger}
            title={t("settings.reset")}
            subtitle={t("settings.resetSub", { n: medicines.length })}
            onPress={handleReset}
            danger
          />
        </View>

        {/* ─ About: plan, restore, updates, legal, version ─ */}
        <Text style={styles.sectionLabel}>{t("settings.sectionInfo")}</Text>
        <View style={styles.card}>
          {isPro && (
            <>
              <SettingRow
                icon="checkmark-done-circle"
                iconColor={colors.success}
                title={t("settings.planPro")}
              />
              <View style={styles.divider} />
            </>
          )}
          {guardianAvailable() && (
            <>
              {familyPlan.kind === "legacy" ? (
                <SettingRow
                  icon="people"
                  iconColor={colors.success}
                  title={t("settings.familyPlan")}
                  subtitle={t("settings.familyLegacy")}
                  right={
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{t("settings.lifetime")}</Text>
                    </View>
                  }
                />
              ) : familyPlan.kind === "subscribed" ? (
                <>
                  <SettingRow
                    icon="people"
                    iconColor={colors.success}
                    title={t("settings.familyPlan")}
                    subtitle={familyPlanLine ?? undefined}
                  />
                  <View style={styles.divider} />
                  <SettingRow
                    icon="settings-outline"
                    iconColor={colors.textMuted}
                    title={t("settings.manageSub")}
                    onPress={() => manageSubscriptions().catch(() => {})}
                  />
                </>
              ) : (
                <SettingRow
                  icon="people"
                  iconColor={colors.success}
                  title={t("settings.familyPlan")}
                  subtitle={t("settings.familyOffer")}
                  onPress={() => navigation.navigate("Paywall", { reason: "guardian" })}
                />
              )}
              <View style={styles.divider} />
            </>
          )}
          <SettingRow
            icon="refresh"
            iconColor={colors.textMuted}
            title={t("settings.restore")}
            onPress={busy ? undefined : handleRestore}
            right={spinner("restore")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="cloud-download-outline"
            iconColor={colors.brand}
            title={
              busy === "update"
                ? t("settings.checking")
                : t("settings.checkUpdate")
            }
            subtitle={
              buildInfo.channel
                ? t("settings.channel", { c: buildInfo.channel })
                : t("settings.updateSub")
            }
            onPress={busy ? undefined : handleCheckUpdate}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="shield-checkmark"
            iconColor="#14B8A6"
            title={t("settings.privacy")}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="information-circle"
            iconColor={colors.textMuted}
            title={t("settings.version")}
            subtitle={`v${version}${buildInfo.updateId ? ` · ${buildInfo.updateId.slice(0, 8)}` : ""}`}
          />
        </View>

        <Text style={styles.footer}>{t("settings.footer")}</Text>
      </ScrollView>

      <Modal
        visible={sheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        {/* The slider's gestures need their own root inside a Modal. */}
        <GestureHandlerRootView style={styles.sheetRoot}>
          <Pressable style={styles.sheetDim} onPress={() => setSheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            {sheet === "text" ? (
              <>
                <Text style={styles.sheetTitle}>{t("settings.textSize")}</Text>
                <View style={styles.sheetBody}>
                  <TextSizeSlider />
                  <Text style={styles.textPreview}>
                    {t("settings.textPreview")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetDone}
                  onPress={() => setSheet(null)}
                  accessibilityRole="button"
                >
                  <Text style={styles.sheetDoneText}>{t("common.done")}</Text>
                </TouchableOpacity>
              </>
            ) : sheet === "theme" ? (
              <>
                <Text style={styles.sheetTitle}>{t("settings.theme")}</Text>
                {(["system", "light", "dark"] as ThemeMode[]).map((value) => (
                  <SheetChoice
                    key={value}
                    label={themeName(value)}
                    active={mode === value}
                    onPress={() => {
                      setMode(value);
                      setSheet(null);
                    }}
                  />
                ))}
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>{t("settings.language")}</Text>
                {(["system", ...LANGUAGES] as LanguagePref[]).map((value) => (
                  <SheetChoice
                    key={value}
                    label={langName(value)}
                    active={langPref === value}
                    onPress={() => {
                      setLanguage(value);
                      setSheet(null);
                    }}
                  />
                ))}
              </>
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors, scheme: Scheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      letterSpacing: 0.6,
      marginTop: 22,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      overflow: "hidden",
      ...cardShadow(c, scheme),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 58,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: "500", color: c.text },
    rowSubtitle: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.line,
      marginLeft: 66,
    },
    rowValue: {
      fontSize: 14,
      color: c.textMuted,
      marginLeft: 8,
      marginRight: 4,
      maxWidth: "40%",
    },
    badge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      backgroundColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
      marginRight: 4,
    },
    pill: {
      backgroundColor: c.success + "22",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    pillText: { fontSize: 11, fontWeight: "800", color: c.success },
    badgeText: { fontSize: 12, fontWeight: "800", color: "#FFF" },
    upgrade: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      padding: 16,
      borderRadius: 18,
      backgroundColor: c.brand,
      ...cardShadow(c, scheme),
    },
    upgradeIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    upgradeTitle: { fontSize: 16, fontWeight: "800", color: c.onBrand },
    upgradeSub: { fontSize: 12, color: c.onBrand, opacity: 0.85, marginTop: 3 },
    textPreview: { fontSize: 15, color: c.text, marginTop: 10, lineHeight: 21 },
    sheetBody: { paddingVertical: 8 },
    sheetDone: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: c.brand,
      alignItems: "center",
    },
    sheetDoneText: { fontSize: 16, fontWeight: "700", color: c.onBrand },
    sheetRoot: { flex: 1 },
    sheetDim: { flex: 1, backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 36,
    },
    sheetGrip: {
      alignSelf: "center",
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.line,
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
      marginBottom: 6,
    },
    sheetRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    sheetText: { fontSize: 16, color: c.text },
    sheetTextOn: { color: c.brand, fontWeight: "700" },
    footer: {
      marginTop: 32,
      fontSize: 12,
      color: c.textFaint,
      textAlign: "center",
      lineHeight: 20,
    },
  });
