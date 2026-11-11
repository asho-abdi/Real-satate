import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MdArrowForward, MdMailOutline, MdVerifiedUser } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';

export default function Login() {
  const { login, loading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      await login(values);
    } catch {
      /* toast handled in context */
    }
  };

  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="page-title mt-2 text-[26px] leading-tight">Sign in to your workspace</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        Manage buildings, bookings and collections from one place.
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

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
          {!loading ? <MdArrowForward className="h-4 w-4" /> : null}
        </Button>
      </form>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
        <MdVerifiedUser className="h-3.5 w-3.5 text-[var(--success)]" />
        Secure staff access · Accounts are issued by your administrator
      </p>
    </div>
  );
}
