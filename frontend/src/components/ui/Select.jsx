import { forwardRef } from 'react';
import { cn } from '../../utils/format.js';
import { FieldLabel, FieldMessage, fieldBase, fieldError } from './Field.jsx';

const Select = forwardRef(function Select({ label, error, hint, children, className, ...props }, ref) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={props.required}>{label}</FieldLabel>
      <select
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={cn(fieldBase, 'h-10 px-3', error && fieldError, className)}
        {...props}
      >
        {children}
      </select>
      <FieldMessage error={error} hint={hint} />
    </label>
  );
});

export default Select;
