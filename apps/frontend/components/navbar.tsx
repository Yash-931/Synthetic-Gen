"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link
          href="/projects"
          className="text-[15px] font-semibold tracking-tight text-[var(--color-text)]"
        >
          Synthetic<span className="text-[var(--color-accent)]">Gen</span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-text-faint)]">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
