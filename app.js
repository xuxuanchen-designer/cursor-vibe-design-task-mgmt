/* 资源中心 - 任务管理（React 18 + Ant Design 5） */
const { useState, useMemo, useCallback } = React;
const {
  ConfigProvider, App: AntApp, Layout, Menu, Table, Tag, Space, Button,
  Card, Row, Col, Statistic, Select, Steps, Image, Badge, Modal, message,
  Descriptions, Tabs, Upload, Divider, Typography, Empty, Tooltip, Input, Alert,
  Radio, Avatar, Pagination
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
  GlobalOutlined, MenuFoldOutlined, PictureOutlined
} = Icons;

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

function buildInitialTasks() {
  const rows = [
    { id: '01', status: STATUS.NOT_ACCEPTED, createTime: '2026-04-01 12:11:20', expectDelivery: '2026-04-09', preShootTime: '', actualFinishTime: '', reqId: '001', reqName: '需求名称1', creator: '刘杨', creatorAvatar: '刘杨' },
    { id: '02', status: STATUS.NOT_ACCEPTED, createTime: '2026-04-02 12:11:20', expectDelivery: '2026-04-09', preShootTime: '', actualFinishTime: '', reqId: '002', reqName: '需求名称2', creator: '张三', creatorAvatar: '张三' },
    { id: '03', status: STATUS.ACCEPTED, createTime: '2026-04-03 12:11:20', expectDelivery: '2026-04-09', preShootTime: '2026-04-09 08:00:00', actualFinishTime: '', reqId: '003', reqName: '需求名称3', creator: '李四', creatorAvatar: '李四' },
    { id: '04', status: STATUS.REJECTED, createTime: '2026-04-04 12:11:20', expectDelivery: '2026-04-09', preShootTime: '2026-04-09 08:00:00', actualFinishTime: '2026-04-10 09:00:00', reqId: '004', reqName: '需求名称4', creator: '王五', creatorAvatar: '王五' },
    { id: '05', status: STATUS.COMPLETED, createTime: '2026-04-05 12:11:20', expectDelivery: '2026-04-09', preShootTime: '2026-04-09 08:00:00', actualFinishTime: '2026-04-09 18:30:00', reqId: '005', reqName: '需求名称5', creator: '刘杨', creatorAvatar: '刘杨' },
    { id: '06', status: STATUS.FAILED, createTime: '2026-04-06 12:11:20', expectDelivery: '2026-04-09', preShootTime: '2026-04-09 08:00:00', actualFinishTime: '2026-04-10 09:15:00', reqId: '006', reqName: '需求名称6', creator: '赵六', creatorAvatar: '赵六' },
    { id: '07', status: STATUS.CANCELLED, createTime: '2026-04-07 12:11:20', expectDelivery: '2026-04-09', preShootTime: '', actualFinishTime: '2026-04-08 10:00:00', reqId: '007', reqName: '需求名称7', creator: '孙七', creatorAvatar: '孙七' }
  ];
  return rows.map((r) => ({
    key: r.id,
    ...r,
    shootCompany: CURRENT_USER.supplierName,
    initiatorOrg: ORGS[parseInt(r.id, 10) % ORGS.length],
    lng: (121.33 + parseInt(r.id, 10) * 0.01).toFixed(5),
    lat: (41.45 + parseInt(r.id, 10) * 0.008).toFixed(7),
    rollAngle: '<35°',
    cloudCover: '<70%',
    dataType: '高分',
    resolution: '<2m',
    productLevel: 'L2',
    satellite: '东方慧眼01星',
    shootDuration: '10s',
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
  }));
}

/** 需填写审批意见的环节（不含任务创建） */
const APPROVAL_STEP_KEYS = ['accept', 'upload', 'complete'];

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
  return tasks;
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
    task.status === STATUS.NOT_ACCEPTED ? '—' : task.status === STATUS.REJECTED ? '已拒绝' : task.preShootTime || '—';

  return [
    created,
    { key: 'accept', title: '任务受理', time: acceptTime, state: acceptState },
    {
      key: 'upload',
      title: '数据上传',
      time: task.status === STATUS.COMPLETED ? task.actualFinishTime : '—',
      state: uploadState
    },
    { key: 'complete', title: '任务完成', time: task.actualFinishTime || '—', state: completeState }
  ];
}

/** 供应商可填写当前进行中环节的审批意见 */
function canSupplierEditApprovalStep(stepKey, status) {
  if (TERMINAL.has(status)) return false;
  if (status === STATUS.NOT_ACCEPTED && stepKey === 'accept') return true;
  if (status === STATUS.ACCEPTED && (stepKey === 'upload' || stepKey === 'complete')) return true;
  return false;
}

function getCommentKeysForAction(toStatus) {
  if (toStatus === STATUS.ACCEPTED || toStatus === STATUS.REJECTED) return ['accept'];
  if (toStatus === STATUS.COMPLETED) return ['upload', 'complete'];
  if (toStatus === STATUS.FAILED) return ['upload'];
  return [];
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
function AppLayout({ children, selectedMenu }) {
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
        React.createElement(Space, { size: 12 },
          React.createElement(Avatar, { size: 32 }, 'A'),
          React.createElement('span', { style: { fontSize: 14 } }, 'admin')
        )
      ),
      React.createElement(
        'div',
        { className: 'page-tabs' },
        React.createElement(Tabs, {
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
  const { modal } = AntApp.useApp();
  const [initiatorFilter, setInitiatorFilter] = useState([]);
  const [statFilter, setStatFilter] = useState('all');
  const [listFilter, setListFilter] = useState('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState(['02']);

  const scopedTasks = useMemo(() => getScopedTasks(tasks, role), [tasks, role]);
  const stats = useMemo(() => computeStats(scopedTasks), [scopedTasks]);

  const filtered = useMemo(() => {
    let list = [...scopedTasks];
    if (initiatorFilter.length) list = list.filter((t) => initiatorFilter.includes(t.initiatorOrg));
    if (listFilter === 'pending') list = list.filter((t) => isPendingForMe(t, role));
    if (statFilter === 'completed') list = list.filter((t) => t.status === STATUS.COMPLETED);
    else if (statFilter === 'uncompleted') list = list.filter((t) => t.status !== STATUS.COMPLETED);
    else if (statFilter === 'inProgress') list = list.filter((t) => t.status === STATUS.ACCEPTED);
    else if (statFilter === 'rejected') list = list.filter((t) => t.status === STATUS.REJECTED);
    else if (statFilter === 'failed') list = list.filter((t) => t.status === STATUS.FAILED);
    return list;
  }, [scopedTasks, initiatorFilter, statFilter, listFilter, role]);

  const pendingCount = useMemo(
    () => scopedTasks.filter((t) => isPendingForMe(t, role)).length,
    [scopedTasks, role]
  );

  const columns = [
    { title: '任务ID', dataIndex: 'id', width: 76 },
    { title: '任务状态', dataIndex: 'status', width: 120, render: (s) => renderStatusTag(s) },
    { title: '创建时间', dataIndex: 'createTime', width: 170, sorter: (a, b) => a.createTime.localeCompare(b.createTime) },
    { title: '期望交付日期', dataIndex: 'expectDelivery', width: 130, sorter: (a, b) => a.expectDelivery.localeCompare(b.expectDelivery) },
    { title: '预估拍摄时间', dataIndex: 'preShootTime', width: 170, render: (v) => v || '—' },
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
      width: 80,
      render: (_, record) =>
        React.createElement(
          Button,
          { type: 'link', size: 'small', style: { padding: 0 }, onClick: () => onView(record.id) },
          '查看'
        )
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
            allowClear: true,
            placeholder: '任务发起单位',
            style: { width: 216 },
            options: ORGS.map((o) => ({ label: o, value: o })),
            value: initiatorFilter,
            onChange: setInitiatorFilter
          }),
          React.createElement(Select, {
            disabled: true,
            placeholder: '拍摄单位',
            style: { width: 216 },
            value: CURRENT_USER.supplierName
          })
        ),
        React.createElement(
          Button,
          { icon: React.createElement(ExportOutlined), onClick: () => message.success(`已导出 ${filtered.length} 条任务（演示）`) },
          '导出任务'
        )
      ),
      React.createElement(
        'div',
        { className: 'table-title-row' },
        React.createElement('span', { className: 'label' }, '需求列表：'),
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

// ——— 审批环节 UI ———
function renderStepStatusIcon(state) {
  if (state === 'finish') return React.createElement(CheckCircleOutlined, { className: 'approval-done' });
  if (state === 'process') return React.createElement(ExclamationCircleOutlined, { className: 'approval-pending' });
  if (state === 'error') return React.createElement(CloseCircleOutlined, { style: { color: '#ff4d4f' } });
  return React.createElement(ClockCircleOutlined, { className: 'approval-wait' });
}

function ApprovalFlowPanel({ task, role, commentDrafts, setCommentDrafts }) {
  const steps = getApprovalSteps(task);
  const isSupplier = role === 'supplier';

  return React.createElement(
    'div',
    { className: 'approval-flow' },
    steps.map((step) => {
      const needsComment = APPROVAL_STEP_KEYS.includes(step.key);
      const editable = needsComment && isSupplier && canSupplierEditApprovalStep(step.key, task.status);
      const value = commentDrafts[step.key] || '';
      return React.createElement(
        'div',
        { key: step.key, className: `approval-step-item approval-step-${step.state}` },
        React.createElement(
          'div',
          { className: 'approval-step-head' },
          renderStepStatusIcon(step.state),
          React.createElement('div', { className: 'approval-step-meta' },
            React.createElement('span', { className: 'approval-step-title' }, step.title),
            React.createElement('span', { className: 'approval-step-time' }, step.time)
          ),
          step.state === 'process' && React.createElement(Tag, { color: 'processing', style: { marginLeft: 'auto' } }, '进行中')
        ),
        needsComment &&
          React.createElement(
            'div',
            { className: 'approval-comment-box' },
            React.createElement('div', { className: 'approval-comment-label' },
              '审批意见',
              editable && React.createElement(Tag, { color: 'blue', bordered: false, style: { marginLeft: 8, fontSize: 11 } }, '供应商填写')
            ),
            editable
              ? React.createElement(TextArea, {
                  rows: 2,
                  maxLength: 500,
                  showCount: true,
                  placeholder: `请填写「${step.title}」环节的审批意见（选填）`,
                  value: value,
                  onChange: (e) => setCommentDrafts((prev) => ({ ...prev, [step.key]: e.target.value }))
                })
              : value
                ? React.createElement('div', { className: 'approval-comment-read' }, value)
                : React.createElement(Typography.Text, { type: 'secondary', style: { fontSize: 12 } }, '暂无审批意见')
          )
      );
    })
  );
}

// ——— 详情页 ———
function TaskDetail({ task, tasks, setTasks, role, onBack }) {
  const { modal, message: msg } = AntApp.useApp();
  const [uploadList, setUploadList] = useState(task.images || []);
  const [commentDrafts, setCommentDrafts] = useState(() => normalizeApprovalComments(task.approvalComments));

  const actions = getActions(task.status, role);

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
      title: `确认【${actionMeta.label}】？`,
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
              next.preShootTime = next.preShootTime || '2026-04-09:08:00:00';
            }
            if (TERMINAL.has(toStatus)) next.actualFinishTime = now;
            if (toStatus === STATUS.COMPLETED) {
              next.images = uploadList.length
                ? uploadList
                : [{ uid: 'new', name: '成果影像.jpg', url: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=200' }];
            }
            return next;
          })
        );
        msg.success(`操作成功，当前状态：${label}`);
      }
    });
  };

  return React.createElement(
    Space,
    { direction: 'vertical', size: 'middle', style: { width: '100%' } },
    React.createElement(
      Card,
      { bordered: false, size: 'small' },
      React.createElement(Row, { justify: 'space-between', align: 'middle' },
        React.createElement(Space, null,
          React.createElement(Button, { type: 'text', icon: React.createElement(ArrowLeftOutlined), onClick: onBack }, '返回列表'),
          React.createElement(Typography.Title, { level: 5, style: { margin: 0 } }, `任务详情 — ${task.id}`),
          renderStatusTag(task.status)
        ),
        React.createElement(Tag, { color: role === 'demander' ? 'blue' : 'purple' }, role === 'demander' ? '需求方视角' : '供应商视角')
      )
    ),
    React.createElement(
      Row,
      { gutter: 16 },
      React.createElement(
        Col,
        { span: 16 },
        React.createElement(
          Card,
          { title: React.createElement('span', { className: 'section-title' }, '基本信息'), bordered: false },
          React.createElement(Descriptions, { column: 3, size: 'small' },
            React.createElement(Descriptions.Item, { label: '任务ID' }, task.id),
            React.createElement(Descriptions.Item, { label: '创建人' }, task.creator),
            React.createElement(Descriptions.Item, { label: '创建单位' }, task.initiatorOrg),
            React.createElement(Descriptions.Item, { label: '关联需求ID' }, task.reqId),
            React.createElement(Descriptions.Item, { label: '关联需求名称', span: 2 }, task.reqName),
            React.createElement(Descriptions.Item, { label: '经纬度' }, `${task.lng}, ${task.lat}`),
            React.createElement(Descriptions.Item, { label: '侧摆角要求' }, task.rollAngle),
            React.createElement(Descriptions.Item, { label: '云量要求' }, task.cloudCover),
            React.createElement(Descriptions.Item, { label: '数据类型' }, task.dataType),
            React.createElement(Descriptions.Item, { label: '分辨率' }, task.resolution),
            React.createElement(Descriptions.Item, { label: '交付产品等级' }, task.productLevel),
            React.createElement(Descriptions.Item, { label: '任务创建时间' }, task.createTime)
          )
        ),
        React.createElement(
          Card,
          { title: React.createElement('span', { className: 'section-title' }, '任务详情'), bordered: false, style: { marginTop: 16 } },
          React.createElement(Descriptions, { column: 3, size: 'small' },
            React.createElement(Descriptions.Item, { label: '任务状态' }, renderStatusTag(task.status)),
            React.createElement(Descriptions.Item, { label: '期望完成时间' }, task.expectDelivery),
            React.createElement(Descriptions.Item, { label: '预计拍摄时间' },
              React.createElement('span', { className: 'highlight-time' }, task.preShootTime || '—')
            ),
            React.createElement(Descriptions.Item, { label: '实际完成时间' }, task.actualFinishTime || '—'),
            React.createElement(Descriptions.Item, { label: '预拍摄卫星' }, task.satellite),
            React.createElement(Descriptions.Item, { label: '拍摄时长' }, task.shootDuration),
            React.createElement(Descriptions.Item, { label: '拍摄单位' }, task.shootCompany)
          )
        ),
        React.createElement(
          Card,
          { title: React.createElement('span', { className: 'section-title' }, '数据信息'), bordered: false, style: { marginTop: 16 } },
          React.createElement(Descriptions, { column: 4, size: 'small', style: { marginBottom: 16 } },
            React.createElement(Descriptions.Item, { label: '分辨率' }, task.resolution),
            React.createElement(Descriptions.Item, { label: '拍摄区域' }, `${task.lng}, ${task.lat}`),
            React.createElement(Descriptions.Item, { label: '云量' }, task.cloudCover),
            React.createElement(Descriptions.Item, { label: '侧摆角' }, task.rollAngle)
          ),
          task.status === STATUS.ACCEPTED && role === 'supplier'
            ? React.createElement(Upload, {
                listType: 'picture-card',
                fileList: uploadList,
                onChange: ({ fileList }) => setUploadList(fileList),
                beforeUpload: () => false,
                accept: 'image/*',
                children: uploadList.length >= 4 ? null : React.createElement('div', null, React.createElement(PlusOutlined), React.createElement('div', { style: { marginTop: 8 } }, '上传'))
              })
            : uploadList.length
              ? React.createElement(
                  Space,
                  { wrap: true },
                  uploadList.map((f) =>
                    React.createElement(
                      Card,
                      { key: f.uid, size: 'small', style: { width: 120 } },
                      React.createElement(Image, { src: f.url, height: 80, style: { objectFit: 'cover' } }),
                      task.status === STATUS.COMPLETED &&
                        role === 'demander' &&
                        React.createElement(Button, {
                          type: 'link',
                          size: 'small',
                          icon: React.createElement(CloudDownloadOutlined),
                          onClick: () => msg.success('开始下载成果（演示）')
                        }, '下载')
                    )
                  )
                )
              : React.createElement(Empty, { description: '暂无影像数据', image: Empty.PRESENTED_IMAGE_SIMPLE })
        ),
        React.createElement(
          Card,
          { title: React.createElement('span', { className: 'section-title' }, '任务审批'), bordered: false, style: { marginTop: 16 } },
          role === 'supplier' &&
            React.createElement(Alert, {
              type: 'info',
              showIcon: true,
              message: '供应商审批意见',
              description: '请在当前进行中的环节填写审批意见；点击受理、拒绝、上传成果等操作时将自动保存。',
              style: { marginBottom: 16 }
            }),
          React.createElement(ApprovalFlowPanel, {
            task,
            role,
            commentDrafts,
            setCommentDrafts
          }),
          !TERMINAL.has(task.status) &&
            actions.length > 0 &&
            React.createElement(
              'div',
              { style: { borderTop: '1px solid #f0f0f0', paddingTop: 16 } },
              React.createElement(Space, { wrap: true },
                actions.map((a) =>
                  React.createElement(
                    Button,
                    {
                      key: a.label,
                      type: a.type || 'default',
                      danger: a.danger,
                      icon: a.needUpload ? React.createElement(CloudUploadOutlined) : undefined,
                      onClick: () => {
                        if (a.needUpload && uploadList.length === 0) {
                          msg.warning('请先上传至少一张影像成果');
                          return;
                        }
                        applyTransition(a.to, a);
                      }
                    },
                    a.label
                  )
                )
              )
            ),
          TERMINAL.has(task.status) &&
            React.createElement(Typography.Text, { type: 'secondary' }, '任务已终结，无后续操作。请返回列表。')
        )
      ),
      React.createElement(
        Col,
        { span: 8 },
        React.createElement(
          Card,
          { title: React.createElement(Space, null, React.createElement(EnvironmentOutlined), '成果预览'), bordered: false },
          React.createElement(
            'div',
            { className: 'map-panel' },
            React.createElement('div', { className: 'map-aoi' }),
            React.createElement('div', { className: 'map-pin' }),
            React.createElement(
              'div',
              {
                style: {
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  background: 'rgba(255,255,255,0.9)',
                  padding: '6px 10px',
                  borderRadius: 4,
                  fontSize: 12
                }
              },
              `靶区坐标：${task.lng}, ${task.lat}`
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
        { selectedMenu: 'tasks' },
        view === 'list'
          ? React.createElement(TaskList, {
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
