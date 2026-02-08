import { apiClient } from "../../lib/api-client";
import type { User } from "../../types/domain";

type RegisterInput = {
  email: string;
  name?: string;
};

export async function registerUser(input: RegisterInput): Promise<User> {
  const { data } = await apiClient.post<{ success: boolean; data: User }>("/users/register", input);
  return data.data;
}
