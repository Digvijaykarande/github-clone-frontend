import API from "./axios";

// ── Own profile ───────────────────────────────────────────────────────────────

export const getCurrentUser = async () => {
  const res = await API.get("/api/users/me");
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await API.put("/api/users/update", data);
  return res.data;
};

export const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await API.post("/api/users/profile-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ── Repos ─────────────────────────────────────────────────────────────────────

export const getMyRepos = async () => {
  const res = await API.get("/api/repos/me");
  return res.data;
};