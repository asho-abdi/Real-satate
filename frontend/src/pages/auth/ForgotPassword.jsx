import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MdArrowBack, MdMailOutline, MdMarkEmailRead } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';

function BackToLogin() {
  return (
    <Link
      to="/login"
      className="inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
    >
      <MdArrowBack className="h-4 w-4" /> Back to sign in
    </Link>
  );
}

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email }) => {
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      /* toast handled in context */
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/5">
          <MdMarkEmailRead className="h-7 w-7" />
        </span>
        <h1 className="page-title mt-6 text-[24px]">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          If an account exists for that email, a password reset link is on its way. The link expires shortly, so use
          it soon.
        </p>
        <div className="mt-8">
          <BackToLogin />
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow">Account recovery</p>
      <h1 className="page-title mt-2 text-[26px] leading-tight">Forgot your password?</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        Enter the email linked to your account and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@rjkrealty.com"
          icon={<MdMailOutline />}
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Enter a valid email',
            },
          })}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Send reset link
        </Button>
        <div className="text-center">
          <BackToLogin />
        </div>
      </form>
    </div>
  );
}
