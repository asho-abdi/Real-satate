import Badge from '../ui/Badge.jsx';

export default function PaymentStatusBadge({ status, children }) {
  const label = children || status || 'Unpaid';
  return <Badge status={status || label}>{label}</Badge>;
}
