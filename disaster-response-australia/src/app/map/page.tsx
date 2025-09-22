// =============================
// Approach A: Dynamic Library Import (Recommended, fewer dependencies)
// Location: app/google-maps/page.tsx (Next.js App Router)
// Description:
// 1) Use <Script> to inject the official bootloader (only needs to be done once).
// 2) Use google.maps.importLibrary in a client component to load libraries on demand.
// 3) Must be executed on the client-side for SSR scenarios ('use client').
// =============================

"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

export default function Page() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: google.maps.Map | null = null;

    async function initMap() {
      // Ensure the bootloader has attached google.maps to the window object,
      // then load libraries on demand.
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
        mapId: "YOUR_MAP_ID", // Optional: for custom map styling
      });

            // The marker, positioned at Uluru
        const marker = new AdvancedMarkerElement({
            map: map,
            position: { lat: -34.397, lng: 150.644 },
            title: 'Uluru'
        });

      // For Advanced Markers:
      // await (window as any).google.maps.importLibrary("marker");
      // const marker = new (window as any).google.maps.marker.AdvancedMarkerElement({
      //   map,
      //   position: { lat: -34.397, lng: 150.644 },
      // });
    }

    initMap();

    return () => {
      // Optional: Cleanup logic (if you need to release resources on component unmount)
      map = null;
      // marker = null; // 'marker' is not defined in this scope, so this line was commented out.
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      {/* 1) Official bootloader (only needs to be loaded once) */}
      <Script id="gmaps-boot" strategy="afterInteractive">
        {`
          (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
            key: "${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}",
            v: "weekly",
          });
        `}
      </Script>

      {/* 2) The map container */}
      <div
        ref={mapRef}
        style={{ height: 480, width: "100%", borderRadius: 12 }}
        className="shadow"
      />
    </div>
  );
}

// =============================
// Approach B: @googlemaps/js-api-loader (Good for modular/reusable setups)
// Location: components/GoogleMapClient.tsx, then import and use on any page.
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

// Usage in a page:
// app/google-maps-jsapi/page.tsx
// "use client";
// import GoogleMapClient from "@/components/GoogleMapClient";
// export default function Page() {
//   return (
//     <div className="p-6">
//       <GoogleMapClient /> // Assuming you have this component
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