/* 资源中心 - 任务管理（React 18 + Ant Design 5） */
const { useState, useMemo, useCallback, useEffect, useRef } = React;
const {
  ConfigProvider, App: AntApp, Layout, Menu, Table, Tag, Space, Button,
  Card, Row, Col, Statistic, Select, Steps, Image, Badge, Modal, message,
  Descriptions, Tabs, Upload, Divider, Typography, Empty, Tooltip, Input, Alert,
  Radio, Avatar, Pagination, Breadcrumb, Segmented
} = antd;
const { TextArea } = Input;
const Icons = icons;
const {
  FileTextOutlined, RadarChartOutlined, TeamOutlined, SettingOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  SyncOutlined, ExportOutlined, EyeOutlined, StopOutlined,
  CloudUploadOutlined, CloudDownloadOutlined, DeleteOutlined,
  PlusOutlined, EnvironmentOutlined, UserOutlined, ApartmentOutlined,
  ExclamationCircleOutlined, ArrowLeftOutlined, MinusCircleOutlined,
  GlobalOutlined, MenuFoldOutlined, PictureOutlined, InfoCircleFilled,
  FileZipOutlined, PaperClipOutlined, UploadOutlined, LoadingOutlined
} = Icons;

/** 高德卫星瓦片（免 Key 演示） */
const GAODE_SATELLITE_URL =
  'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}';
const GAODE_ROADNET_URL =
  'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}';

function getAmapConfig() {
  return window.AMAP_CONFIG || { key: '', securityJsCode: '' };
}

let amapScriptPromise = null;

function loadAmapScript() {
  const { key, securityJsCode } = getAmapConfig();
  if (!key) return Promise.reject(new Error('NO_AMAP_KEY'));

  if (window.AMap) return Promise.resolve(window.AMap);

  if (!amapScriptPromise) {
    amapScriptPromise = new Promise((resolve, reject) => {
      window._AMapSecurityConfig = { securityJsCode: securityJsCode || '' };
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`;
      script.async = true;
      script.onload = () => (window.AMap ? resolve(window.AMap) : reject(new Error('高德地图未就绪')));
      script.onerror = () => reject(new Error('高德地图脚本加载失败'));
      document.head.appendChild(script);
    });
  }

  return amapScriptPromise;
}

function buildAoiPaths(lngNum, latNum) {
  const dLat = 0.012;
  const dLng = 0.018;
  return {
    gold: [
      [lngNum - dLng, latNum + dLat],
      [lngNum + dLng * 0.85, latNum + dLat * 0.55],
      [lngNum + dLng * 0.45, latNum - dLat * 0.25],
      [lngNum - dLng * 0.75, latNum + dLat * 0.15]
    ],
    blue: [
      [lngNum - dLng * 0.85, latNum + dLat * 0.75],
      [lngNum + dLng * 0.55, latNum + dLat * 0.35],
      [lngNum + dLng * 0.15, latNum - dLat * 0.45],
      [lngNum - dLng * 0.95, latNum + dLat * 0.05]
    ]
  };
}

function createLeafletPinIcon() {
  if (!window.L) return undefined;
  return window.L.divIcon({
    className: 'result-map-pin-icon',
    html: '<span class="result-map-pin"></span>',
    iconSize: [14, 18],
    iconAnchor: [7, 18]
  });
}

function initGaodeLeafletMap(container, lngNum, latNum) {
  const map = window.L.map(container, {
    center: [latNum, lngNum],
    zoom: 13,
    zoomControl: false,
    attributionControl: true
  });

  window.L.tileLayer(GAODE_SATELLITE_URL, {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 18,
    attribution: '© 高德地图'
  }).addTo(map);

  window.L.tileLayer(GAODE_ROADNET_URL, {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 18,
    opacity: 0.65
  }).addTo(map);

  window.L.marker([latNum, lngNum], { icon: createLeafletPinIcon() }).addTo(map);

  const aoi = buildAoiPaths(lngNum, latNum);
  window.L.polygon(
    aoi.gold.map(([lng, lat]) => [lat, lng]),
    { color: '#ffe58f', fillColor: '#faad14', fillOpacity: 0.35, weight: 1.5 }
  ).addTo(map);
  window.L.polygon(
    aoi.blue.map(([lng, lat]) => [lat, lng]),
    { color: '#91caff', fillColor: '#1677ff', fillOpacity: 0.28, weight: 1.5 }
  ).addTo(map);

  window.setTimeout(() => map.invalidateSize(), 120);
  return map;
}

function initGaodeAmapMap(container, lngNum, latNum) {
  return loadAmapScript().then((AMap) => {
    const map = new AMap.Map(container, {
      zoom: 13,
      center: [lngNum, latNum],
      viewMode: '2D',
      layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet({ opacity: 0.55 })],
      zooms: [3, 18]
    });

    new AMap.Marker({
      map,
      position: [lngNum, latNum],
      content: '<span class="result-map-pin"></span>',
      offset: new AMap.Pixel(-7, -18),
      anchor: 'bottom-center'
    });

    const aoi = buildAoiPaths(lngNum, latNum);
    new AMap.Polygon({
      map,
      path: aoi.gold,
      fillColor: '#faad14',
      fillOpacity: 0.35,
      strokeColor: '#ffe58f',
      strokeWeight: 1.5
    });
    new AMap.Polygon({
      map,
      path: aoi.blue,
      fillColor: '#1677ff',
      fillOpacity: 0.28,
      strokeColor: '#91caff',
      strokeWeight: 1.5
    });

    window.setTimeout(() => map.resize && map.resize(), 120);
    return map;
  });
}

function ResultMapPreview({ lng, lat }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const modeRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const lngNum = parseFloat(lng);
    const latNum = parseFloat(lat);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const cleanup = () => {
      if (!mapRef.current) return;
      if (modeRef.current === 'amap' && mapRef.current.destroy) {
        mapRef.current.destroy();
      } else if (modeRef.current === 'leaflet' && mapRef.current.remove) {
        mapRef.current.remove();
      }
      mapRef.current = null;
      modeRef.current = null;
    };

    cleanup();

    const useOfficialAmap = !!getAmapConfig().key;
    const initPromise = useOfficialAmap
      ? initGaodeAmapMap(container, lngNum, latNum).then((map) => ({ map, mode: 'amap' }))
      : window.L
        ? Promise.resolve({ map: initGaodeLeafletMap(container, lngNum, latNum), mode: 'leaflet' })
        : Promise.reject(new Error('地图组件加载失败'));

    initPromise
      .then(({ map, mode }) => {
        if (cancelled) {
          if (mode === 'amap' && map.destroy) map.destroy();
          if (mode === 'leaflet' && map.remove) map.remove();
          return;
        }
        mapRef.current = map;
        modeRef.current = mode;
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [lng, lat]);

  return React.createElement(
    React.Fragment,
    null,
    loading &&
      React.createElement(
        'div',
        { className: 'map-load-placeholder' },
        '高德地图加载中…'
      ),
    React.createElement('div', {
      ref: containerRef,
      className: getAmapConfig().key ? 'map-amap-container' : 'map-leaflet-container'
    })
  );
}

// ——— 状态机 ———
const STATUS = {
  NOT_ACCEPTED: '10',
  ACCEPTED: '20',
  REJECTED: '40',
  FAILED: '50',
  COMPLETED: '60',
  CANCELLED: '90'
};

const STATUS_LABEL = {
  [STATUS.NOT_ACCEPTED]: '未受理',
  [STATUS.ACCEPTED]: '已受理',
  [STATUS.REJECTED]: '拒绝',
  [STATUS.FAILED]: '失败',
  [STATUS.COMPLETED]: '完成',
  [STATUS.CANCELLED]: '取消'
};

const TERMINAL = new Set([STATUS.REJECTED, STATUS.FAILED, STATUS.COMPLETED, STATUS.CANCELLED]);

const STATUS_TAG_COLOR = {
  [STATUS.NOT_ACCEPTED]: 'warning',
  [STATUS.ACCEPTED]: 'processing',
  [STATUS.REJECTED]: 'error',
  [STATUS.FAILED]: 'magenta',
  [STATUS.COMPLETED]: 'success',
  [STATUS.CANCELLED]: 'default'
};

/** 合法流转：from -> [{ to, role, label }] */
const TRANSITIONS = {
  [STATUS.NOT_ACCEPTED]: [
    { to: STATUS.ACCEPTED, role: 'supplier', label: '受理', type: 'primary' },
    { to: STATUS.REJECTED, role: 'supplier', label: '拒绝', danger: true },
    { to: STATUS.CANCELLED, role: 'demander', label: '取消', danger: true }
  ],
  [STATUS.ACCEPTED]: [
    { to: STATUS.COMPLETED, role: 'supplier', label: '上传成果', type: 'primary', needUpload: true },
    { to: STATUS.FAILED, role: 'supplier', label: '失败', danger: true }
  ]
};

function canTransition(from, to, role) {
  const list = TRANSITIONS[from] || [];
  return list.some((t) => t.to === to && t.role === role);
}

function getActions(status, role) {
  return (TRANSITIONS[status] || []).filter((t) => t.role === role);
}

// ——— Mock 数据 ———
const ORGS = ['A需求公司', 'B需求公司', '需求方总局', '国家资源部'];
const SUPPLIERS = ['A公司', 'B公司', 'C公司'];
const CURRENT_USER = { name: '张三', org: 'A需求公司', supplierName: 'A公司' };

const STATUS_TAG_CONFIG = {
  [STATUS.NOT_ACCEPTED]: { color: 'magenta', icon: ExclamationCircleOutlined, text: '未受理' },
  [STATUS.ACCEPTED]: { color: 'warning', icon: SyncOutlined, text: '已受理', spin: true },
  [STATUS.REJECTED]: { color: 'volcano', icon: StopOutlined, text: '拒绝' },
  [STATUS.FAILED]: { color: 'error', icon: CloseCircleOutlined, text: '失败' },
  [STATUS.COMPLETED]: { color: 'success', icon: CheckCircleOutlined, text: '完成' },
  [STATUS.CANCELLED]: { color: 'default', icon: MinusCircleOutlined, text: '取消' }
};

const APPROVAL_STEP_KEYS = ['accept', 'upload', 'complete'];

function formatReqName(taskId) {
  const n = parseInt(taskId, 10);
  const demandNo = Math.ceil(n / 2);
  const seqNo = String(((n - 1) % 2) + 1).padStart(2, '0');
  return `需求${demandNo}_${seqNo}`;
}

const SHOOT_AREAS = ['128.6 km²', '256.3 km²', '89.2 km²', '312.5 km²', '175.8 km²', '64.0 km²'];
const SHOOT_DURATIONS = ['', '12秒', '10秒', '15秒', '8秒', ''];

function buildInitialTasks() {
  /** 六种状态各一条，同时归属 A需求公司 + A公司，两种视角均可看到全量状态 */
  const rows = [
    { id: '01', status: STATUS.NOT_ACCEPTED, createTime: '2026-04-01 12:11:20', expectDelivery: '2026-04-09', preShootTime: '', actualFinishTime: '', reqId: '001', creator: '张三', creatorAvatar: '张三' },
    { id: '02', status: STATUS.ACCEPTED, createTime: '2026-04-02 12:11:20', expectDelivery: '2026-04-09', preShootTime: '2026-04-09 08:00:00', actualFinishTime: '', reqId: '002', creator: '刘杨', creatorAvatar: '刘杨' },
    { id: '03', status: STATUS.REJECTED, createTime: '2026-04-03 12:11:20', expectDelivery: '2026-04-09', preShootTime: '2026-04-09 08:00:00', actualFinishTime: '2026-04-10 09:00:00', reqId: '003', creator: '李四', creatorAvatar: '李四' },
    { id: '04', status: STATUS.FAILED, createTime: '2026-04-04 12:11:20', expectDelivery: '2026-04-09', preShootTime: '2026-04-09 08:00:00', actualFinishTime: '2026-04-10 09:15:00', reqId: '004', creator: '王五', creatorAvatar: '王五' },
    { id: '05', status: STATUS.COMPLETED, createTime: '2026-04-05 12:11:20', expectDelivery: '2026-04-09', preShootTime: '2026-04-09 08:00:00', actualFinishTime: '2026-04-09 18:30:00', reqId: '005', creator: '刘杨', creatorAvatar: '刘杨' },
    { id: '06', status: STATUS.CANCELLED, createTime: '2026-04-06 12:11:20', expectDelivery: '2026-04-09', preShootTime: '', actualFinishTime: '2026-04-08 10:00:00', reqId: '006', creator: '孙七', creatorAvatar: '孙七' }
  ];
  return rows.map((r) => {
    const reqName = formatReqName(r.id);
    return {
    key: r.id,
    ...r,
    reqName,
    initiatorOrg: CURRENT_USER.org,
    shootCompany: CURRENT_USER.supplierName,
    lng: (121.33 + parseInt(r.id, 10) * 0.01).toFixed(5),
    lat: (41.45 + parseInt(r.id, 10) * 0.008).toFixed(7),
    remark: '-',
    rollAngle: '≦35°',
    cloudCover: '≦70%',
    dataType: '高分',
    resolution: '≦2米',
    shootArea: SHOOT_AREAS[parseInt(r.id, 10) - 1] || '—',
    attachmentFile: {
      name: `${reqName}-影像结果-拍摄日期`,
      ext: '.zip',
      format: 'tiff',
      size: '3.6GB'
    },
    productLevel: 'L2',
    satellite: '东方慧眼01星',
    shootDuration: SHOOT_DURATIONS[parseInt(r.id, 10) - 1] || '',
    acceptTime:
      r.status === STATUS.NOT_ACCEPTED || r.status === STATUS.CANCELLED
        ? ''
        : `${r.createTime.split(' ')[0]} 15:12:40`,
    uploadTime:
      r.status === STATUS.COMPLETED || r.status === STATUS.FAILED ? r.actualFinishTime : '',
    resultUploaded: r.status === STATUS.COMPLETED,
    images: r.status === STATUS.COMPLETED ? [{ uid: '1', name: '成果影像.jpg', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200' }] : [],
    approvalComments: normalizeApprovalComments(
      r.status === STATUS.COMPLETED
        ? { accept: '符合拍摄条件，同意受理', upload: '影像成果已上传', complete: '自动质检通过，准予交付' }
        : r.status === STATUS.REJECTED
          ? { accept: '档期冲突，无法接受该任务', upload: '', complete: '' }
          : r.status === STATUS.FAILED
            ? { accept: '已受理并排期', upload: '过境云量超标，成像质量不达标', complete: '' }
            : null
    )
  };
  });
}

function emptyApprovalComments() {
  return { accept: '', upload: '', complete: '' };
}

function normalizeApprovalComments(raw) {
  const base = emptyApprovalComments();
  if (!raw) return base;
  APPROVAL_STEP_KEYS.forEach((k) => {
    base[k] = typeof raw[k] === 'string' ? raw[k] : '';
  });
  return base;
}

// ——— 工具 ———
function renderStatusTag(status) {
  const code = status.length <= 2 ? status : status.split('_')[0];
  const cfg = STATUS_TAG_CONFIG[code] || STATUS_TAG_CONFIG[STATUS.NOT_ACCEPTED];
  const IconComp = cfg.icon;
  return React.createElement(
    Tag,
    {
      color: cfg.color,
      icon: React.createElement(IconComp, cfg.spin ? { spin: true } : {})
    },
    cfg.text
  );
}

function computeStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === STATUS.COMPLETED).length;
  const rejected = tasks.filter((t) => t.status === STATUS.REJECTED).length;
  const failed = tasks.filter((t) => t.status === STATUS.FAILED).length;
  const inProgress = tasks.filter((t) => t.status === STATUS.ACCEPTED).length;
  const uncompleted = tasks.filter((t) => !TERMINAL.has(t.status) || t.status === STATUS.FAILED || t.status === STATUS.REJECTED
    ? t.status !== STATUS.COMPLETED
    : false).length;
  const notDone = tasks.filter((t) => t.status !== STATUS.COMPLETED).length;
  return { total, completed, uncompleted: notDone, inProgress, rejected, failed };
}

function isSupplierTask(task) {
  return task.shootCompany === CURRENT_USER.supplierName;
}

function isPendingForMe(task, role) {
  if (role === 'demander') return task.status === STATUS.NOT_ACCEPTED && task.creator === CURRENT_USER.name;
  if (!isSupplierTask(task)) return false;
  return task.status === STATUS.NOT_ACCEPTED || task.status === STATUS.ACCEPTED;
}

/** 按视角限定数据范围 */
function getScopedTasks(tasks, role) {
  if (role === 'supplier') return tasks.filter(isSupplierTask);
  return tasks.filter((t) => t.initiatorOrg === CURRENT_USER.org);
}

function getApprovalSteps(task) {
  const created = { key: 'create', title: '任务创建', time: task.createTime, state: 'finish' };

  let acceptState = 'wait';
  if (task.status === STATUS.NOT_ACCEPTED) acceptState = 'process';
  else if (task.status === STATUS.REJECTED) acceptState = 'error';
  else if (task.status === STATUS.CANCELLED) acceptState = 'wait';
  else acceptState = 'finish';

  let uploadState = 'wait';
  if (task.status === STATUS.ACCEPTED) uploadState = 'process';
  if (task.status === STATUS.COMPLETED) uploadState = 'finish';
  if (task.status === STATUS.FAILED) uploadState = 'error';

  let completeState = 'wait';
  if (task.status === STATUS.COMPLETED) completeState = 'finish';

  const acceptTime =
    task.status === STATUS.NOT_ACCEPTED
      ? '—'
      : task.status === STATUS.REJECTED
        ? '已拒绝'
        : task.acceptTime || '—';

  const uploadTime =
    task.status === STATUS.COMPLETED || task.status === STATUS.FAILED
      ? task.uploadTime || task.actualFinishTime || '—'
      : '—';

  return [
    created,
    { key: 'accept', title: '任务受理', time: acceptTime, state: acceptState },
    { key: 'upload', title: '结果上传', time: uploadTime, state: uploadState },
    { key: 'complete', title: '任务完成', time: task.actualFinishTime || '—', state: completeState }
  ];
}

/** 供应商可填写当前进行中环节的审批意见 */
function canSupplierEditApprovalStep(stepKey, status) {
  if (TERMINAL.has(status)) return false;
  if (status === STATUS.NOT_ACCEPTED && stepKey === 'accept') return true;
  if (status === STATUS.ACCEPTED && stepKey === 'upload') return true;
  return false;
}

function getCommentKeysForAction(toStatus) {
  if (toStatus === STATUS.ACCEPTED || toStatus === STATUS.REJECTED) return ['accept'];
  if (toStatus === STATUS.COMPLETED) return ['upload'];
  if (toStatus === STATUS.FAILED) return ['upload'];
  return [];
}

function getFinishedCommentDisplay(stepKey, value) {
  const text = (value || '').trim();
  if (text) return text;
  if (stepKey === 'accept') return '确认受理';
  if (stepKey === 'upload') return '确认上传';
  return '';
}

function hasResultAttachment(task, uploadList) {
  return uploadList.length > 0 || !!task.resultUploaded;
}

function getDemanderAttachmentEmptyHint(status) {
  if (status === STATUS.NOT_ACCEPTED || status === STATUS.ACCEPTED) {
    return '运营商上传完成后可下载';
  }
  if (status === STATUS.REJECTED || status === STATUS.FAILED || status === STATUS.CANCELLED) {
    return '该任务未产生可交付成果';
  }
  if (status === STATUS.COMPLETED) {
    return '成果处理中，请稍后查看';
  }
  return '任务完成后可在此下载影像数据';
}

function getDemanderDownloadTooltip(status, canDownload) {
  if (canDownload) return '';
  if (status === STATUS.NOT_ACCEPTED || status === STATUS.ACCEPTED) {
    return '运营商尚未上传影像成果';
  }
  if (status === STATUS.REJECTED || status === STATUS.FAILED || status === STATUS.CANCELLED) {
    return '该任务无可用影像成果';
  }
  if (status === STATUS.COMPLETED) {
    return '成果处理中，暂不可下载';
  }
  return '影像成果尚未交付，暂不可下载';
}

// ——— 统计看板 ———
const STAT_ITEMS = [
  { key: 'all', title: '任务总数', iconClass: 'blue', icon: FileTextOutlined },
  { key: 'completed', title: '完成', iconClass: 'green', icon: CheckCircleOutlined },
  { key: 'uncompleted', title: '未完成', iconClass: 'pink', icon: CloseCircleOutlined },
  { key: 'inProgress', title: '执行中', iconClass: 'orange', icon: SyncOutlined },
  { key: 'rejected', title: '拒绝', iconClass: 'volcano', icon: StopOutlined },
  { key: 'failed', title: '失败', iconClass: 'red', icon: CloseCircleOutlined }
];

function StatsBoard({ stats, activeKey, onChange }) {
  const values = {
    all: stats.total,
    completed: stats.completed,
    uncompleted: stats.uncompleted,
    inProgress: stats.inProgress,
    rejected: stats.rejected,
    failed: stats.failed
  };
  return React.createElement(
    'div',
    { className: 'stats-board' },
    STAT_ITEMS.map((item) =>
      React.createElement(
        'div',
        {
          key: item.key,
          className: `stat-item${activeKey === item.key ? ' active' : ''}`,
          onClick: () => onChange(item.key)
        },
        React.createElement(
          'div',
          { className: 'stat-item-label' },
          React.createElement(
            'span',
            { className: `stat-icon-wrap ${item.iconClass}` },
            React.createElement(item.icon)
          ),
          item.title
        ),
        React.createElement('div', { className: 'stat-item-value' }, values[item.key])
      )
    )
  );
}

// ——— 布局 ———
function AppLayout({ children, selectedMenu, detailTaskId, onBackToList, role, onRoleChange }) {
  const menuItems = [
    {
      key: 'overview',
      icon: React.createElement(GlobalOutlined),
      label: '资源总览'
    },
    {
      key: 'observe',
      icon: React.createElement(PictureOutlined),
      label: '观测需求',
      children: [
        { key: 'req-mgmt', label: '需求管理' },
        { key: 'tasks', label: '任务管理' }
      ]
    },
    {
      key: 'satellite',
      icon: React.createElement(ApartmentOutlined),
      label: '卫星资源'
    },
    {
      key: 'ops',
      icon: React.createElement(TeamOutlined),
      label: '运维中心'
    }
  ];

  return React.createElement(
    Layout,
    { style: { minHeight: '100vh' } },
    React.createElement(
      Layout.Sider,
      { width: 218, className: 'app-sider', theme: 'dark' },
      React.createElement(
        'div',
        { className: 'sider-logo' },
        React.createElement('div', { className: 'sider-logo-icon' }, '空'),
        React.createElement('span', { className: 'sider-logo-text' }, '空天信息资源中心')
      ),
      React.createElement(Menu, {
        mode: 'inline',
        theme: 'dark',
        defaultOpenKeys: ['observe'],
        selectedKeys: [selectedMenu || 'tasks'],
        style: { borderRight: 0, flex: 1 },
        items: menuItems
      }),
      React.createElement(
        'div',
        { className: 'sider-collapse-btn' },
        React.createElement(MenuFoldOutlined)
      )
    ),
    React.createElement(
      Layout,
      null,
      React.createElement(
        'div',
        { className: 'global-header' },
        React.createElement(
          'div',
          { className: 'global-header-actions' },
          React.createElement(
            Segmented,
            {
              className: 'header-role-switch',
              value: role,
              onChange: onRoleChange,
              options: [
                { label: '需求方', value: 'demander' },
                { label: '运营商', value: 'supplier' }
              ]
            }
          ),
          React.createElement(
            Space,
            { size: 12, className: 'global-header-user' },
            React.createElement(Avatar, { size: 32 }, 'A'),
            React.createElement('span', { style: { fontSize: 14 } }, 'admin')
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'page-tabs' },
        detailTaskId
          ? React.createElement(
              'div',
              { className: 'detail-breadcrumb-bar' },
              React.createElement(ArrowLeftOutlined, {
                className: 'detail-back-icon',
                onClick: onBackToList
              }),
              React.createElement(Breadcrumb, {
                items: [
                  {
                    title: React.createElement(
                      'a',
                      {
                        onClick: (e) => {
                          e.preventDefault();
                          onBackToList();
                        }
                      },
                      '任务管理'
                    )
                  },
                  { title: `任务详情-${detailTaskId}` }
                ]
              })
            )
          : React.createElement(Tabs, {
              size: 'small',
              activeKey: 'tasks',
              items: [{ key: 'tasks', label: '任务管理' }]
            })
      ),
      React.createElement(Layout.Content, { className: 'page-content' }, children)
    )
  );
}

// ——— 列表页 ———
function TaskList({ tasks, setTasks, role, onView }) {
  const { modal, message: msg } = AntApp.useApp();
  const isSupplierRole = role === 'supplier';
  const [initiatorFilter, setInitiatorFilter] = useState([]);
  const [supplierFilter, setSupplierFilter] = useState([]);
  const [statFilter, setStatFilter] = useState('all');
  const [listFilter, setListFilter] = useState('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState(['01']);

  const scopedTasks = useMemo(() => getScopedTasks(tasks, role), [tasks, role]);
  const stats = useMemo(() => computeStats(scopedTasks), [scopedTasks]);

  const filtered = useMemo(() => {
    let list = [...scopedTasks];
    if (isSupplierRole && initiatorFilter.length) {
      list = list.filter((t) => initiatorFilter.includes(t.initiatorOrg));
    }
    if (!isSupplierRole && supplierFilter.length) {
      list = list.filter((t) => supplierFilter.includes(t.shootCompany));
    }
    if (isSupplierRole && listFilter === 'pending') list = list.filter((t) => isPendingForMe(t, role));
    if (statFilter === 'completed') list = list.filter((t) => t.status === STATUS.COMPLETED);
    else if (statFilter === 'uncompleted') list = list.filter((t) => t.status !== STATUS.COMPLETED);
    else if (statFilter === 'inProgress') list = list.filter((t) => t.status === STATUS.ACCEPTED);
    else if (statFilter === 'rejected') list = list.filter((t) => t.status === STATUS.REJECTED);
    else if (statFilter === 'failed') list = list.filter((t) => t.status === STATUS.FAILED);
    return list;
  }, [scopedTasks, initiatorFilter, supplierFilter, statFilter, listFilter, role, isSupplierRole]);

  const pendingCount = useMemo(
    () => scopedTasks.filter((t) => isPendingForMe(t, role)).length,
    [scopedTasks, role]
  );

  const handleCancelTask = (record) => {
    modal.confirm({
      title: '确认取消任务？',
      content: `任务 ${record.id} 取消后将变为「取消」状态，不可恢复。`,
      okText: '确认取消',
      cancelText: '返回',
      okType: 'danger',
      onOk: () => {
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        setTasks((prev) =>
          prev.map((t) =>
            t.id === record.id ? { ...t, status: STATUS.CANCELLED, actualFinishTime: now } : t
          )
        );
        msg.success('任务已取消');
      }
    });
  };

  const columns = [
    { title: '任务ID', dataIndex: 'id', width: 76 },
    { title: '任务状态', dataIndex: 'status', width: 120, render: (s) => renderStatusTag(s) },
    { title: '创建时间', dataIndex: 'createTime', width: 170, sorter: (a, b) => a.createTime.localeCompare(b.createTime) },
    { title: '期望交付日期', dataIndex: 'expectDelivery', width: 130, sorter: (a, b) => a.expectDelivery.localeCompare(b.expectDelivery) },
    { title: '预估拍摄时间', dataIndex: 'preShootTime', width: 170, render: (v) => (v ? React.createElement('span', { className: 'highlight-time' }, v) : '—') },
    {
      title: '实际完成时间',
      dataIndex: 'actualFinishTime',
      width: 170,
      render: (v, r) => (TERMINAL.has(r.status) && v ? v : '—')
    },
    { title: '拍摄单位', dataIndex: 'shootCompany', width: 100 },
    { title: '需求ID', dataIndex: 'reqId', width: 80 },
    { title: '需求名称', dataIndex: 'reqName', width: 140, ellipsis: true },
    {
      title: '创建人',
      dataIndex: 'creator',
      width: 130,
      render: (name, record) =>
        React.createElement(
          Space,
          { size: 8 },
          React.createElement(Avatar, { size: 32, style: { backgroundColor: '#722ed1', fontSize: 12 } }, (record.creatorAvatar || name).slice(-2)),
          name
        )
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: isSupplierRole ? 80 : 120,
      render: (_, record) => {
        const rowActions = getActions(record.status, role);
        const canCancel = rowActions.some((a) => a.label === '取消');
        return React.createElement(
          Space,
          { size: 0 },
          React.createElement(
            Button,
            { type: 'link', size: 'small', style: { padding: 0 }, onClick: () => onView(record.id) },
            '查看'
          ),
          canCancel &&
            React.createElement(
              Button,
              {
                type: 'link',
                size: 'small',
                danger: true,
                style: { padding: 0 },
                onClick: () => handleCancelTask(record)
              },
              '取消'
            )
        );
      }
    }
  ];

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(StatsBoard, { stats, activeKey: statFilter, onChange: setStatFilter }),
    React.createElement(
      'div',
      { className: 'content-card' },
      React.createElement(
        'div',
        { className: 'table-toolbar' },
        React.createElement(
          Space,
          { size: 16 },
          React.createElement(Select, {
            mode: 'multiple',
            allowClear: isSupplierRole,
            placeholder: '任务发起单位',
            style: { width: 216 },
            disabled: !isSupplierRole,
            options: ORGS.map((o) => ({ label: o, value: o })),
            value: isSupplierRole ? initiatorFilter : [CURRENT_USER.org],
            onChange: isSupplierRole ? setInitiatorFilter : undefined
          }),
          React.createElement(Select, {
            mode: isSupplierRole ? undefined : 'multiple',
            allowClear: !isSupplierRole,
            placeholder: '拍摄单位',
            style: { width: 216 },
            disabled: isSupplierRole,
            options: SUPPLIERS.map((s) => ({ label: s, value: s })),
            value: isSupplierRole ? CURRENT_USER.supplierName : supplierFilter,
            onChange: isSupplierRole ? undefined : setSupplierFilter
          })
        ),
        React.createElement(
          Button,
          {
            icon: React.createElement(ExportOutlined),
            disabled: selectedRowKeys.length === 0,
            onClick: () => message.success(`已导出 ${selectedRowKeys.length} 条任务（演示）`)
          },
          '导出任务'
        )
      ),
      React.createElement(
        'div',
        { className: 'table-title-row' },
        React.createElement('span', { className: 'label' }, '需求列表：'),
        isSupplierRole &&
          React.createElement(
            Radio.Group,
            {
              size: 'small',
              optionType: 'button',
              value: listFilter,
              onChange: (e) => setListFilter(e.target.value)
            },
            React.createElement(Radio.Button, { value: 'all' }, '全部任务'),
            React.createElement(
              Radio.Button,
              { value: 'pending' },
              React.createElement(Badge, { count: pendingCount, size: 'small', offset: [6, -2] }, '待我处理')
            )
          )
      ),
      React.createElement(
        'div',
        { className: 'table-wrap' },
        React.createElement(Table, {
          rowSelection: { selectedRowKeys, onChange: setSelectedRowKeys },
          columns,
          dataSource: filtered,
          scroll: { x: 1500 },
          bordered: true,
          size: 'middle',
          pagination: false,
          rowClassName: (record) => (selectedRowKeys.includes(record.key) ? 'ant-table-row-selected' : '')
        }),
        React.createElement(
          'div',
          { className: 'table-footer' },
          React.createElement('span', null, `共查询到${filtered.length}条记录`),
          React.createElement(Pagination, { size: 'small', total: filtered.length, current: 1, pageSize: 10, showSizeChanger: false })
        )
      )
    )
  );
}

// ——— 详情页组件 ———
function DetailSectionTitle({ children }) {
  return React.createElement(
    'div',
    { className: 'detail-section-title' },
    React.createElement('span', { className: 'detail-section-bar' }),
    React.createElement('span', { className: 'detail-section-text' }, children)
  );
}

function DetailField({ label, children, highlight }) {
  return React.createElement(
    'div',
    { className: 'detail-field' },
    React.createElement('span', { className: 'detail-field-label' }, `${label}：`),
    React.createElement('span', { className: `detail-field-value${highlight ? ' highlight' : ''}` }, children)
  );
}

function getDetailActionLabel(action) {
  if (action.label === '拒绝') return '拒绝受理';
  if (action.label === '受理') return '确认受理';
  if (action.label === '上传成果') return '确认上传';
  if (action.label === '失败') return '任务失败';
  if (action.label === '取消') return '取消任务';
  return action.label;
}

// ——— 审批环节 UI ———
function ApprovalFlowPanel({ task, role, commentDrafts, setCommentDrafts, hasUploadedResult }) {
  const steps = getApprovalSteps(task);
  const isSupplier = role === 'supplier';
  const [alertVisible, setAlertVisible] = useState(true);

  const commentPlaceholder = (stepKey, title) => {
    const name = stepKey === 'upload' ? '成果上传' : title;
    return `请填写“${name}”环节的审批意见（选填）`;
  };

  const renderCommentField = (step, editable, value) =>
    editable
      ? React.createElement(TextArea, {
          rows: 2,
          maxLength: 500,
          placeholder: commentPlaceholder(step.key, step.title),
          value: value,
          onChange: (e) => setCommentDrafts((prev) => ({ ...prev, [step.key]: e.target.value }))
        })
      : React.createElement(Input, {
          readOnly: true,
          value: getFinishedCommentDisplay(step.key, value),
          className: 'approval-comment-readonly'
        });

  const renderStepPanel = (step, panelClass, editable, value, tagColor) =>
    React.createElement(
      'div',
      { className: panelClass },
      React.createElement(
        'div',
        { className: 'approval-step-panel-head' },
        React.createElement('span', { className: 'approval-step-panel-title' }, step.title),
        React.createElement(Tag, { color: tagColor, bordered: true }, '进行中')
      ),
      React.createElement('div', { className: 'approval-comment-label' }, '审批意见'),
      renderCommentField(step, editable, value)
    );

  return React.createElement(
    'div',
    { className: 'detail-approval-panel' },
    isSupplier &&
      alertVisible &&
      React.createElement(Alert, {
        type: 'info',
        showIcon: true,
        closable: true,
        icon: React.createElement(InfoCircleFilled),
        message: '供应商在当前审批环节可填写审批意见；点击受理、拒绝、上传成果等操作时将自动保存',
        style: { marginBottom: 16 },
        onClose: () => setAlertVisible(false)
      }),
    !isSupplier &&
      alertVisible &&
      React.createElement(Alert, {
        type: 'info',
        showIcon: true,
        closable: true,
        icon: React.createElement(InfoCircleFilled),
        message: '以下为审批记录，仅支持查看',
        style: { marginBottom: 16 },
        onClose: () => setAlertVisible(false)
      }),
    React.createElement(
      'div',
      { className: 'approval-timeline' },
      steps.map((step, index) => {
        const needsComment = step.key !== 'complete' && APPROVAL_STEP_KEYS.includes(step.key);
        const editable = needsComment && isSupplier && canSupplierEditApprovalStep(step.key, task.status);
        const value = commentDrafts[step.key] || '';
        const isLast = index === steps.length - 1;
        const isProcess = step.state === 'process';
        const isFinish = step.state === 'finish';
        const isError = step.state === 'error';
        const isWait = step.state === 'wait';
        const isUploadAwaiting = step.key === 'upload' && isProcess && !hasUploadedResult;
        const showProcessHighlight = isProcess && !isUploadAwaiting;
        const showBluePanel = showProcessHighlight && needsComment && isSupplier;
        const showNeutralPanel = isUploadAwaiting && needsComment && isSupplier;

        return React.createElement(
          'div',
          {
            key: step.key,
            className: `approval-timeline-item approval-timeline-${step.state}${showProcessHighlight ? ' approval-timeline-active' : ''}`
          },
          React.createElement(
            'div',
            { className: 'approval-timeline-rail' },
            React.createElement('span', {
              className: `approval-timeline-dot${showProcessHighlight ? ' process' : ''}${isFinish ? ' finish' : ''}${isError ? ' error' : ''}${isWait || isUploadAwaiting ? ' wait' : ''}`
            }),
            !isLast &&
              React.createElement('span', {
                className: `approval-timeline-line${isFinish || showProcessHighlight ? ' active' : ''}`
              })
          ),
          React.createElement(
            'div',
            { className: 'approval-timeline-body' },
            showBluePanel
              ? renderStepPanel(step, 'approval-step-panel', editable, value, 'processing')
              : showNeutralPanel
                ? renderStepPanel(step, 'approval-step-panel-neutral', editable, value, 'default')
                : React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    'div',
                    {
                      className: `approval-timeline-title${isWait || isUploadAwaiting ? ' wait' : ''}${isError ? ' error' : ''}`
                    },
                    step.title
                  ),
                  React.createElement(
                    'div',
                    { className: 'approval-timeline-time' },
                    isError && step.key === 'accept' ? '已拒绝' : step.time
                  ),
                  isFinish &&
                    needsComment &&
                    React.createElement(Input, {
                      readOnly: true,
                      className: 'approval-comment-readonly',
                      style: { marginTop: 8 },
                      value: getFinishedCommentDisplay(step.key, value)
                    }),
                  isProcess &&
                    needsComment &&
                    !isSupplier &&
                    React.createElement(Input, {
                      readOnly: true,
                      className: 'approval-comment-readonly',
                      style: { marginTop: 8 },
                      value: (value || '').trim() || '—'
                    })
                )
          )
        );
      })
    )
  );
}

// ——— 详情页 ———
function TaskDetail({ task, tasks, setTasks, role, onBack }) {
  const { modal, message: msg } = AntApp.useApp();
  const [uploadList, setUploadList] = useState(() => {
    if (task.resultUploaded && task.attachmentFile) {
      return [{ uid: `zip-${task.id}`, name: `${task.attachmentFile.name}${task.attachmentFile.ext}`, status: 'done' }];
    }
    return [];
  });
  const [commentDrafts, setCommentDrafts] = useState(() => normalizeApprovalComments(task.approvalComments));
  const [uploading, setUploading] = useState(false);

  const isSupplier = role === 'supplier';
  const actions = getActions(task.status, role);
  const hasFile = hasResultAttachment(task, uploadList);
  const canUploadData = isSupplier && task.status === STATUS.ACCEPTED;
  const canDownloadResult = !isSupplier && task.status === STATUS.COMPLETED && hasFile;
  const uploadBtnDisabled = !canUploadData || uploading || TERMINAL.has(task.status);
  const showFileCard = hasFile && task.attachmentFile;

  const mergeCommentsIntoTask = (drafts) => {
    const saved = normalizeApprovalComments(task.approvalComments);
    APPROVAL_STEP_KEYS.forEach((k) => {
      const text = (drafts[k] || '').trim();
      if (text) saved[k] = text;
    });
    return saved;
  };

  const applyTransition = (toStatus, actionMeta) => {
    const label = STATUS_LABEL[toStatus];
    const commentKeys = getCommentKeysForAction(toStatus);
    modal.confirm({
      title: `确认【${getDetailActionLabel(actionMeta)}】？`,
      content: React.createElement(
        'div',
        null,
        React.createElement('p', null, `任务 ${task.id} 将变更为「${label}」，状态单向流转，不可回退。`),
        commentKeys.length > 0 &&
          React.createElement('p', { style: { color: '#8c8c8c', fontSize: 12, marginBottom: 0 } }, '将一并保存当前环节已填写的审批意见。')
      ),
      okText: '确认',
      cancelText: '取消',
      okType: actionMeta.danger ? 'danger' : 'primary',
      onOk: () => {
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const savedComments = mergeCommentsIntoTask(commentDrafts);
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== task.id) return t;
            const next = { ...t, status: toStatus, approvalComments: savedComments };
            if (toStatus === STATUS.ACCEPTED) {
              next.acceptTime = now;
              next.preShootTime = next.preShootTime || now;
            }
            if (toStatus === STATUS.COMPLETED) {
              next.uploadTime = now;
              next.actualFinishTime = now;
              next.resultUploaded = true;
              next.images = uploadList.length
                ? uploadList
                : [{ uid: 'new', name: '成果影像.jpg', url: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=200' }];
            }
            if (toStatus === STATUS.FAILED || toStatus === STATUS.REJECTED || toStatus === STATUS.CANCELLED) {
              next.actualFinishTime = now;
            }
            return next;
          })
        );
        msg.success(`操作成功，当前状态：${label}`);
      }
    });
  };

  const simulateUploadResult = () => {
    if (uploadBtnDisabled || uploading) return;
    setUploading(true);
    window.setTimeout(() => {
      setUploadList([
        {
          uid: `zip-${task.id}`,
          name: `${task.attachmentFile.name}${task.attachmentFile.ext}`,
          status: 'done'
        }
      ]);
      setUploading(false);
      msg.success('影像结果上传成功');
    }, 1500);
  };

  const renderActionButtons = () => {
    if (TERMINAL.has(task.status) || actions.length === 0) return null;

    if (!isSupplier) {
      return actions.map((a) =>
        React.createElement(
          Button,
          {
            key: a.label,
            danger: true,
            onClick: () => applyTransition(a.to, a)
          },
          getDetailActionLabel(a)
        )
      );
    }

    return actions.map((a) => {
      const label = getDetailActionLabel(a);
      const isConfirmUpload = a.needUpload;
      const disabled = isConfirmUpload && (!hasFile || uploading);

      return React.createElement(
        Button,
        {
          key: a.label,
          type: a.danger ? 'default' : a.type || 'default',
          danger: a.danger,
          disabled: disabled,
          onClick: () => {
            if (isConfirmUpload && !hasFile) {
              msg.warning('请先上传影像结果');
              return;
            }
            applyTransition(a.to, a);
          }
        },
        label
      );
    });
  };

  const renderDemanderAttachmentArea = () => {
    const fileMeta = task.attachmentFile;

    if (showFileCard && fileMeta) {
      return React.createElement(
        'div',
        { className: 'attachment-list' },
        React.createElement(
          'div',
          { className: 'attachment-file-card attachment-file-card-full' },
          React.createElement(FileZipOutlined, { className: 'attachment-file-icon' }),
          React.createElement(
            'div',
            { className: 'attachment-file-meta' },
            React.createElement(
              'div',
              { className: 'attachment-file-name' },
              React.createElement('span', { className: 'attachment-file-base' }, fileMeta.name),
              React.createElement('span', { className: 'attachment-file-ext' }, fileMeta.ext)
            ),
            React.createElement(
              'div',
              { className: 'attachment-file-sub' },
              `数据格式：${fileMeta.format} ｜大小：${fileMeta.size}`
            )
          )
        )
      );
    }

    return React.createElement(
      'div',
      { className: 'attachment-empty-demander' },
      React.createElement(FileZipOutlined, { className: 'attachment-empty-demander-icon' }),
      React.createElement(
        'div',
        { className: 'attachment-empty-demander-text' },
        React.createElement('div', { className: 'attachment-empty-demander-title' }, '暂无影像成果'),
        React.createElement('div', { className: 'attachment-empty-demander-desc' }, getDemanderAttachmentEmptyHint(task.status))
      )
    );
  };

  const renderAttachmentArea = () => {
    const fileMeta = task.attachmentFile;

    if (showFileCard && fileMeta) {
      return React.createElement(
        'div',
        { className: 'attachment-list' },
        React.createElement(
          'div',
          { className: 'attachment-file-card' },
          React.createElement(FileZipOutlined, { className: 'attachment-file-icon' }),
          React.createElement(
            'div',
            { className: 'attachment-file-meta' },
            React.createElement(
              'div',
              { className: 'attachment-file-name' },
              React.createElement('span', { className: 'attachment-file-base' }, fileMeta.name),
              React.createElement('span', { className: 'attachment-file-ext' }, fileMeta.ext)
            ),
            React.createElement(
              'div',
              { className: 'attachment-file-sub' },
              `数据格式：${fileMeta.format} ｜大小：${fileMeta.size}`
            )
          )
        ),
        canUploadData &&
          React.createElement(
            'div',
            {
              className: 'attachment-add-btn',
              onClick: uploading ? undefined : simulateUploadResult,
              style: uploading ? { cursor: 'not-allowed', opacity: 0.6 } : undefined
            },
            React.createElement(PlusOutlined)
          )
      );
    }

    return React.createElement(
      'div',
      {
        className: `attachment-empty-full${canUploadData ? '' : ' disabled'}`,
        onClick: canUploadData && !uploading ? simulateUploadResult : undefined
      },
      React.createElement(PlusOutlined)
    );
  };

  const infoFieldsTop = [
    { label: '任务ID', value: task.id },
    { label: '创建人', value: task.creator },
    { label: '创建单位', value: task.initiatorOrg },
    { label: '关联需求ID', value: task.reqId },
    { label: '经纬度', value: `${task.lng}，${task.lat}` },
    { label: '侧摆角要求', value: task.rollAngle },
    { label: '云量要求', value: task.cloudCover },
    { label: '数据类型', value: task.dataType },
    { label: '需求备注', value: task.remark || '—' },
    { label: '产品交付等级', value: task.productLevel },
    { label: '任务创建时间', value: task.createTime },
    { label: '分辨率', value: task.resolution }
  ];

  const infoFieldsTask = [
    { label: '任务状态', value: renderStatusTag(task.status) },
    { label: '期望交付日期', value: task.expectDelivery },
    { label: '预计拍摄时间', value: task.preShootTime || '—', highlight: !!task.preShootTime },
    { label: '实际完成时间', value: task.actualFinishTime || '—' },
    { label: '预拍摄卫星', value: task.satellite },
    { label: '拍摄单位', value: task.shootCompany },
    { label: '拍摄时长', value: task.shootDuration || '—', highlight: !!task.shootDuration }
  ];

  return React.createElement(
    'div',
    { className: 'detail-layout' },
    React.createElement(
      'div',
      { className: 'detail-main' },
      React.createElement(
        'div',
        { className: 'detail-card' },
        React.createElement(DetailSectionTitle, null, '基础信息'),
        React.createElement(
          'div',
          { className: 'detail-field-grid' },
          infoFieldsTop.map((f) =>
            React.createElement(DetailField, { key: f.label, label: f.label }, f.value)
          )
        ),
        React.createElement(Divider, { style: { margin: '20px 0 16px' } }),
        React.createElement(DetailSectionTitle, null, '任务详情'),
        React.createElement(
          'div',
          { className: 'detail-field-grid' },
          infoFieldsTask.map((f) =>
            React.createElement(DetailField, { key: f.label, label: f.label, highlight: f.highlight }, f.value)
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'detail-card detail-approval-card' },
        React.createElement(DetailSectionTitle, null, isSupplier ? '任务审批' : '审批记录'),
        React.createElement(ApprovalFlowPanel, {
          task,
          role,
          commentDrafts,
          setCommentDrafts,
          hasUploadedResult: hasFile
        }),
        !isSupplier &&
          task.status === STATUS.NOT_ACCEPTED &&
          actions.length > 0 &&
          React.createElement(
            'div',
            { className: 'detail-action-bar' },
            React.createElement(Space, { size: 8 }, renderActionButtons())
          ),
        isSupplier &&
          !TERMINAL.has(task.status) &&
          actions.length > 0 &&
          React.createElement(
            'div',
            { className: 'detail-action-bar' },
            React.createElement(Space, { size: 8 }, renderActionButtons())
          ),
        TERMINAL.has(task.status) &&
          React.createElement(
            Typography.Text,
            { type: 'secondary', className: 'detail-terminal-tip' },
            isSupplier ? '任务已终结，无后续操作' : '任务已终结，可查看审批记录与成果信息'
          )
      )
    ),
    React.createElement(
      'div',
      { className: 'detail-side' },
      React.createElement(
        'div',
        { className: 'detail-card detail-side-card' },
        React.createElement(DetailSectionTitle, null, '数据信息'),
        React.createElement(
          'div',
          { className: 'detail-metrics-grid' },
          React.createElement(DetailField, { label: '分辨率', highlight: true }, task.resolution),
          React.createElement(DetailField, { label: '拍摄面积', highlight: true }, task.shootArea || '—'),
          React.createElement(DetailField, { label: '云量', highlight: true }, task.cloudCover),
          React.createElement(DetailField, { label: '侧摆角', highlight: true }, task.rollAngle)
        ),
        React.createElement(
          'div',
          { className: 'detail-attachment-area' },
          isSupplier ? renderAttachmentArea() : renderDemanderAttachmentArea(),
          isSupplier &&
            React.createElement(
              Button,
              {
                type: 'primary',
                block: true,
                className: 'detail-upload-btn',
                disabled: uploadBtnDisabled,
                loading: uploading,
                icon: uploading ? undefined : React.createElement(UploadOutlined),
                onClick: simulateUploadResult
              },
              '上传影像结果'
            ),
          !isSupplier &&
            React.createElement(
              Tooltip,
              { title: canDownloadResult ? null : getDemanderDownloadTooltip(task.status, canDownloadResult) },
              React.createElement(
                'span',
                { className: 'detail-download-btn-wrap' },
                React.createElement(
                  Button,
                  {
                    type: 'primary',
                    block: true,
                    className: 'detail-upload-btn',
                    disabled: !canDownloadResult,
                    icon: React.createElement(CloudDownloadOutlined),
                    onClick: () => msg.success('已开始下载影像成果（演示）')
                  },
                  '下载影像成果'
                )
              )
            )
        ),
        React.createElement(Divider, { style: { margin: '20px 0 16px' } }),
        React.createElement(DetailSectionTitle, null, '成果预览'),
        React.createElement(
          'div',
          { className: 'map-panel detail-map-panel' },
          React.createElement(ResultMapPreview, { lng: task.lng, lat: task.lat }),
          React.createElement(
            'div',
            { className: 'map-toolbar' },
            React.createElement('div', { className: 'map-tool-btn' }, React.createElement(PaperClipOutlined)),
            React.createElement('div', { className: 'map-tool-divider' }),
            React.createElement('div', { className: 'map-tool-btn' }, '尺'),
            React.createElement('div', { className: 'map-tool-divider' }),
            React.createElement('div', { className: 'map-tool-btn' }, '角'),
            React.createElement('div', { className: 'map-tool-divider' }),
            React.createElement('div', { className: 'map-tool-btn' }, React.createElement(EnvironmentOutlined))
          ),
          React.createElement(
            'div',
            { className: 'map-scale-bar' },
            React.createElement('span', null, `lng：${task.lng}`),
            React.createElement('span', null, `lat：${task.lat}`),
            React.createElement(
              'span',
              { className: 'map-scale-ruler' },
              React.createElement('span', { className: 'map-scale-text' }, '10km'),
              React.createElement('span', { className: 'map-scale-line' })
            )
          )
        )
      )
    )
  );
}

// ——— 根组件 ———
function RootApp() {
  const [tasks, setTasks] = useState(buildInitialTasks);
  const [role, setRole] = useState('supplier');
  const [view, setView] = useState('list');
  const [detailId, setDetailId] = useState(null);

  const currentTask = useMemo(() => tasks.find((t) => t.id === detailId), [tasks, detailId]);

  const handleView = useCallback((id) => {
    setDetailId(id);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setView('list');
    setDetailId(null);
  }, []);

  const handleRoleChange = useCallback((nextRole) => {
    setRole(nextRole);
    setView('list');
    setDetailId(null);
  }, []);

  return React.createElement(
    ConfigProvider,
    {
      theme: {
        token: { colorPrimary: '#1677ff', borderRadius: 2, fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', Roboto, sans-serif" },
        components: {
          Table: { headerBg: 'rgba(0,0,0,0.02)', borderColor: '#f0f0f0' },
          Menu: { darkItemBg: '#1b2d3e', darkSubMenuItemBg: '#172635' }
        }
      }
    },
    React.createElement(
      AntApp,
      null,
      React.createElement(
        AppLayout,
        {
          selectedMenu: 'tasks',
          detailTaskId: view === 'detail' && currentTask ? currentTask.id : null,
          onBackToList: handleBack,
          role,
          onRoleChange: handleRoleChange
        },
        view === 'list'
          ? React.createElement(TaskList, {
              key: role,
              tasks,
              setTasks,
              role,
              onView: handleView
            })
          : currentTask
            ? React.createElement(TaskDetail, {
                key: currentTask.id + currentTask.status,
                task: currentTask,
                tasks,
                setTasks,
                role,
                onBack: handleBack
              })
            : React.createElement(Empty, { description: '任务不存在' }, React.createElement(Button, { type: 'primary', onClick: handleBack }, '返回列表'))
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(RootApp));
