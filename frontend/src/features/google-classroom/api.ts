import { apiClient } from "../../lib/api-client";
import type {
  GoogleClassroomDashboardSummary,
  GoogleClassroomMaterial,
  GoogleClassroomMaterialDetail,
  GoogleClassroomStatus,
  GoogleClassroomSyncResult,
  MaterialAiAnalysis,
  MaterialQuiz,
  MaterialQuizAttemptResult,
  QuizPrepPack
} from "../../types/domain";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export async function getGoogleClassroomAuthUrl(): Promise<{ url: string }> {
  const response = await apiClient.get<ApiResponse<{ url: string }>>("/google-classroom/auth-url");
  return response.data.data;
}

export async function getGoogleClassroomStatus(): Promise<GoogleClassroomStatus> {
  const response = await apiClient.get<ApiResponse<GoogleClassroomStatus>>("/google-classroom/status");
  return response.data.data;
}

export async function getGoogleClassroomDashboardSummary(): Promise<GoogleClassroomDashboardSummary> {
  const response = await apiClient.get<ApiResponse<GoogleClassroomDashboardSummary>>(
    "/google-classroom/dashboard-summary"
  );
  return response.data.data;
}

export async function syncGoogleClassroom(): Promise<GoogleClassroomSyncResult> {
  const response = await apiClient.post<ApiResponse<GoogleClassroomSyncResult>>("/google-classroom/sync");
  return response.data.data;
}

export async function listGoogleClassroomMaterials(): Promise<GoogleClassroomMaterial[]> {
  const response = await apiClient.get<ApiResponse<GoogleClassroomMaterial[]>>("/google-classroom/materials");
  return response.data.data;
}

export async function getGoogleClassroomMaterialDetail(
  materialId: string
): Promise<GoogleClassroomMaterialDetail> {
  const response = await apiClient.get<ApiResponse<GoogleClassroomMaterialDetail>>(
    `/google-classroom/materials/${materialId}`
  );
  return response.data.data;
}

export async function analyzeGoogleClassroomMaterial(materialId: string): Promise<MaterialAiAnalysis> {
  const response = await apiClient.post<ApiResponse<MaterialAiAnalysis>>(
    `/google-classroom/materials/${materialId}/analyze`
  );
  return response.data.data;
}

export async function generateGoogleClassroomQuizPrep(materialId: string): Promise<QuizPrepPack> {
  const response = await apiClient.post<ApiResponse<QuizPrepPack>>(
    `/google-classroom/materials/${materialId}/quiz-prep`
  );
  return response.data.data;
}

export async function generateGoogleClassroomMaterialQuiz(
  materialId: string,
  questionCount = 5
): Promise<MaterialQuiz> {
  const response = await apiClient.post<ApiResponse<MaterialQuiz>>(
    `/google-classroom/materials/${materialId}/quizzes`,
    { questionCount }
  );
  return response.data.data;
}

export async function submitGoogleClassroomQuizAttempt(
  quizId: string,
  answers: Array<{ questionId: string; answer: string }>
): Promise<MaterialQuizAttemptResult> {
  const response = await apiClient.post<ApiResponse<MaterialQuizAttemptResult>>(
    `/google-classroom/quizzes/${quizId}/attempts`,
    { answers }
  );
  return response.data.data;
}
