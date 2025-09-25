export const branchSelector = {
  id: true,
  name: true,
  code: true,
  status: true,
  type: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  tenant: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  address: {
    select: {
      id: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
    },
  },
};
