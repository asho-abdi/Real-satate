import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MdArrowBack, MdArrowForward, MdKey, MdMailOutline, MdPhonelinkLock, MdVerifiedUser } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';

export default function Login() {
  const { login, loading } = useAuth();
  const [mfaStep, setMfaStep] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '', password: '', mfaCode: '', recoveryCode: '' },
  });

  const onSubmit = async (values) => {
    try {
      await login({
        email: values.email,
        password: values.password,
        mfaCode: values.mfaCode || undefined,
        recoveryCode: values.recoveryCode || undefined,
      });
    } catch (err) {
      if (err?.mfaRequired) {
        setMfaStep(err.pendingUser || { email: values.email });
        return;
      }
      /* toast handled in context */
    }
  };

  return (
    <div>
      {!mfaStep ? (
        <>
          <p className="eyebrow">Welcome back</p>
          <h1 className="page-title mt-2 text-[26px] leading-tight">Sign in to your workspace</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Manage buildings, bookings and collections from one place.
          </p>
        </>
      ) : (
        <>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--navy)] text-[var(--gold)]">
            <MdPhonelinkLock className="h-5 w-5" />
          </span>
          <h1 className="page-title mt-4 text-[26px] leading-tight">Two-step verification</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Enter the 6-digit code from your authenticator app
            {mfaStep.email ? (
              <>
                {' '}
                for <span className="font-semibold text-[var(--text)]">{mfaStep.email}</span>
              </>
            ) : null}
            .
          </p>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
        {/* Email + password stay mounted during the MFA step so their values are re-sent */}
        <div className={mfaStep ? 'hidden' : 'space-y-5'}>
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
          <div className="space-y-1.5">
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'At least 6 characters' },
              })}
            />
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-[13px] font-semibold text-[var(--navy)] hover:text-[var(--accent)] dark:text-[var(--accent)]"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>

        {mfaStep ? (
          <>
            <Input
              label="Authenticator code"
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              className="text-center font-mono text-lg tracking-[0.4em]"
              error={errors.mfaCode?.message}
              {...register('mfaCode')}
            />
            <Input
              label="Recovery code"
              hint="Optional — use one if you can't access your authenticator app."
              icon={<MdKey />}
              {...register('recoveryCode')}
            />
          </>
        ) : null}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? (mfaStep ? 'Verifying…' : 'Signing in…') : mfaStep ? 'Verify and sign in' : 'Sign in'}
          {!loading ? <MdArrowForward className="h-4 w-4" /> : null}
        </Button>

        {mfaStep ? (
          <button
            type="button"
            onClick={() => setMfaStep(null)}
            className="mx-auto flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <MdArrowBack className="h-4 w-4" /> Back to password
          </button>
        ) : null}
      </form>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
        <MdVerifiedUser className="h-3.5 w-3.5 text-[var(--success)]" />
        Secure staff access · Accounts are issued by your administrator
      </p>
    </div>
  );
}
