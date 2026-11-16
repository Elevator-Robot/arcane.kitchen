import { FlaskConical } from 'lucide-react';

export default function PreviewControls({
  member,
  admin,
  onAdminSwitch,
  onSwitch,
}: {
  member: boolean;
  admin: boolean;
  onAdminSwitch: () => void;
  onSwitch: () => void;
}) {
  return (
    <div className="ak-preview-controls">
      <span>
        <FlaskConical size={13} aria-hidden="true" /> Local preview
        <span className="hidden sm:inline"> · sample data</span>
      </span>
      <div className="flex items-center gap-4">
        <button type="button" onClick={onSwitch}>
          {member ? 'View as guest' : 'Explore as Rowan'}{' '}
          <span aria-hidden="true">↗</span>
        </button>
        <button type="button" onClick={onAdminSwitch} aria-pressed={admin}>
          {admin ? 'Exit admin' : 'Preview admin'}
        </button>
      </div>
    </div>
  );
}
