import { pool } from "../config/db.js";
const columns = `id,user_id,title,designation,personal_information,professional_summary,resume_data,preferred_format,section_order,section_visibility,custom_section_configuration,created_at,updated_at`;
export async function listByUser(userId) {
  const { rows } = await pool.query(
    `SELECT ${columns} FROM resumes WHERE user_id=$1 ORDER BY updated_at DESC`,
    [userId],
  );
  return rows;
}
export async function getById(userId, id) {
  const { rows } = await pool.query(
    `SELECT ${columns} FROM resumes WHERE user_id=$1 AND id=$2`,
    [userId, id],
  );
  return rows[0] || null;
}
export async function create(userId, d) {
  const q = `INSERT INTO resumes(user_id,title,designation,personal_information,professional_summary,resume_data,preferred_format,section_order,section_visibility,custom_section_configuration) VALUES($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7,$8::jsonb,$9::jsonb,$10::jsonb) RETURNING ${columns}`;
  const vals = [
    userId,
    d.title,
    d.designation,
    JSON.stringify(d.personalInformation),
    d.professionalSummary,
    JSON.stringify(d.resumeData),
    d.preferredFormat,
    JSON.stringify(d.sectionOrder),
    JSON.stringify(d.sectionVisibility),
    JSON.stringify(d.customSectionConfiguration),
  ];
  const { rows } = await pool.query(q, vals);
  return rows[0];
}
export async function update(userId, id, d) {
  const q = `UPDATE resumes SET title=$3,designation=$4,personal_information=$5::jsonb,professional_summary=$6,resume_data=$7::jsonb,preferred_format=$8,section_order=$9::jsonb,section_visibility=$10::jsonb,custom_section_configuration=$11::jsonb,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING ${columns}`;
  const vals = [
    userId,
    id,
    d.title,
    d.designation,
    JSON.stringify(d.personalInformation),
    d.professionalSummary,
    JSON.stringify(d.resumeData),
    d.preferredFormat,
    JSON.stringify(d.sectionOrder),
    JSON.stringify(d.sectionVisibility),
    JSON.stringify(d.customSectionConfiguration),
  ];
  const { rows } = await pool.query(q, vals);
  return rows[0] || null;
}
export async function remove(userId, id) {
  const { rowCount } = await pool.query(
    "DELETE FROM resumes WHERE user_id=$1 AND id=$2",
    [userId, id],
  );
  return rowCount > 0;
}
