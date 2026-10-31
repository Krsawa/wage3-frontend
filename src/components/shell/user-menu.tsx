"use client";

import { LogOut, Mail } from "lucide-react";

import {
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useMe } from "@/lib/api/queries";
import { useSession, useSignOut } from "@/lib/auth/use-session";

export function Avatar({ name, email, src, className = "size-8" }: { name?: string | null; email: string; src?: string | null; className?: string }) {
  const initial = (name || email).trim().charAt(0).toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" referrerPolicy="no-referrer" className={`${className} rounded-full object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center rounded-full bg-inverse text-[13px] font-semibold text-inverse-fg`}>
      {initial}
    </span>
  );
}

export function UserMenu() {
  const { user: sessionUser } = useSession();
  const { data: me } = useMe();
  const signOut = useSignOut();
  const user = me ?? sessionUser;
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownTrigger
        className="pressable rounded-full outline-offset-2"
        aria-label="Account menu"
      >
        <Avatar name={user.full_name} email={user.email} src={user.avatar_url} />
      </DropdownTrigger>
      <DropdownContent className="w-64">
        <DropdownLabel className="flex flex-col gap-0.5 pb-2">
          {user.full_name && <span className="text-sm font-medium text-fg">{user.full_name}</span>}
          <span className="flex items-center gap-1.5 truncate">
            <Mail className="size-3" /> {user.email}
          </span>
        </DropdownLabel>
        <DropdownSeparator />
        <DropdownItem icon={<LogOut />} onSelect={signOut}>
          Sign out
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );
}
