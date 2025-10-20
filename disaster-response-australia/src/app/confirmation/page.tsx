"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Helper function to get token from cookie
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'drau_id_token') {
      return value;
    }
  }
  return null;
}

interface EmergencyData {
  location: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  urgency: string;
  timestamp: string;
}

interface SurvivorReportResponse {
  id: string;
  title: string | null;
  description: string | null;
  level: string | null;
  location: {
    type: string;
    coordinates: number[];
  };
  address: string | null;
  created_at: string;
}

export default function Confirmation() {
  const router = useRouter();
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    // Get current time when component mounts
    setTime(new Date().toLocaleTimeString("en-GB"));

    // Submit the emergency report
    submitEmergencyReport();
  }, []);

  const submitEmergencyReport = async () => {
    try {
      // Get emergency data from sessionStorage
      const emergencyDataStr = sessionStorage.getItem("emergencyData");
      
      if (!emergencyDataStr) {
        setSubmitError("No emergency data found");
        setIsSubmitting(false);
        return;
      }

      const emergencyData: EmergencyData = JSON.parse(emergencyDataStr);

      // Get auth token
      const token = getTokenFromCookie();
      
      if (!token) {
        setSubmitError("Authentication required. Please login first.");
        setIsSubmitting(false);
        return;
      }

      // Prepare the API request body according to SurvivorReportCreateReq schema
      const requestBody = {
        title: emergencyData.title || null,
        description: emergencyData.description || null,
        level: emergencyData.urgency || null, // "high", "medium", or "low"
        location: {
          type: "Point",
          coordinates: [emergencyData.longitude, emergencyData.latitude] // [lng, lat]
        },
        address: emergencyData.location || null
      };

      // Call the API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/survivor_reports`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || 
          `Failed to submit report: ${response.status} ${response.statusText}`
        );
      }

      // Parse successful response
      const result: SurvivorReportResponse = await response.json();
      setReportId(result.id);
      setIsSubmitting(false);

      // Clear sessionStorage after successful submission
      sessionStorage.removeItem("emergencyData");

    } catch (error) {
      console.error("Error submitting emergency report:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit emergency report"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen"
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

      {/* Header */}
      <div
        className="w-full text-center py-4 text-2xl font-bold text-white"
        style={{ 
          backgroundColor: submitError ? "#DC2626" : isSubmitting ? "#F59E0B" : "#E53935" 
        }}
      >
        {submitError ? "Submission Failed" : isSubmitting ? "Submitting..." : "Rescue on the way"}
      </div>

      {/* Content Area */}
      <div className="flex flex-col items-center justify-start px-6 pt-12 pb-10 gap-6">
        {/* Loading State */}
        {isSubmitting && (
          <>
            <h1 className="text-3xl font-bold text-center" style={{ color: "#f8fafc" }}>
              Sending your alert...
            </h1>
            <div className="mt-6">
              <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-red-500"></div>
            </div>
            <p className="text-base text-center text-white">
              Please wait while we submit your emergency report
            </p>
          </>
        )}

        {/* Error State */}
        {submitError && !isSubmitting && (
          <>
            <h1 className="text-3xl font-bold text-center" style={{ color: "#f8fafc" }}>
              Something went wrong
            </h1>
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: "#7f1d1d" }}>
              <p className="text-white text-center">{submitError}</p>
            </div>
            <button
              onClick={() => router.push("/userLogin")}
              className="mt-6 px-6 py-3 rounded-md text-lg font-semibold text-white transition-all"
              style={{ backgroundColor: "#E53935" }}
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 rounded-md text-lg font-semibold text-white transition-all"
              style={{ backgroundColor: "#1e293b" }}
            >
              Go Home
            </button>
          </>
        )}

        {/* Success State */}
        {!isSubmitting && !submitError && reportId && (
          <>
            <h1 className="text-3xl font-bold text-center" style={{ color: "#f8fafc" }}>
              Help is coming
            </h1>

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

            {/* Report ID */}
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "#1e293b" }}>
              <p className="text-sm text-gray-400 text-center">Report ID</p>
              <p className="text-white text-center font-mono text-sm mt-1">{reportId}</p>
            </div>

            {/* Return Home Button */}
            <button
              onClick={() => router.push("/")}
              className="mt-6 px-8 py-3 rounded-md text-lg font-semibold text-white transition-all"
              style={{ backgroundColor: "#1e293b" }}
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
