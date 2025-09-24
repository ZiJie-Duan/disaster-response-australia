/**
 * 灾害响应地图组件
 * 
 * 集成 TerraDraw 和 Google Maps，提供强大的地图绘制功能：
 * - 使用 TerraDraw 处理用户交互和绘制逻辑
 * - 使用 Google Maps 原生对象进行图形渲染
 * - 支持点、线、多边形、矩形、圆形的绘制和编辑
 * - 提供 GeoJSON 数据导出功能
 */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import {
  TerraDraw,
  TerraDrawSelectMode,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawCircleMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';

/**
 * 图形管理器类
 * 负责将 TerraDraw 的 GeoJSON 特征转换为 Google Maps 原生对象
 * 实现 TerraDraw 交互与 Google Maps 原生样式的完美结合
 */
class ShapeManager {
  private map: google.maps.Map;
  private shapes: Map<string, google.maps.MVCObject> = new Map();
  
  constructor(map: google.maps.Map) {
    this.map = map;
  }

  // 将 GeoJSON Feature 转换为 Google Maps 原生对象
  private createGoogleMapsShape(feature: any): google.maps.MVCObject | null {
    const { geometry, properties, id } = feature;
    
    // 过滤掉 TerraDraw 的临时/辅助特征
    // 只渲染有明确 mode 属性的正式特征
    if (!properties?.mode) {
      return null;
    }
    
    // 检查是否是特殊模式（矩形、圆形）
    if (properties?.mode === 'rectangle' && geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0];
      const bounds = new google.maps.LatLngBounds();
      coords.forEach((coord: number[]) => {
        bounds.extend({ lat: coord[1], lng: coord[0] });
      });
      return new google.maps.Rectangle({
        bounds,
        map: this.map,
        fillColor: '#34A853',
        fillOpacity: 0.2,
        strokeColor: '#34A853',
        strokeWeight: 2,
        strokeOpacity: 0.8,
      });
    }
    
    if (properties?.mode === 'circle' && geometry.type === 'Polygon') {
      // 对于圆形，TerraDraw 可能在属性中存储中心点和半径
      if (properties.center && properties.radius) {
        const center = { lat: properties.center[1], lng: properties.center[0] };
        return new google.maps.Circle({
          center,
          radius: properties.radius,
          map: this.map,
          fillColor: '#EA4335',
          fillOpacity: 0.2,
          strokeColor: '#EA4335',
          strokeWeight: 2,
          strokeOpacity: 0.8,
        });
      } else {
        // 如果没有中心点和半径信息，计算多边形的中心点作为圆心
        const coords = geometry.coordinates[0];
        let latSum = 0, lngSum = 0;
        coords.forEach((coord: number[]) => {
          latSum += coord[1];
          lngSum += coord[0];
        });
        const center = { lat: latSum / coords.length, lng: lngSum / coords.length };
        // 估算半径（简化处理）
        const radius = this.calculateDistance(center, { lat: coords[0][1], lng: coords[0][0] });
        
        return new google.maps.Circle({
          center,
          radius,
          map: this.map,
          fillColor: '#EA4335',
          fillOpacity: 0.2,
          strokeColor: '#EA4335',
          strokeWeight: 2,
          strokeOpacity: 0.8,
        });
      }
    }
    
    // 标准几何类型处理
    switch (geometry.type) {
      case 'Point':
        // 只渲染来自点模式的点特征
        if (properties?.mode !== 'point') {
          return null;
        }
        
        return new google.maps.Marker({
          position: {
            lat: geometry.coordinates[1],
            lng: geometry.coordinates[0]
          },
          map: this.map,
          title: properties?.title || `点 ${id}`,
          // 使用 Google Maps 默认样式
        });

      case 'LineString':
        // 只渲染来自线条模式的线条特征
        if (properties?.mode !== 'linestring') {
          return null;
        }
        
        return new google.maps.Polyline({
          path: geometry.coordinates.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          })),
          map: this.map,
          // Google Maps 默认线条样式
          strokeColor: '#4285F4',
          strokeWeight: 3,
          strokeOpacity: 0.8,
        });

      case 'Polygon':
        // 只渲染来自多边形模式的多边形特征（排除矩形和圆形）
        if (properties?.mode !== 'polygon') {
          return null;
        }
        
        const paths = geometry.coordinates.map((ring: number[][]) =>
          ring.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }))
        );
        return new google.maps.Polygon({
          paths,
          map: this.map,
          // Google Maps 默认多边形样式
          fillColor: '#4285F4',
          fillOpacity: 0.2,
          strokeColor: '#4285F4',
          strokeWeight: 2,
          strokeOpacity: 0.8,
        });

      default:
        return null;
    }
  }

  // 计算两点之间的距离（米）
  private calculateDistance(point1: {lat: number, lng: number}, point2: {lat: number, lng: number}): number {
    const R = 6371e3; // 地球半径（米）
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat-point1.lat) * Math.PI/180;
    const Δλ = (point2.lng-point1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // 更新所有图形
  updateShapes(features: any[]) {
    // 清除不存在的图形
    const currentIds = new Set(features.map(f => f.id));
    for (const [id, shape] of this.shapes) {
      if (!currentIds.has(id)) {
        this.removeShape(id);
      }
    }

    // 添加或更新图形
    features.forEach(feature => {
      if (this.shapes.has(feature.id)) {
        // 更新现有图形（删除后重新创建）
        this.removeShape(feature.id);
      }
      
      const shape = this.createGoogleMapsShape(feature);
      if (shape) {
        this.shapes.set(feature.id, shape);
      }
    });
  }

  // 移除指定图形
  private removeShape(id: string) {
    const shape = this.shapes.get(id);
    if (shape) {
      if ('setMap' in shape) {
        (shape as any).setMap(null);
      }
      this.shapes.delete(id);
    }
  }

  // 清除所有图形
  clearAll() {
    for (const [id] of this.shapes) {
      this.removeShape(id);
    }
  }

  // 销毁管理器
  destroy() {
    this.clearAll();
  }
}

type ModeId =
  | 'select'
  | 'point'
  | 'linestring'
  | 'polygon'
  | 'rectangle'
  | 'circle'
  | 'static';

export default function TerraDrawMapPage() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const shapeManagerRef = useRef<ShapeManager | null>(null);
  const [activeMode, setActiveMode] = useState<ModeId>('static');

  useEffect(() => {
    let cancelled = false;
    let projectionListener: google.maps.MapsEventListener | null = null;

    async function init() {
      if (typeof window === 'undefined') return;
      if (!mapDivRef.current) return;
      if (mapRef.current || drawRef.current) return; // 防止重复初始化

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
        return;
      }

      // 加载 Google Maps API
      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['maps'],
      });
      await loader.load();

      // 获取 Map 构造函数
      const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;

      if (cancelled || !mapDivRef.current) return;

      // 创建 Google Map 实例
      const map = new Map(mapDivRef.current, {
        center: { lat: -37.8136, lng: 144.9631 }, // 墨尔本
        zoom: 12,
        mapId: undefined,
        mapTypeId: 'roadmap',
        clickableIcons: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;

      // 等待地图投影就绪后初始化 TerraDraw
      projectionListener = map.addListener('projection_changed', () => {
        if (drawRef.current || cancelled) return;

        const adapter = new TerraDrawGoogleMapsAdapter({
          map,
          lib: google.maps,
          coordinatePrecision: 9,
        });

        // 创建图形管理器
        const shapeManager = new ShapeManager(map);
        shapeManagerRef.current = shapeManager;

        const draw = new TerraDraw({
          adapter,
          modes: [
            // 选择模式 - 用于编辑已绘制的图形
            new TerraDrawSelectMode({
              styles: {
                selectedPointColor: '#ffffff',
                selectedPointWidth: 0.01,
                selectedPointOutlineColor: '#ffffff',
                selectedPointOutlineWidth: 0,
                midPointColor: '#ffffff',
                midPointWidth: 0.01,
                midPointOutlineColor: '#ffffff',
                midPointOutlineWidth: 0,
                selectedLineStringColor: '#ffffff',
                selectedLineStringWidth: 0.01,
                selectedPolygonColor: '#ffffff',
                selectedPolygonFillOpacity: 0.001,
                selectedPolygonOutlineColor: '#ffffff',
                selectedPolygonOutlineWidth: 0.01
              }
            }),
            // 点绘制模式
            new TerraDrawPointMode({
              editable: true,
              styles: { 
                pointColor: '#ffffff',
                pointWidth: 0.01,
                pointOutlineColor: '#ffffff',
                pointOutlineWidth: 0
              },
            }),
            // 线条绘制模式
            new TerraDrawLineStringMode({
              editable: true,
              styles: { 
                lineStringColor: '#ffffff', 
                lineStringWidth: 0.01,
                closingPointColor: '#ffffff',
                closingPointWidth: 0.01,
                closingPointOutlineColor: '#ffffff',
                closingPointOutlineWidth: 0
              },
            }),
            // 多边形绘制模式
            new TerraDrawPolygonMode({
              editable: true,
              styles: { 
                fillColor: '#ffffff', 
                outlineColor: '#ffffff', 
                fillOpacity: 0.001,
                outlineWidth: 0.01,
                closingPointColor: '#ffffff',
                closingPointWidth: 0.01,
                closingPointOutlineColor: '#ffffff',
                closingPointOutlineWidth: 0
              },
            }),
            // 矩形绘制模式
            new TerraDrawRectangleMode({
              styles: { 
                fillColor: '#ffffff', 
                outlineColor: '#ffffff', 
                fillOpacity: 0.001,
                outlineWidth: 0.01
              },
            }),
            // 圆形绘制模式
            new TerraDrawCircleMode({
              styles: { 
                fillColor: '#ffffff', 
                outlineColor: '#ffffff', 
                fillOpacity: 0.001,
                outlineWidth: 0.01
              },
            }),
          ],
        });

        drawRef.current = draw;

        // 启动 TerraDraw 并设置初始模式
        draw.start();
        draw.setMode('static');
        setActiveMode('static');

        // 监听 TerraDraw 变化事件，同步到 Google Maps
        draw.on('change', () => {
          const features = draw.getSnapshot();
          shapeManager.updateShapes(features);
        });
      });
    }

    init();

    // 清理函数
    return () => {
      cancelled = true;

      // 清理图形管理器
      if (shapeManagerRef.current) {
        shapeManagerRef.current.destroy();
        shapeManagerRef.current = null;
      }

      // 清理 TerraDraw
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {}
        drawRef.current = null;
      }

      // 清理事件监听器
      if (projectionListener) {
        projectionListener.remove();
        projectionListener = null;
      }

      mapRef.current = null;
    };
  }, []);

  /** 切换绘制模式 */
  const switchMode = (mode: ModeId) => {
    if (!drawRef.current) return;
    if (mode === 'static') {
      drawRef.current.setMode('static');
    } else {
      drawRef.current.setMode(mode);
    }
    setActiveMode(mode);
  };

  /** 清空所有图形 */
  const clearAll = () => {
    drawRef.current?.clear();
    shapeManagerRef.current?.clearAll();
    switchMode('static');
  };

  /** 导出 GeoJSON 文件 */
  const exportGeoJSON = () => {
    const features = drawRef.current?.getSnapshot() ?? [];
    const fc = { type: 'FeatureCollection' as const, features };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drawing.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 8,
          borderBottom: '1px solid #eee',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {([
          { id: 'select', label: '选择' },
          { id: 'point', label: '点' },
          { id: 'linestring', label: '线' },
          { id: 'polygon', label: '多边形' },
          { id: 'rectangle', label: '矩形' },
          { id: 'circle', label: '圆' },
          { id: 'static', label: '停止绘制' },
        ] as { id: ModeId; label: string }[]).map((b) => (
          <button
            key={b.id}
            onClick={() => switchMode(b.id)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: activeMode === b.id ? '#000' : '#fff',
              color: activeMode === b.id ? '#fff' : '#333',
              cursor: 'pointer',
            }}
          >
            {b.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={exportGeoJSON}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd' }}
          >
            导出 GeoJSON
          </button>
          <button
            onClick={clearAll}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd' }}
          >
            清空
          </button>
        </div>
      </div>

      {/* 地图容器 */}
      <div 
        ref={mapDivRef} 
        style={{ 
          flex: 1, 
          minHeight: 0,
          position: 'relative'
        }} 
      />
      
    </div>
  );
}
