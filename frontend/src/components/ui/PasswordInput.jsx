import { forwardRef, useState } from 'react';
import { MdLockOutline, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import Input from './Input.jsx';

const PasswordInput = forwardRef(function PasswordInput({ withIcon = true, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      icon={withIcon ? <MdLockOutline /> : undefined}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <MdVisibilityOff className="h-4 w-4" /> : <MdVisibility className="h-4 w-4" />}
        </button>
      }
    />
  );
});

export default PasswordInput;
