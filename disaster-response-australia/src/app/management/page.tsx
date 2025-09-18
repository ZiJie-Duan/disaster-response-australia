'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './management.module.css';

type AreaStatus = 'Active Disaster' | 'Resolved' | 'Safe';

type Area = {
  id: string;
  name: string;
  status: AreaStatus;
};

type AreaDetails = {
  areaName: string;
  disasterType: string;
  affectedPopulation: number | string;
  rescuersDeployed: string;
};

type VerifiedDevice = {
  id: number;
  verified: boolean;
  note?: string;
};

type ManagementData = {
  areas: Area[];
  areaDetails: AreaDetails;
  verifiedDevices: VerifiedDevice[];
};

const EMPTY_MANAGEMENT_DATA: ManagementData = {
  areas: [],
  areaDetails: {
    areaName: "",
    disasterType: "",
    affectedPopulation: "",
    rescuersDeployed: "",
  },
  verifiedDevices: [],
};

export default function DisasterAreaManagementPage() {
  // ====== 数据占位：等后端准备好后，把 EMPTY_MANAGEMENT_DATA 换成接口返回的数据 ======
  // 例如：const [managementData, setManagementData] = useState(EMPTY_MANAGEMENT_DATA);
  //      useEffect(() => { fetch('/api/management').then(res => res.json()).then(setManagementData); }, []);
  const managementData = EMPTY_MANAGEMENT_DATA;

  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    () => managementData.areas[0]?.id ?? ""
  );

  const areas = managementData.areas;
  const areaDetails = managementData.areaDetails;
  const verifiedDevices = managementData.verifiedDevices;

  // ====== 地图容器：留空，未来接地图 SDK ======
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // TODO[map]: 在这里初始化地图，例如：
    // const map = new mapboxgl.Map({ container: mapRef.current!, ... });
    // return () => map.remove();
  }, []);

  // ====== Toolbar 动作：现在只是占位，未来接地图绘制逻辑 ======
  const handleAddPoint = () => {
    // TODO[map]: 激活“加点”模式（在地图上点击落点）
  };
  const handleAddLine = () => {
    // TODO[map]: 激活“加线”模式（ polyline ）
  };
  const handleAddArea = () => {
    // TODO[map]: 激活“加多边形”模式（ polygon ）
  };
  const handleDelete = () => {
    // TODO[map]: 删除选中的图形/要素
  };

  // ====== 切换区域：未来从后端拉该区域详情/设备列表，再 setState ======
  const selectArea = (id: string) => {
    setSelectedAreaId(id);
    // TODO[backend]: 将来在这里根据区域 id 调接口，更新区域详情与设备列表。
  };

  return (
    <div className={styles.page}>
      {/* 左侧侧边栏 */}
      <aside className={styles.sidebar}>
        <div className={styles.sideTitle}>
          <span>DISASTER AREA</span>
          <span>MANAGEMENT SYSTEM</span>
        </div>

        <button className={styles.createBtn}
          onClick={() => {
            // TODO[backend]: 打开新建弹窗，提交后调用后端创建区域
          }}
        >
          Create Disaster Area
        </button>

        <nav className={styles.areaList}>
          {areas.length === 0 ? (
            <div className={styles.emptyMessage}>暂无区域数据，请接入后端后填充。</div>
          ) : (
            areas.map(area => (
              <button
                key={area.id}
                className={`${styles.areaItem} ${area.id === selectedAreaId ? styles.areaItemActive : ''}`}
                onClick={() => selectArea(area.id)}
              >
                <div className={styles.areaName}>{area.name}</div>
                <div className={styles.areaStatus}>{area.status}</div>
              </button>
            ))
          )}
        </nav>
      </aside>

      {/* 右侧主区域 */}
      <section className={styles.main}>
        {/* 顶部工具栏 + 用户区 */}
        <div className={styles.topbar}>
          <div className={styles.toolbar}>
            <ToolbarButton label="Add Point" onClick={handleAddPoint}>
              <PinIcon />
            </ToolbarButton>
            <ToolbarButton label="Add Line" onClick={handleAddLine}>
              <SlashIcon />
            </ToolbarButton>
            <ToolbarButton label="Add Area" onClick={handleAddArea}>
              <PlusIcon />
            </ToolbarButton>
            <ToolbarButton label="Delete" onClick={handleDelete}>
              <TrashIcon />
            </ToolbarButton>
          </div>

          <div className={styles.userCluster}>
            <button className={styles.bell}>
              <BellIcon />
            </button>
            <div className={styles.userName}>Admin</div>
          </div>
        </div>

        {/* 地图卡片（空容器） */}
        <div className={styles.mapCard}>
          <div ref={mapRef} id="map-container" className={styles.mapSurface} />

          {/* 中间的“Verified Device”提示气泡（仅 UI 占位） */}
          {/* TODO[map]: 未来改成地图上的 Marker/Popup，根据设备坐标定位 */}
          {verifiedDevices[0] && (
            <div className={styles.deviceBubble} role="dialog" aria-label="Verified Device">
              <div className={styles.deviceBubbleTitle}>Verified Device</div>
              <div className={styles.deviceBubbleLine}>ID {verifiedDevices[0].id}</div>
              {verifiedDevices[0].note && (
                <div className={styles.deviceBubbleLine}>{verifiedDevices[0].note}</div>
              )}
            </div>
          )}

          {/* 右下角：白色圆角面板（设备列表 + 图例） */}
          <div className={styles.dockPanel}>
          <div className={styles.dockTitle}>Verified Devices</div>
          <ul className={styles.deviceList}>
            {verifiedDevices.length === 0 ? (
              <li className={styles.emptyListItem}>暂无验证设备，接入后端后在此展示。</li>
            ) : (
              verifiedDevices.map(d => (
                <li key={d.id} className={styles.deviceItem}>
                  <span>Device ID {d.id}</span>
                  {d.verified && <span className={styles.tick}>✓</span>}
                </li>
              ))
            )}
          </ul>

            <div className={styles.legend}>
              <LegendSwatch color="#ff3b30" label="Disaster" />
              <LegendSwatch color="#34c759" label="Safe" />
            </div>
          </div>
        </div>

        {/* 底部“Area Details”信息条 */}
        <div className={styles.detailBar}>
          <div className={styles.detailTitle}>AREA DETAILS</div>
          <div className={styles.detailGrid}>
            <DetailItem label="Area Name" value={formatDetailValue(areaDetails.areaName)} />
            <DetailItem label="Disaster type" value={formatDetailValue(areaDetails.disasterType)} />
            <DetailItem label="Affected population" value={formatDetailValue(areaDetails.affectedPopulation)} />
            <DetailItem label="Rescuers deployed" value={formatDetailValue(areaDetails.rescuersDeployed)} />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============ 小组件 ============ */

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={styles.toolbarBtn} onClick={onClick}>
      <span className={styles.toolbarIcon}>{children}</span>
      <span>{label}</span>
    </button>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{value}</div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className={styles.legendRow}>
      <span className={styles.legendDot} style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

/* ============ 简单内联图标（避免装依赖） ============ */

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 22s7-7.11 7-12a7 7 0 10-14 0c0 4.89 7 12 7 12z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="2.5" fill="currentColor" />
    </svg>
  );
}
function SlashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20L20 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M9 7V5h6v2m-8 0l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3a6 6 0 00-6 6v3.5L4.5 14A1 1 0 005 16h14a1 1 0 00.5-1.87L18 12.5V9a6 6 0 00-6-6z" fill="currentColor"/>
      <path d="M9.5 18a2.5 2.5 0 005 0h-5z" fill="currentColor"/>
    </svg>
  );
}

function formatDetailValue(value: string | number | undefined | null): string | number {
  return value === undefined || value === null || value === "" ? "—" : value;
}
