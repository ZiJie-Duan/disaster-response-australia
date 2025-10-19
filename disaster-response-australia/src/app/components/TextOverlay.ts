// 这是一个工厂函数，等 google.maps 加载好以后再调用
export function createTextOverlayClass(googleMaps: typeof google.maps) {
    return class SimpleTextOverlay extends googleMaps.OverlayView {
      private position: google.maps.LatLng | google.maps.LatLngLiteral;
      private text: string;
      private div: HTMLDivElement | null;
      private map: google.maps.Map;
      private zoomListener: google.maps.MapsEventListener | null = null;
      private onClick?: (id: string) => void;
      private id: string;
      private isSelected: boolean = false;
      private isInteractive: boolean = true;
  
      constructor(
        position: google.maps.LatLng | google.maps.LatLngLiteral,
        text: string,
        map: google.maps.Map,
        id: string,
        onClick?: (id: string) => void
      ) {
        super();
        this.position = position;
        this.text = text;
        this.map = map;
        this.id = id;
        this.onClick = onClick;
        this.div = null;
        this.setMap(map);
      }

      setInteractive(interactive: boolean): void {
        this.isInteractive = interactive;
        if (this.div) {
          this.div.style.pointerEvents = interactive ? "auto" : "none";
          this.div.style.cursor = interactive ? "pointer" : "default";
        }
      }

      setSelected(selected: boolean): void {
        this.isSelected = selected;
        if (this.div) {
          this.div.style.border = selected ? "2px solid #007bff" : "1px solid #333";
          this.div.style.boxShadow = selected ? "0 0 8px rgba(0, 123, 255, 0.5)" : "none";
        }
      }

      getId(): string {
        return this.id;
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
        this.div.style.pointerEvents = this.isInteractive ? "auto" : "none";
        this.div.style.cursor = this.isInteractive ? "pointer" : "default";
        this.div.style.zIndex = "10000"; // 提高 z-index 确保在最上层
        this.div.innerText = this.text;
        
        // 添加点击事件
        if (this.onClick) {
          this.div.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡到地图
            this.onClick?.(this.id);
          });
          
          // 添加鼠标悬停效果
          this.div.addEventListener('mouseenter', () => {
            if (this.isInteractive && this.div && !this.isSelected) {
              this.div.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
              this.div.style.transform = 'scale(1.05)';
              this.div.style.transition = 'all 0.2s';
            }
          });
          
          this.div.addEventListener('mouseleave', () => {
            if (this.isInteractive && this.div && !this.isSelected) {
              const zoom = this.map.getZoom() || 10;
              const opacity = Math.max(0.8, Math.min(0.1 * zoom - 0.2, 0.95));
              this.div.style.backgroundColor = `rgba(255, 255, 255, ${opacity})`;
              this.div.style.transform = 'scale(1)';
            }
          });
        }
        
        // 使用 floatPane 确保文字标注在最上层并且可以接收鼠标事件
        const panes = this.getPanes();
        if (panes?.floatPane) {
          panes.floatPane.appendChild(this.div);
        } else {
          panes?.overlayLayer.appendChild(this.div);
        }
        
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
        

        // 调整字体大小范围，确保可读性
        fontSize = Math.max(12, Math.min(zoom, 20));
        padding = "4px 8px";
        borderRadius = "4px";
        
        // 调整透明度计算，确保始终可见
        opacity = Math.max(0.8, Math.min(0.1 * zoom - 0.2, 0.95));

        // 降低最小缩放级别要求，在更多缩放级别下显示文字
        if (zoom < 8) {
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
  