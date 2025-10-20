"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function Confirmation() {
  const [time, setTime] = useState("");

  useEffect(() => {
    // Get current time when component mounts
    setTime(new Date().toLocaleTimeString("en-GB"));
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#0b1828" }}
    >
      {/* Header */}
      <div
        className="w-full text-center py-4 text-2xl font-bold text-white"
        style={{ backgroundColor: "#E53935" }}
      >
        Rescue on the way
      </div>

      {/* Content Area */}
      <div className="flex flex-col items-center justify-start px-6 pt-12 pb-10 gap-6">
        {/* Main Title */}
        <h1 className="text-3xl font-bold text-center" style={{ color: "#f8fafc" }}>
          Help is coming
        </h1>

        {/* Subtitle */}
        <p className="text-base text-center text-white">
          Rescue team has received your alert
        </p>

        {/* Ambulance Image */}
        <div className="mt-6">
          <Image
            src="/ambulance.svg"
            alt="Ambulance"
            width={500}
            height={600}
            className="w-64 h-auto"
          />
        </div>

        {/* Timestamp */}
        <p className="text-lg text-white mt-6">
          Alert sent: {time}
        </p>
      </div>
    </div>
  );
}
