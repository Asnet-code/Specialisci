"use client";

import Link from "next/link";

export default function AuthLinks() {
  return (
    <div className="flex gap-4 mt-4">
      <Link
        href="/login"
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
      >
        Zaloguj się
      </Link>
      <Link
        href="/register"
        className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition"
      >
        Zarejestruj się
      </Link>
    </div>
  );
}
