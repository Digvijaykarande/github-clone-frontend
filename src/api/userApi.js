import API from "./axios";

export const getCurrentUser = async () => {
  try {
    const res = await API.get("/api/users/me");
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};