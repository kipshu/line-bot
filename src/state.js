const userStateMap = new Map();

const DEFAULT_STATE = {
  category: null,
  painCount: 0,
  lastReply: "",
};

export function getUserState(userId) {
  return (
    userStateMap.get(userId) || {
      ...DEFAULT_STATE,
      updatedAt: Date.now(),
    }
  );
}

export function setUserState(userId, nextState) {
  const currentState = getUserState(userId);

  userStateMap.set(userId, {
    ...currentState,
    ...nextState,
    updatedAt: Date.now(),
  });
}

export function cleanupOldStates() {
  const now = Date.now();
  const ttl = 1000 * 60 * 60 * 12; // 12時間

  for (const [userId, state] of userStateMap.entries()) {
    if (!state.updatedAt || now - state.updatedAt > ttl) {
      userStateMap.delete(userId);
    }
  }
}
