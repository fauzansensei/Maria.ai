export const generateId = (prefix: string = 'id') => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000).toString(36)}`;
};
