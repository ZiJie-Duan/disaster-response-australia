"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface LoginModalProps {
  onClose: () => void;
}

// 临时路由表：在接入真实鉴权前，用它来演示不同的页面跳转。
// TODO(auth): 等后端登录流程完成后，改为真实的接口校验逻辑。
const DEMO_CREDENTIAL_ROUTES: Record<string, { password: string; redirect: string }> = {
  "console@example.com": { password: "console123", redirect: "/console" },
  "management@example.com": { password: "manage123", redirect: "/management" },
};

export default function LoginModal({ onClose }: LoginModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const password = String(formData.get("password") ?? "");

    const match = DEMO_CREDENTIAL_ROUTES[email];

    if (match && password === match.password) {
      // TODO(auth): 这里未来替换成真实鉴权成功后的处理逻辑。
      setError(null);
      onClose();
      router.push(match.redirect);
      return;
    }

    // 保持弹窗开启，同时提醒未来的我们删除这段临时代码。
    setError("Demo credentials only: use console@example.com or management@example.com.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#0C1E3B] text-white shadow-lg ring-1 ring-white/20 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white"
          aria-label="Close"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/80"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="mt-1 block w-full rounded-md border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:border-sky-500 focus:ring-sky-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/80"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="mt-1 block w-full rounded-md border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:border-sky-500 focus:ring-sky-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              Sign In
            </button>
          </div>
          {error && (
            <p className="mt-4 text-center text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 text-center text-sm">
            <p className="text-white/60">
              Don't have an account?{" "}
              <a href="#" className="font-medium text-sky-400 hover:text-sky-300">
                Sign up
              </a>
            </p>
            <p className="mt-2">
                <a href="#" className="text-sm font-medium text-white/60 hover:text-white/80">
                    Forgot password?
                </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
