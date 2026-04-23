
const userStateMap = new Map();

export function getUserState(userId) {
  return (
    userStateMap.get(userId) || {
      category: null,
      painCount: 0,
      lastReply: "",
      updatedAt: Date.now(),
    }
  );
}

export function setUserState(userId, nextState) {
  userStateMap.set(userId, {
    ...nextState,
    updatedAt: Date.now(),
  });
}

export function cleanupOldStates() {
  const now = Date.now();
  const ttl = 1000 * 60 * 60 * 12;
  for (const [userId, state] of userStateMap.entries()) {
    if (!state.updatedAt || now - state.updatedAt > ttl) {
      userStateMap.delete(userId);
    }
  }
}
