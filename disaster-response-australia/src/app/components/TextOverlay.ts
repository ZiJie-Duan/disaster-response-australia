// 这是一个工厂函数，等 google.maps 加载好以后再调用
export function createTextOverlayClass(googleMaps: typeof google.maps) {
    return class SimpleTextOverlay extends googleMaps.OverlayView {
      private position: google.maps.LatLng | google.maps.LatLngLiteral;
      private text: string;
      private div: HTMLDivElement | null;
      private map: google.maps.Map;
      private zoomListener: google.maps.MapsEventListener | null = null;
  
      constructor(
        position: google.maps.LatLng | google.maps.LatLngLiteral,
        text: string,
        map: google.maps.Map
      ) {
        super();
        this.position = position;
        this.text = text;
        this.map = map;
        this.div = null;
        this.setMap(map);
      }
  
      onAdd(): void {
        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.padding = "4px 8px";
        this.div.style.background = "rgba(255, 255, 255, 0.9)";
        this.div.style.border = "1px solid #333";
        this.div.style.borderRadius = "4px";
        this.div.style.fontWeight = "bold";
        this.div.style.color = "#333";
        this.div.style.fontFamily = "Arial, sans-serif";
        this.div.style.whiteSpace = "nowrap";
        this.div.style.pointerEvents = "none";
        this.div.style.zIndex = "1000";
        this.div.innerText = this.text;
        this.getPanes()?.overlayLayer.appendChild(this.div);
        
        // 添加缩放监听器
        this.zoomListener = this.map.addListener('zoom_changed', () => {
          this.updateStyleBasedOnZoom();
        });
        
        // 初始设置样式
        this.updateStyleBasedOnZoom();
      }
  
      // 根据缩放级别更新样式
      private updateStyleBasedOnZoom(): void {
        if (!this.div) return;
        
        const zoom = this.map.getZoom() || 10;
        
        // 根据缩放级别调整字体大小
        let fontSize: number;
        let padding: string;
        let borderRadius: string;
        let opacity: number;
        

        fontSize = zoom;
        padding = "4px 8px";
        borderRadius = "4px";
        opacity = 0.1 * zoom - 0.3;

        if (zoom <= 12) {
          this.div.style.display = "none";
        } else {
          this.div.style.display = "block";
        }
        
        this.div.style.fontSize = `${fontSize}px`;
        this.div.style.padding = padding;
        this.div.style.borderRadius = borderRadius;
        this.div.style.background = `rgba(255, 255, 255, ${opacity})`;
      }

      draw(): void {
        const projection = this.getProjection();
        const pos = projection?.fromLatLngToDivPixel(
          this.position instanceof googleMaps.LatLng
            ? this.position
            : new googleMaps.LatLng(this.position)
        );
  
        if (this.div && pos && this.div.style.display === "block") {
          this.div.style.left = `${pos.x}px`;
          this.div.style.top = `${pos.y}px`;
        }
      }
  
      onRemove(): void {
        // 清理缩放监听器
        if (this.zoomListener) {
          googleMaps.event.removeListener(this.zoomListener);
          this.zoomListener = null;
        }
        
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }
    };
  }
  