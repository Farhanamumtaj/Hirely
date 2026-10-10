import * as repo from "../repositories/resumeRepository.js";
const serialize = (r) => ({
  id: r.id,
  title: r.title,
  designation: r.designation,
  personalInformation: r.personal_information,
  professionalSummary: r.professional_summary,
  resumeData: r.resume_data,
  preferredFormat: r.preferred_format,
  sectionOrder: r.section_order,
  sectionVisibility: r.section_visibility,
  customSectionConfiguration: r.custom_section_configuration,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
export async function listResumes(userId) {
  return (await repo.listByUser(userId)).map(serialize);
}
export async function getResume(userId, id) {
  const r = await repo.getById(userId, id);
  return r ? serialize(r) : null;
}
export async function createResume(userId, data) {
  return serialize(await repo.create(userId, data));
}
export async function updateResume(userId, id, data) {
  const r = await repo.update(userId, id, data);
  return r ? serialize(r) : null;
}
export async function deleteResume(userId, id) {
  return repo.remove(userId, id);
}
