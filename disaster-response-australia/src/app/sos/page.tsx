"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function EmergencySOS() {
  const router = useRouter();

  const handleHelpClick = () => {
    router.push("/userLogin");
  };

  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ backgroundColor: "#0b1828" }}
    >
      {/* Disaster Response Australia Header */}
      <div 
        className="w-full flex items-center justify-center gap-3 py-3 px-4 cursor-pointer hover:bg-opacity-80 transition-colors"
        style={{ backgroundColor: "#1e293b" }}
        onClick={() => router.push("/")}
      >
        <Image
          src="/logo.svg"
          alt="Disaster Response Australia Logo"
          width={32}
          height={32}
          className="w-8 h-8"
        />
        <span className="text-white text-lg font-semibold">
          Disaster Response Australia
        </span>
      </div>

      {/* Top Title Bar */}
      <div 
        className="w-full text-center py-4 text-white text-2xl font-bold"
        style={{ backgroundColor: "#DC2626" }}
      >
        Emergency SOS
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* HELP Button */}
        <button
          onClick={handleHelpClick}
          className="flex items-center justify-center rounded-full w-56 h-56 text-white text-5xl font-black transition-all active:translate-y-2 active:shadow-[0_8px_0_0_rgba(0,0,0,0.2)]"
          style={{
            backgroundColor: "#EF4444",
            border: "8px solid white",
            boxShadow: "0 12px 0 0 rgba(0,0,0,0.2)",
          }}
        >
          HELP!
        </button>

        {/* Helper Text */}
        <p className="text-gray-300 text-center">
          Tap to send emergency alert
        </p>
      </div>
    </div>
  );
}
