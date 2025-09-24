/**
 * Minimal Google Maps geometry models for Next.js usage
 * Icons (IconSequence) intentionally omitted per request.
 */

// ---- Primitives ----
export type LatLng = {
    /** Latitude in decimal degrees (-90..90) */
    lat: number;
    /** Longitude in decimal degrees (-180..180] */
    lng: number;
  };
  
  export type Bounds = {
    /** Northern latitude; must be > south */
    north: number;
    /** Southern latitude */
    south: number;
    /** Eastern longitude */
    east: number;
    /** Western longitude */
    west: number;
  };
  
  // ---- Styles ----
  export type StrokeStyle = {
    /** CSS color string, e.g., "#4285F4" or "rgba(66,133,244,1)" */
    strokeColor?: string;
    /** 0..1 */
    strokeOpacity?: number;
    /** Pixels */
    strokeWeight?: number;
  };
  
  export type FillStyle = {
    /** CSS color string */
    fillColor?: string;
    /** 0..1 */
    fillOpacity?: number;
  };
  
  // ---- Point ----
  export interface PointModel {
    /** Geographic position */
    position: LatLng;
    /** Accessible/tooltip text */
    title?: string;
    /** Marker visual content description (HTML / markdown / component id), interpreted by renderer */
    content?: string;
  }
  
  // ---- Polyline (stroke-only) ----
  export interface PolylineModel {
    /** Ordered path of vertices */
    path: LatLng[];
    /** Stroke-only styling */
    style?: StrokeStyle;
  }
  
  // ---- Polygon (fill + stroke) ----
  export interface PolygonModel {
    /** Multiple rings: [outer, ...holes]; each ring is an array of LatLng */
    paths: LatLng[][];
    /** Fill + stroke styling */
    style?: StrokeStyle & FillStyle;
  }
  
  // ---- Rectangle (fill + stroke) ----
  export interface RectangleModel {
    /** LatLng bounds; expect north > south */
    bounds: Bounds;
    /** Fill + stroke styling */
    style?: StrokeStyle & FillStyle;
  }
  
  // ---- Circle (fill + stroke) ----
  export interface CircleModel {
    /** Center position */
    center: LatLng;
    /** Radius in meters */
    radius: number;
    /** Fill + stroke styling */
    style?: StrokeStyle & FillStyle;
  }
  
  // ---- Shape enum ----
  export enum ShapeType {
    Point = "point",
    Polyline = "polyline",
    Polygon = "polygon",
    Rectangle = "rectangle",
    Circle = "circle",
  }
  
  // ---- Optional: discriminated union for convenience ----
  export type ShapeModel =
    | { type: ShapeType.Point; data: PointModel }
    | { type: ShapeType.Polyline; data: PolylineModel }
    | { type: ShapeType.Polygon; data: PolygonModel }
    | { type: ShapeType.Rectangle; data: RectangleModel }
    | { type: ShapeType.Circle; data: CircleModel };
  



    