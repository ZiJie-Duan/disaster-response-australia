// =============================
// 方案 A：Dynamic Library Import（推荐，少依赖）
// 目录：app/google-maps/page.tsx（Next.js App Router）
// 说明：
// 1) 通过 <Script> 注入官方 bootloader（只需一次）。
// 2) 在客户端组件中用 google.maps.importLibrary 按需加载。
// 3) SSR 场景下必须在客户端执行（'use client'）。
// =============================

"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

export default function Page() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: google.maps.Map | null = null;

    async function initMap() {
      // 确保 bootloader 已经把 google.maps 挂到全局
      // 然后按需加载库
      const { Map } = (await (window as any).google.maps.importLibrary(
        "maps"
      )) as google.maps.MapsLibrary;

      const { AdvancedMarkerElement } = (await (window as any).google.maps.importLibrary(
        "marker"
      )) as google.maps.MarkerLibrary;
      

      if (!mapRef.current) return;

      map = new Map(mapRef.current, {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8,
        mapId: "YOUR_MAP_ID", // 可选：自定义样式
      });

            // The marker, positioned at Uluru
        const marker = new AdvancedMarkerElement({
            map: map,
            position: { lat: -34.397, lng: 150.644 },
            title: 'Uluru'
        });

      // 如需高级标记：
      // await (window as any).google.maps.importLibrary("marker");
      // const marker = new (window as any).google.maps.marker.AdvancedMarkerElement({
      //   map,
      //   position: { lat: -34.397, lng: 150.644 },
      // });
    }

    initMap();

    return () => {
      // 可选：清理逻辑（如果你在组件卸载时需要释放资源）
      map = null;
      marker = null;
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      {/* 1) 官方 bootloader（只加载一次即可） */}
      <Script id="gmaps-boot" strategy="afterInteractive">
        {`
          (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
            key: "${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}",
            v: "weekly",
          });
        `}
      </Script>

      {/* 2) 地图容器 */}
      <div
        ref={mapRef}
        style={{ height: 480, width: "100%", borderRadius: 12 }}
        className="shadow"
      />
    </div>
  );
}

// =============================
// 方案 B：@googlemaps/js-api-loader（工程化/多处复用时好用）
// 目录：components/GoogleMapClient.tsx，然后在任意页面引入使用
// =============================

// components/GoogleMapClient.tsx
// "use client";
// import { useEffect, useRef } from "react";
// import { Loader } from "@googlemaps/js-api-loader";
//
// export default function GoogleMapClient() {
//   const ref = useRef<HTMLDivElement>(null);
//
//   useEffect(() => {
//     let map: google.maps.Map | null = null;
//     const loader = new Loader({
//       apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
//       version: "weekly",
//     });
//
//     loader
//       .load()
//       .then(async () => {
//         const { Map } = (await (window as any).google.maps.importLibrary(
//           "maps"
//         )) as google.maps.MapsLibrary;
//         if (!ref.current) return;
//         map = new Map(ref.current, {
//           center: { lat: -34.397, lng: 150.644 },
//           zoom: 8,
//         });
//       })
//       .catch((e) => {
//         console.error("Failed to load Google Maps API:", e);
//       });
//
//     return () => {
//       map = null;
//     };
//   }, []);
//
//   return <div ref={ref} style={{ height: 480, width: "100%" }} />;
// }

// pages 使用：
// app/google-maps-jsapi/page.tsx
// "use client";
// import GoogleMapClient from "@/components/GoogleMapClient";
// export default function Page() {
//   return (
//     <div className="p-6">
//       <GoogleMapClient />
//     </div>
//   );
// }

// =============================
// 方案对比 & 为什么要这样做
// - Next.js 有 SSR，window/document 在服务器端不存在；因此地图初始化必须在客户端组件中进行（'use client' + useEffect）。
// - Dynamic Library Import：按需加载库，避免首屏把所有功能一次性打包/下载，性能更好；且能避免多次重复加载。
// - js-api-loader：更贴近工程化（支持多个页面/组件共享加载逻辑），内部仍然使用 importLibrary，方便在大型项目里统一管理 API Key/版本等配置。
// - <Script strategy="afterInteractive">：确保在浏览器空闲且可交互后再加载 bootloader，不阻塞首屏。
// - 环境变量：把 API Key 放在 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY，避免硬编码到源码中。