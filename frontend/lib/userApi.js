import api from "./api";

export const uploadMyAvatar = (file) => {
  const form = new FormData();
  form.append("avatar", file);
  return api.patch("/users/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const removeMyAvatar = () => api.delete("/users/me/avatar");