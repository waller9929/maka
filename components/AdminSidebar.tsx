"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/bulk-upload", label: "Bulk upload" },
  { href: "/admin/settings", label: "Site settings" },
  { href: "/admin/places", label: "Manage places" },
  { href: "/admin/ads", label: "Ads" },
  { href: "/admin/visitors", label: "Visitors" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="card p-2 h-fit space-y-1">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`block px-3 py-2 rounded-card text-sm ${
            pathname === item.href
              ? "bg-brand-blue text-white"
              : "text-brand-gray hover:bg-brand-bg"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
