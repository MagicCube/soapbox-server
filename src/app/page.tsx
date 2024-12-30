"use client";

import dynamic from "next/dynamic";

const Main = dynamic(() => import("./main"), { ssr: false });

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <Main />
    </main>
  );
}
