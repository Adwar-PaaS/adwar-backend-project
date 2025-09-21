import { formatISO } from 'date-fns';

export const userWithRoleSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  status: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
};

export const decimalToString = ({ value }: { value: any }) =>
  value?.toString() ?? null;
export const dateToISOString = ({ value }: { value: Date | null }) =>
  value ? formatISO(value) : null;
