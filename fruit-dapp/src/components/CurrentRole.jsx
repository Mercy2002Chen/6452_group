const ROLE_LABELS = {
  FARMER: 'Farmer 农户',
  INSPECTOR: 'Inspector 检测员',
  RETAILER: 'Retailer 零售商',
  CONSUMER: 'Consumer 消费者',
  DEFAULT_ADMIN: 'Admin 管理员'
};

export default function CurrentRole({ roles = [], loading = false }) {
  return (
    <div style={{ marginTop: '6px', fontSize: '16px' }}>
      🧍‍♂️ 当前角色：
      {loading
        ? '加载中...' // 👈 显示加载中
        : (roles.length > 0 ? roles.map(r => ROLE_LABELS[r] || r).join(' | ') : 'None')}
    </div>
  );
}
