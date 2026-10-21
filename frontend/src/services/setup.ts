import axios from "axios";

import api from "./api";

const csrfApi = axios.create({
  withCredentials: true,
  withXSRFToken: true,
});

export type SetupStatus = {
  required: boolean;
};

export type FirstAccountInput = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type SetupUser = {
  name: string;
  email: string;
};

type FirstAccountResponse = {
  message: string;
  user: SetupUser;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const response = await api.get<{ data: SetupStatus }>("/setup/status");
  return response.data.data;
}

export async function createFirstAccount(
  input: FirstAccountInput,
): Promise<FirstAccountResponse> {
  await csrfApi.get("/sanctum/csrf-cookie", { baseURL: "" });

  const response = await api.post<FirstAccountResponse>("/setup", {
    name: input.name,
    email: input.email,
    password: input.password,
    password_confirmation: input.passwordConfirmation,
  });

  return response.data;
}
