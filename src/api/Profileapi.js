import API from "./axios";

// Get current user
export const getCurrentUser = async () => {
  const res = await API.get("/api/users/me");
  return res.data;
};

// Update profile (bio, username, etc.)
export const updateProfile = async (data) => {
  const res = await API.put("/api/users/update", data);
  return res.data;
};

// Upload profile image
export const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await API.post("/api/users/profile-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// Get my repos
export const getMyRepos = async () => {
  const res = await API.get("/api/repos/me");
  return res.data;
};

// Get following list
export const getFollowing = async (userId) => {
  const res = await API.get(`/api/users/${userId}/following`);
  return res.data;
};

// Follow a user
export const followUser = async (userId) => {
  const res = await API.post(`/api/users/${userId}/follow`);
  return res.data;
};

// Unfollow a user
export const unfollowUser = async (userId) => {
  const res = await API.delete(`/api/users/${userId}/follow`);
  return res.data;
};