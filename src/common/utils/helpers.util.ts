export const userWithRoleSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  status: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
};