/** @deprecated Admin DB client removed — use API service pool directly when server routes are migrated. */
export const dbAdmin = {
  from: () => ({
    select: async () => ({ data: [], error: null }),
    insert: async () => ({ data: null, error: { message: 'not migrated' } }),
    update: async () => ({ data: null, error: { message: 'not migrated' } }),
    delete: async () => ({ error: { message: 'not migrated' } }),
  }),
  rpc: async () => ({ data: null, error: { message: 'not migrated' } }),
};
