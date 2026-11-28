import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function BoardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 7v8M12 7v4M16 7v10" />
    </Icon>
  );
}

export function WeekIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="15" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4M7.5 14.5h3" />
    </Icon>
  );
}

export function MonthIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="15" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M7.5 13.5h.01M12 13.5h.01M16.5 13.5h.01M7.5 17h.01M12 17h.01" strokeWidth="2.5" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </Icon>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </Icon>
  );
}

export function SubtasksIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="6" height="6" rx="1.5" />
      <path d="M4.5 7l1 1 2-2" />
      <path d="M13 7h8M13 17h8" />
      <rect x="3" y="14" width="6" height="6" rx="1.5" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.3 4.2 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4M12 17h.01" />
    </Icon>
  );
}

export function HourglassIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3h10M7 21h10M8 3v3.5a4 4 0 0 0 1.6 3.2L12 12l2.4-2.3A4 4 0 0 0 16 6.5V3M8 21v-3.5a4 4 0 0 1 1.6-3.2L12 12l2.4 2.3a4 4 0 0 1 1.6 3.2V21" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.25" />
      <circle cx="9" cy="17" r="2.25" />
    </Icon>
  );
}

export function RepeatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 3l3 3-3 3" />
      <path d="M4 12v-1a5 5 0 0 1 5-5h11" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M20 12v1a5 5 0 0 1-5 5H4" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  );
}

const CLOUD = "M7.5 18.5a4.5 4.5 0 0 1-.6-8.96 5.5 5.5 0 0 1 10.7 1.46 3.75 3.75 0 0 1-.35 7.5z";

export function CloudCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d={CLOUD} />
      <path d="M9.75 14.25l1.75 1.75 3-3" />
    </Icon>
  );
}

export function CloudUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d={CLOUD} />
      <path d="M12 16.25v-4.5M10 13.5l2-2 2 2" />
    </Icon>
  );
}

export function CloudOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d={CLOUD} />
      <path d="M4 4l16 16" />
    </Icon>
  );
}
