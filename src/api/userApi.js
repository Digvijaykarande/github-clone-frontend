import API from "./axios";

// ── Own profile ───────────────────────────────────────────────────────────────

export const getCurrentUser = async () => {
  try {
    const res = await API.get("/api/users/me");
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

// ── Search users ──────────────────────────────────────────────────────────────

export const searchUsers = async (query) => {
  const res = await API.get(`/api/users/search?q=${encodeURIComponent(query)}`);
  return res.data;
};

/**
 * Get any user's public profile by their userId.
 */
export const getPublicProfile = async (userId) => {
  const res = await API.get(`/api/users/${userId}`);
  return res.data;
};

// ── Follow / Unfollow ─────────────────────────────────────────────────────────

export const followUser = async (userId) => {
  const res = await API.post(`/api/users/${userId}/follow`);
  return res.data;
};

export const unfollowUser = async (userId) => {
  const res = await API.delete(`/api/users/${userId}/follow`);
  return res.data;
};

// ── Followers / Following lists ───────────────────────────────────────────────

export const getFollowers = async (userId) => {
  const res = await API.get(`/api/users/${userId}/followers`);
  return res.data;
};

export const getFollowing = async (userId) => {
  const res = await API.get(`/api/users/${userId}/following`);
  return res.data;
};