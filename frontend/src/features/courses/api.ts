import { apiClient } from "../../lib/api-client";
import type { Course, CourseDetail, CourseQuestionResult } from "../../types/domain";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type CreateCourseInput = {
  name: string;
};

export async function listCourses(): Promise<Course[]> {
  const response = await apiClient.get<ApiResponse<Course[]>>("/courses");
  return response.data.data;
}

export async function getCourseDetail(courseId: string): Promise<CourseDetail> {
  const response = await apiClient.get<ApiResponse<CourseDetail>>(`/courses/${courseId}`);
  return response.data.data;
}

export async function uploadCourseDocument(courseId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  await apiClient.post(`/courses/${courseId}/documents`, formData);
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const response = await apiClient.post<ApiResponse<Course>>("/courses", input);
  return response.data.data;
}

export async function askCourseQuestion(courseId: string, question: string): Promise<CourseQuestionResult> {
  const response = await apiClient.post<ApiResponse<CourseQuestionResult>>(`/courses/${courseId}/ask`, {
    question
  });
  return response.data.data;
}

export async function deleteCourse(courseId: string): Promise<void> {
  await apiClient.delete(`/courses/${courseId}`);
}
