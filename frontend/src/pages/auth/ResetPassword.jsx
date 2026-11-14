import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MdArrowBack, MdKey } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import { cn } from '../../utils/format.js';

function strengthOf(pw = '') {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (!pw) return { score: 0, label: '' };
  if (score <= 2) return { score: 1, label: 'Weak' };
  if (score === 3) return { score: 2, label: 'Fair' };
  if (score === 4) return { score: 3, label: 'Good' };
  return { score: 4, label: 'Strong' };
}

const STRENGTH_COLOR = ['', 'bg-rose-500', 'bg-amber-500', 'bg-[var(--gold)]', 'bg-emerald-500'];

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token') || '';
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      token: tokenFromQuery,
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');
  const strength = strengthOf(password);

  const onSubmit = async ({ password: nextPassword, token }) => {
    setSubmitting(true);
    try {
      await resetPassword({ password: nextPassword, token });
    } catch {
      /* toast handled in context / service */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="eyebrow">Account recovery</p>
      <h1 className="page-title mt-2 text-[26px] leading-tight">Choose a new password</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        Use at least 8 characters. A mix of letters, numbers and symbols is strongest.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
        {!tokenFromQuery ? (
          <Input
            label="Reset token"
            icon={<MdKey />}
            error={errors.token?.message}
            hint="Paste the token from your reset email"
            {...register('token', { required: 'Reset token is required' })}
          />
        ) : (
          <input type="hidden" {...register('token', { required: true })} />
        )}

        <div className="space-y-2">
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
            })}
          />
          {password ? (
            <div className="flex items-center gap-3">
              <div className="grid flex-1 grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1 rounded-full transition-colors',
                      i <= strength.score ? STRENGTH_COLOR[strength.score] : 'bg-[var(--surface-3)]',
                    )}
                  />
                ))}
              </div>
              <span className="w-12 text-right text-xs font-medium text-[var(--text-muted)]">{strength.label}</span>
            </div>
          ) : null}
        </div>
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
        />

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Update password
        </Button>
        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <MdArrowBack className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
