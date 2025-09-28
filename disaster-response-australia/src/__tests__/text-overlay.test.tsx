import { createTextOverlayClass } from '@/app/components/TextOverlay';

describe('createTextOverlayClass', () => {
  const overlayLayer = { appendChild: jest.fn() };
  const panes = { overlayLayer };

  class OverlayViewBase {
    public map: any;
    setMap(map: any) {
      this.map = map;
    }
    getPanes() {
      return panes;
    }
    getProjection() {
      return {
        fromLatLngToDivPixel: () => ({ x: 10, y: 20 }),
      };
    }
  }

  it('creates overlay that reacts to zoom changes', () => {
    const removeListener = jest.fn();
    const zoomCallbacks: Array<() => void> = [];
    const map = {
      getZoom: jest.fn(() => 13),
      addListener: jest.fn((_event: string, cb: () => void) => {
        zoomCallbacks.push(cb);
        return { remove: removeListener } as unknown as google.maps.MapsEventListener;
      }),
    } as unknown as google.maps.Map;

    const googleMock = {
      OverlayView: OverlayViewBase,
      LatLng: class {
        constructor(public value: any) {
          this.value = value;
        }
      },
      event: {
        removeListener,
      },
    } as unknown as typeof google.maps;

    const Overlay = createTextOverlayClass(googleMock);
    const overlay = new Overlay({ lat: 0, lng: 0 }, 'Label', map);

    overlay.onAdd();
    expect(overlayLayer.appendChild).toHaveBeenCalled();

    zoomCallbacks.forEach((cb) => cb());

    overlay.draw();

    // Zoomed in so element is visible
    expect((overlay as any).div?.style.display).toBe('block');

    // Simulate zoomed out view
    map.getZoom = jest.fn(() => 10) as any;
    zoomCallbacks.forEach((cb) => cb());
    expect((overlay as any).div?.style.display).toBe('none');

    overlay.onRemove();
    expect(removeListener).toHaveBeenCalled();
  });
});
