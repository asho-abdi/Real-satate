import { forwardRef } from 'react';
import { cn } from '../../utils/format.js';
import { FieldLabel, FieldMessage, fieldBase, fieldError } from './Field.jsx';

const Input = forwardRef(function Input(
  { label, error, className, hint, icon, trailing, wrapperClassName, ...props },
  ref,
) {
  return (
    <label className={cn('block space-y-1.5', wrapperClassName)}>
      <FieldLabel required={props.required}>{label}</FieldLabel>
      <span className="relative block">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
        <input
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            fieldBase,
            'px-3',
            props.type === 'file'
              ? 'py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--primary-light)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--navy)] dark:file:text-[var(--text)]'
              : 'h-10',
            icon && 'pl-9',
            trailing && 'pr-10',
            error && fieldError,
            className,
          )}
          {...props}
        />
        {trailing ? <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span> : null}
      </span>
      <FieldMessage error={error} hint={hint} />
    </label>
  );
});

export default Input;

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, rows = 3, ...props }, ref) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={props.required}>{label}</FieldLabel>
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        className={cn(fieldBase, 'px-3 py-2.5 leading-relaxed', error && fieldError, className)}
        {...props}
      />
      <FieldMessage error={error} hint={hint} />
    </label>
  );
});
