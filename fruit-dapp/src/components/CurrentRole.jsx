const ROLE_LABELS = {
  FARMER: 'Farmer',
  INSPECTOR: 'Inspector',
  RETAILER: 'Retailer',
  CONSUMER: 'Consumer',
  DEFAULT_ADMIN: 'Admin'
};

export default function CurrentRole({ roles = [], loading = false }) {
  return (
    <div style={{ marginTop: '6px', fontSize: '16px' }}>
      🧍‍♂️ Current Role:
      {loading
        ? 'Loading...' // 👈 Show loading
        : (roles.length > 0 ? roles.map(r => ROLE_LABELS[r] || r).join(' | ') : 'None')}
    </div>
  );
}
