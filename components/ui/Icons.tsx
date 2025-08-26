import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const S = ({ children, size = 18, ...rest }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>{children}</svg>
);

export const HomeIcon = (p: IconProps) => (
  <S {...p}><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></S>
);

export const LayersIcon = (p: IconProps) => (
  <S {...p}><path d="m12 2 8.5 5L12 12 3.5 7 12 2Zm8.5 10L12 17l-8.5-5M20.5 17 12 22 3.5 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></S>
);

export const TicketIcon = (p: IconProps) => (
  <S {...p}><path d="M4 7h16v4a2 2 0 1 0 0 4v4H4v-4a2 2 0 1 0 0-4V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 7v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);

export const FileIcon = (p: IconProps) => (
  <S {...p}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12V9l-4-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></S>
);

export const CreditCardIcon = (p: IconProps) => (
  <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 10h18" stroke="currentColor" strokeWidth="1.6"/><path d="M7 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);

export const BankIcon = (p: IconProps) => (
  <S {...p}><path d="M3 10 12 5l9 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M5 10v7M9 10v7M15 10v7M19 10v7" stroke="currentColor" strokeWidth="1.6"/><path d="M3 17h18M2 20h20" stroke="currentColor" strokeWidth="1.6"/></S>
);

export const BadgeIcon = (p: IconProps) => (
  <S {...p}><path d="M12 3l2.5 4.8L20 9l-4 3.9L17 19l-5-2.7L7 19l1-6.1L4 9l5.5-1.2L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></S>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <S {...p}><path d="M12 3 5 6v6c0 4.4 3.1 7.9 7 9 3.9-1.1 7-4.6 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.6"/><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></S>
);

export const UserIcon = (p: IconProps) => (
  <S {...p}><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M5 19a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);

export const LogInIcon = (p: IconProps) => (
  <S {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.6"/><path d="M10 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);

export const LogOutIcon = (p: IconProps) => (
  <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.6"/><path d="M14 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);
