import api from "./api";

export interface ProfileUser {
  id: number;
  name: string;
}

export async function updateProfile(payload: {
  name: string;
  password?: string;
  current_password?: string;
}) {
  const response = await api.put("/profile", payload);
  return response.data.user as ProfileUser;
}