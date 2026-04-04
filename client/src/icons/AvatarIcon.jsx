import { AVATAR_ICON_LIST } from "./fitflowIonIcons.js";

export function AvatarIcon({ index, size = 18, className }) {
  const I =
    AVATAR_ICON_LIST[
      Math.min(Math.max(0, index), AVATAR_ICON_LIST.length - 1)
    ];
  return <I size={size} className={className} aria-hidden />;
}
