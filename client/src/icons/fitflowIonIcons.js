import {
  IoBarbellOutline,
  IoBicycleOutline,
  IoCalculatorOutline,
  IoCalendarOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoClipboardOutline,
  IoCloseOutline,
  IoFlashOutline,
  IoFlameOutline,
  IoHardwareChipOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoPlayOutline,
  IoPulseOutline,
  IoRefreshOutline,
  IoSearchOutline,
  IoSettingsOutline,
  IoSparklesOutline,
  IoStarOutline,
  IoStatsChartOutline,
  IoTrashOutline,
  IoWalkOutline,
} from "react-icons/io5";

export {
  IoBarbellOutline,
  IoBicycleOutline,
  IoCalculatorOutline,
  IoCalendarOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoClipboardOutline,
  IoCloseOutline,
  IoFlashOutline,
  IoFlameOutline,
  IoHardwareChipOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoPlayOutline,
  IoPulseOutline,
  IoRefreshOutline,
  IoSearchOutline,
  IoSettingsOutline,
  IoSparklesOutline,
  IoStarOutline,
  IoStatsChartOutline,
  IoTrashOutline,
  IoWalkOutline,
};

/** Ionicons 5 outline — shared across FitFlow */
export const NAV_ICON = {
  dashboard: IoHomeOutline,
  workouts: IoClipboardOutline,
  calendar: IoCalendarOutline,
  nutrition: IoFlameOutline,
  tdee: IoCalculatorOutline,
  aiCoach: IoHardwareChipOutline,
  progress: IoStatsChartOutline,
};

/** Signup avatar options — stored index in localStorage `fitflow_avatar_icon_idx` */
export const AVATAR_ICON_LIST = [
  IoBarbellOutline,
  IoSparklesOutline,
  IoWalkOutline,
  IoFlashOutline,
  IoBicycleOutline,
  IoStarOutline,
];

export const AVATAR_STORAGE_KEY = "fitflow_avatar_icon_idx";

export function readAvatarIconIndex() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (raw != null && raw !== "") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= 0 && n < AVATAR_ICON_LIST.length) return n;
    }
  } catch {
    /* ignore */
  }
  return 0;
}
