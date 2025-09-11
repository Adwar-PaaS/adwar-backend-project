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
