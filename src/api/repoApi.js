import API from "./axios";

// Create a new repo
export const createRepo = async (data) => {
  const res = await API.post("/api/repos", data);
  return res.data;
};

// Get my repos
export const getMyRepos = async () => {
  const res = await API.get("/api/repos/me");
  return res.data;
};

// Get single repo by ID
export const getRepoById = async (repoId) => {
  const res = await API.get(`/api/repos/${repoId}`);
  return res.data;
};

// Delete repo
export const deleteRepo = async (repoId) => {
  const res = await API.delete(`/api/repos/${repoId}`);
  return res.data;
};

// Get commits for a repo
export const getCommits = async (repoId) => {
  const res = await API.get(`/api/repos/${repoId}/commits`);
  return res.data;
};

// Get public repos
export const getPublicRepos = async () => {
  const res = await API.get("/api/repos/public");
  return res.data;
};

// Search repos
export const searchRepos = async (q) => {
  const res = await API.get(`/api/repos/search?q=${encodeURIComponent(q)}`);
  return res.data;
};

// Get files for a repo
export const getRepoFiles = async (repoId) => {
  const res = await API.get(`/api/repos/${repoId}/files`);
  return res.data;
};
