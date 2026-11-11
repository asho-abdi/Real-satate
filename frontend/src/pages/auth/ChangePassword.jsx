import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { authService } from '../../services/authService.js';

export default function ChangePassword() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (values) => {
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed successfully');
      reset();
    } catch (err) {
      toast.error(err.message || 'Could not change password');
    }
  };

  return (
    <div>
      <PageHeader
        title="Change Password"
        subtitle="Update your sign-in credentials."
        breadcrumbs={[{ label: 'Account' }, { label: 'Change Password' }]}
      />

      <Card className="max-w-lg" title="Security" description="Use at least 8 characters. You will stay signed in on this device.">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <PasswordInput
            label="Current password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword', { required: 'Current password is required' })}
          />
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword', {
              required: 'New password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
            })}
          />
          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === newPassword || 'Passwords do not match',
            })}
          />
          <div className="flex justify-end border-t border-[var(--border)] pt-5">
            <Button type="submit" loading={isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
