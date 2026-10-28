/**
 * UI string catalog. Every entry carries both languages inline so a missing
 * translation is easy to spot. `{name}` placeholders are filled by t().
 */
export const LANGUAGES = ['ko', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';

type Entry = Record<Language, string>;

export const STRINGS: Record<string, Entry> = {
  // ── Navigation ────────────────────────────────────────────────────────
  'tab.home': { ko: '홈', en: 'Today' },
  'tab.medicines': { ko: '내 약', en: 'Medicines' },
  'tab.calendar': { ko: '달력', en: 'History' },
  'tab.settings': { ko: '설정', en: 'Settings' },
  'nav.addMedicine': { ko: '약 등록', en: 'Add Medicine' },
  'nav.editMedicine': { ko: '약 수정', en: 'Edit Medicine' },
  'nav.paywall': { ko: '정식 버전', en: 'Full Version' },
  'nav.back': { ko: '뒤로', en: 'Back' },

  // ── Common ────────────────────────────────────────────────────────────
  'common.cancel': { ko: '취소', en: 'Cancel' },
  'common.ok': { ko: '확인', en: 'OK' },
  'common.delete': { ko: '삭제', en: 'Delete' },
  'common.error': { ko: '오류', en: 'Error' },
  'common.done': { ko: '완료', en: 'Done' },
  'common.unknownMedicine': { ko: '알 수 없는 약', en: 'Unknown medicine' },

  // ── App init ──────────────────────────────────────────────────────────
  'app.subtitle': { ko: '약 복용 알리미', en: 'Medication reminders' },
  'app.initErrorTitle': { ko: '앱 초기화 오류', en: 'Startup error' },
  'app.initErrorBody': {
    ko: '앱을 시작하는 중 문제가 발생했습니다. 앱을 재시작해 주세요.',
    en: 'Something went wrong while starting. Please restart the app.',
  },

  // ── Home ──────────────────────────────────────────────────────────────
  'home.title': { ko: '오늘의 복용 현황', en: "Today's Doses" },
  'home.addA11y': { ko: '약 추가', en: 'Add medicine' },
  'home.emptyTitle': { ko: '오늘 복용할 약이 없어요', en: 'Nothing to take today' },
  'home.emptyDesc': {
    ko: '약을 등록하면 복용 알림을 받을 수 있어요',
    en: 'Add a medicine to start getting reminders',
  },
  'home.emptyCta': { ko: '+ 약 등록하기', en: '+ Add a medicine' },
  'home.allDone': { ko: '🎉 오늘 약을 모두 드셨어요!', en: "🎉 All done for today!" },
  'home.permEnable': { ko: '켜기', en: 'Turn on' },
  'home.streak': { ko: '🔥 {n}일 연속 복용', en: '🔥 {n}-day streak' },

  // ── Progress ──────────────────────────────────────────────────────────
  'progress.label': { ko: '오늘 복용 현황', en: "Today's progress" },
  'progress.count': { ko: ' / {total}회 완료', en: ' / {total} taken' },

  // ── Dose item ─────────────────────────────────────────────────────────
  'dose.markTaken': { ko: '복용 완료', en: 'Mark as taken' },
  'dose.unmark': { ko: '복용 취소', en: 'Undo' },
  'dose.offset': { ko: '{n}분 전', en: '{n} min early' },
  'dose.taken': { ko: '복용', en: 'Taken' },
  'dose.missed': { ko: '미복용', en: 'Missed' },

  // ── Prescription banner ───────────────────────────────────────────────
  'presc.bannerTitle': { ko: '재처방 임박 알림', en: 'Refill soon' },
  'presc.expired': { ko: '⚠️ 재처방 기간이 만료되었습니다', en: '⚠️ Prescription period has ended' },

  // ── Medicine list ─────────────────────────────────────────────────────
  'list.title': { ko: '내 약 목록', en: 'My Medicines' },
  'list.emptyTitle': { ko: '등록된 약이 없어요', en: 'No medicines yet' },
  'list.emptyDesc': {
    ko: '약을 등록하면 정해진 시간에\n복용 알림을 드려요',
    en: "Add a medicine and we'll remind you\nright on time",
  },
  'list.emptyCta': { ko: '첫 약 등록하기', en: 'Add your first medicine' },
  'list.deleteTitle': { ko: '약 삭제', en: 'Delete medicine' },
  'list.deleteBody': {
    ko: '"{name}"을(를) 삭제하시겠어요?\n복용 기록도 모두 삭제됩니다.',
    en: 'Delete "{name}"?\nIts dose history will be deleted too.',
  },

  // ── Days ──────────────────────────────────────────────────────────────
  'days.everyday': { ko: '매일', en: 'Every day' },
  'days.weekday': { ko: '평일', en: 'Weekdays' },
  'days.weekend': { ko: '주말', en: 'Weekends' },
  'days.custom': { ko: '직접', en: 'Custom' },

  // ── Medicine form ─────────────────────────────────────────────────────
  'form.basic': { ko: '기본 정보', en: 'Basics' },
  'form.name': { ko: '약 이름 *', en: 'Name *' },
  'form.namePlaceholder': { ko: '예: 타이레놀, 오메가-3', en: 'e.g. Tylenol, Omega-3' },
  'form.dosage': { ko: '1회 복용량 *', en: 'Dose per intake *' },
  'form.dosageCustom': { ko: '직접입력', en: 'Custom' },
  'form.dosagePlaceholder': { ko: '예: 2.5정, 500mg, 2캡슐', en: 'e.g. 2.5 tabs, 500mg, 2 caps' },
  'form.schedule': { ko: '복용 시간', en: 'Schedule' },
  'form.frequency': { ko: '1일 복용 횟수 *', en: 'Times per day *' },
  'form.freqUnit': { ko: '{n}회', en: '{n}×' },
  'form.freqCustom': { ko: '직접', en: 'Custom' },
  'form.freqCustomPlaceholder': { ko: '횟수', en: 'Count' },
  'form.freqCustomHint': { ko: '회 (최대 20)', en: 'times (max 20)' },
  'form.apply': { ko: '적용', en: 'Apply' },
  'form.times': { ko: '복용 시간 설정 * (24시간제)', en: 'Dose times * (24-hour)' },
  'form.addTime': { ko: '시간 추가', en: 'Add time' },
  'form.days': { ko: '복용 요일', en: 'Days' },
  'form.color': { ko: '색상 태그', en: 'Color' },
  'form.offsetTitle': { ko: '알림 시간 조정', en: 'Reminder timing' },
  'form.offsetLabel': { ko: '복용 시간 기준 알림 시점', en: 'Remind me' },
  'form.offsetOnTime': { ko: '정시', en: 'On time' },
  'form.offsetBefore': { ko: '{n}분 전', en: '{n} min before' },
  'form.offsetHint': { ko: '복용 {n}분 전에 알림을 드려요', en: "We'll remind you {n} minutes early" },
  'form.memo': { ko: '메모 (선택)', en: 'Notes (optional)' },
  'form.memoPlaceholder': { ko: '복용 시 주의사항, 보관 방법 등', en: 'Instructions, storage, etc.' },
  'form.prescription': { ko: '재처방 알림 (선택)', en: 'Refill reminder (optional)' },
  'form.prescStart': { ko: '처방 시작일', en: 'Start date' },
  'form.prescDays': { ko: '총 처방 일수', en: 'Days supplied' },
  'form.prescDaysPlaceholder': { ko: '예: 30', en: 'e.g. 30' },
  'form.prescAlert': { ko: '알림 시점 (복수 선택)', en: 'Remind me (pick any)' },
  'form.saveNew': { ko: '약 등록하기', en: 'Add medicine' },
  'form.saveEdit': { ko: '수정 완료', en: 'Save changes' },
  'form.errTitle': { ko: '입력 오류', en: 'Check your input' },
  'form.errName': { ko: '약 이름을 입력해주세요.', en: 'Please enter a name.' },
  'form.errDosage': { ko: '복용량을 입력해주세요.', en: 'Please enter a dose.' },
  'form.errTimes': { ko: '복용 시간을 하나 이상 설정해주세요.', en: 'Add at least one dose time.' },
  'form.errFreq': { ko: '복용 횟수는 1 ~ 20 사이로 입력해주세요.', en: 'Enter a number from 1 to 20.' },
  'form.errDate': {
    ko: '처방 시작일을 올바른 형식으로 입력해주세요.\n예: 2026-01-15',
    en: 'Enter the start date as YYYY-MM-DD.\ne.g. 2026-01-15',
  },
  'form.errPrescDays': { ko: '처방 일수를 올바르게 입력해주세요.', en: 'Enter a valid number of days.' },
  'form.errSave': { ko: '저장 중 문제가 발생했습니다. 다시 시도해주세요.', en: "Couldn't save. Please try again." },
  'form.on': { ko: 'ON', en: 'ON' },
  'form.off': { ko: 'OFF', en: 'OFF' },

  // ── Calendar ──────────────────────────────────────────────────────────
  'cal.title': { ko: '복용 기록', en: 'History' },
  'cal.monthRate': { ko: '이번 달 {n}%', en: 'This month {n}%' },
  'cal.today': { ko: '오늘', en: 'Today' },
  'cal.scheduled': { ko: '(예정)', en: '(upcoming)' },
  'cal.future': { ko: '아직 복용 기록이 없어요.', en: 'No records yet.' },
  'cal.empty': { ko: '이 날의 복용 기록이 없어요.', en: 'No doses on this day.' },

  // ── Settings ──────────────────────────────────────────────────────────
  'settings.title': { ko: '설정', en: 'Settings' },
  'settings.sectionPlan': { ko: '이용권', en: 'Plan' },
  'settings.planPro': { ko: '정식 버전 이용 중', en: 'Full version active' },
  'settings.restore': { ko: '구매 복원', en: 'Restore purchase' },
  'settings.restoreNoneTitle': { ko: '복원할 구매 없음', en: 'Nothing to restore' },
  'settings.restoreNoneBody': {
    ko: '이 Apple ID로 구매한 내역을 찾지 못했어요.',
    en: "We couldn't find a purchase for this Apple ID.",
  },
  'settings.restoreDoneTitle': { ko: '복원 완료', en: 'Restored' },
  'settings.restoreDoneBody': { ko: '정식 버전이 복원되었어요.', en: 'Your full version has been restored.' },
  'settings.restoreFail': { ko: '구매 복원에 실패했어요. 잠시 후 다시 시도해 주세요.', en: "Couldn't restore. Please try again later." },
  'settings.sectionNotif': { ko: '알림', en: 'Notifications' },
  'settings.sound': { ko: '알림 소리', en: 'Sound' },
  'settings.vibration': { ko: '알림 진동', en: 'Vibration' },
  'settings.testNotif': { ko: '알림 테스트', en: 'Test notification' },
  'settings.testNotifSub': { ko: '5초 뒤 테스트 알림을 보내요', en: 'Sends a test reminder in 5 seconds' },
  'settings.testSentTitle': { ko: '테스트 알림을 보냈어요', en: 'Test reminder scheduled' },
  'settings.testSentBody': {
    ko: '5초 뒤에 알림이 와요. 홈 화면으로 나가거나 화면을 꺼 보세요.\n\n예약된 복용 알림: {n}개',
    en: 'It arrives in 5 seconds. Try leaving the app or locking the screen.\n\nScheduled dose reminders: {n}',
  },
  'settings.sectionDisplay': { ko: '화면', en: 'Display' },
  'settings.theme': { ko: '테마', en: 'Theme' },
  'settings.themeSystem': { ko: '시스템', en: 'System' },
  'settings.themeLight': { ko: '라이트', en: 'Light' },
  'settings.themeDark': { ko: '다크', en: 'Dark' },
  'settings.language': { ko: '언어', en: 'Language' },
  'settings.langSystem': { ko: '시스템', en: 'System' },
  'settings.sectionData': { ko: '데이터', en: 'Data' },
  'settings.export': { ko: '백업 내보내기', en: 'Export backup' },
  'settings.exportSub': { ko: '파일로 저장 (iCloud·파일 앱)', en: 'Save as a file (iCloud, Files)' },
  'settings.import': { ko: '백업 불러오기', en: 'Import backup' },
  'settings.importSub': { ko: '기기 변경 시 복원', en: 'Restore on a new device' },
  'settings.importConfirmTitle': { ko: '백업 불러오기', en: 'Import backup' },
  'settings.importConfirmBody': {
    ko: '백업 파일의 약과 복용 기록을 불러와요.\n같은 약은 백업 내용으로 덮어씁니다.',
    en: 'Medicines and history from the file will be loaded.\nMatching medicines are replaced by the backup.',
  },
  'settings.importDone': { ko: '약 {m}개, 복용 기록 {r}개를 불러왔어요.', en: 'Imported {m} medicines and {r} dose records.' },
  'settings.reset': { ko: '복용 기록 초기화', en: 'Clear dose history' },
  'settings.resetSub': { ko: '{n}개 약 등록됨', en: '{n} medicines saved' },
  'settings.resetTitle': { ko: '복용 기록 초기화', en: 'Clear dose history' },
  'settings.resetBody': {
    ko: '모든 복용 기록이 삭제됩니다.\n이 작업은 되돌릴 수 없어요.',
    en: 'All dose history will be deleted.\nThis cannot be undone.',
  },
  'settings.resetConfirm': { ko: '초기화', en: 'Clear' },
  'settings.resetDone': { ko: '복용 기록이 초기화되었습니다.', en: 'Dose history cleared.' },
  'settings.sectionUpdate': { ko: '업데이트', en: 'Updates' },
  'settings.checkUpdate': { ko: '업데이트 확인', en: 'Check for updates' },
  'settings.checking': { ko: '확인 중…', en: 'Checking…' },
  'settings.channel': { ko: '채널: {c}', en: 'Channel: {c}' },
  'settings.updateSub': { ko: '최신 버전 여부를 확인합니다', en: 'See if a newer version is available' },
  'settings.updateDev': { ko: '개발 환경에서는 OTA 업데이트를 사용할 수 없습니다.', en: 'OTA updates are not available in development.' },
  'settings.updateFail': { ko: '네트워크 연결을 확인해 주세요.', en: 'Please check your connection.' },
  'settings.updateLatest': { ko: '현재 최신 버전을 사용 중입니다.', en: "You're on the latest version." },
  'settings.sectionInfo': { ko: '앱 정보', en: 'About' },
  'settings.privacy': { ko: '개인정보처리방침', en: 'Privacy policy' },
  'settings.version': { ko: '앱 버전', en: 'Version' },
  'settings.footer': { ko: 'MediRemind\n약 복용 알리미', en: 'MediRemind\nMedication reminders' },

  // ── Backup ────────────────────────────────────────────────────────────
  'backup.dialog': { ko: 'MediRemind 백업 저장', en: 'Save MediRemind backup' },
  'backup.invalid': { ko: '올바른 백업 파일이 아니에요.', en: "This isn't a valid backup file." },
  'backup.newer': {
    ko: '더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트해 주세요.',
    en: 'This backup is from a newer app version. Please update the app.',
  },
  'backup.readError': { ko: '파일을 읽을 수 없어요.', en: "Couldn't read the file." },
  'backup.exportFail': { ko: '백업 파일을 만들지 못했어요.', en: "Couldn't create the backup." },

  // ── Paywall ───────────────────────────────────────────────────────────
  'paywall.title': { ko: 'MediRemind 정식 버전', en: 'MediRemind Full Version' },
  'paywall.active': { ko: '정식 버전 이용 중', en: 'Full version active' },
  'paywall.f1': { ko: '약 무제한 등록 (무료 버전은 {n}개까지)', en: 'Unlimited medicines (free version: up to {n})' },
  'paywall.f2': { ko: '한 번 결제로 평생 사용 · 자동 결제 없음', en: 'Pay once, keep it forever — never billed again' },
  'paywall.f3': { ko: '가족 공유로 최대 6명이 함께 사용', en: 'Family Sharing: up to 6 family members' },
  'paywall.f4': { ko: '앞으로 추가되는 기능도 모두 포함', en: 'Includes every future feature' },
  'paywall.limitReached': { ko: '무료 버전은 약 {n}개까지 등록할 수 있어요', en: 'The free version holds up to {n} medicines' },
  'paywall.freeUsage': { ko: '무료 버전 · 약 {n}/{max}개 사용 중', en: 'Free version · {n}/{max} medicines used' },
  'settings.planFree': { ko: '무료 버전 · 약 {n}개까지', en: 'Free version · up to {n} medicines' },
  'settings.planFreeSub': { ko: '{price} 한 번이면 무제한 · 탭하여 보기', en: 'Unlimited for {price}, once · Tap to see' },
  'paywall.oneTime': { ko: '1회 결제 · 구독 아님', en: 'One-time purchase, not a subscription' },
  'paywall.buy': { ko: '{price}에 정식 버전 구매', en: 'Unlock for {price}' },
  'paywall.later': { ko: '나중에', en: 'Not now' },
  'paywall.unavailable': {
    ko: '지금은 스토어에서 상품 정보를 불러오지 못했어요. 네트워크를 확인해 주세요.',
    en: "Couldn't load the product from the store. Please check your connection.",
  },
  'paywall.failTitle': { ko: '구매 실패', en: 'Purchase failed' },
  'paywall.failBody': { ko: '결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.', en: "The purchase didn't go through. Please try again." },
  'paywall.footer': { ko: '결제는 Apple ID로 처리됩니다. 정식 버전을 사지 않아도 약 {n}개까지는 알림·기록을 평생 무료로 쓸 수 있어요.', en: 'Payment is handled by your Apple ID. Without it, reminders and history for up to {n} medicines stay free forever.' },

  // ── Notifications ─────────────────────────────────────────────────────
  'notif.channelDose': { ko: '약 복용 알림', en: 'Dose reminders' },
  'notif.channelRefill': { ko: '재처방 알림', en: 'Refill reminders' },
  'notif.doseTitle': { ko: '💊 약 복용 시간이에요', en: '💊 Time for your medicine' },
  'notif.doseBodyOne': { ko: '{name} {dosage}', en: '{name} · {dosage}' },
  'notif.doseBodyEarly': { ko: '{n}분 뒤 복용: {list}', en: 'In {n} min: {list}' },
  'notif.actionTake': { ko: '복용 완료', en: 'Mark taken' },
  'notif.refillTitle': { ko: '🏥 재처방 알림', en: '🏥 Refill reminder' },
  'notif.refillBody': {
    ko: '{name} 처방이 {n}일 남았어요. 병원 예약을 확인하세요.',
    en: '{name} runs out in {n} days. Time to book a refill.',
  },
  'notif.testTitle': { ko: '💊 테스트 알림', en: '💊 Test reminder' },
  'notif.testBody': { ko: '알림이 정상적으로 도착했어요!', en: 'Reminders are working!' },
  'notif.permTitle': { ko: '알림이 꺼져 있어요', en: 'Notifications are off' },
  'notif.permBody': {
    ko: '설정에서 알림을 허용해야 복용 시간에 알려드릴 수 있어요.',
    en: 'Allow notifications in Settings so we can remind you on time.',
  },
  'notif.openSettings': { ko: '설정 열기', en: 'Open Settings' },
};
