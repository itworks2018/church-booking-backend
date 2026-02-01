import fs from "fs/promises";

/**
 * Render an HTML email template with variables
 * @param {string} templateName - Template file name (without .html)
 * @param {Object} variables - Key-value pairs for template variables
 * @returns {Promise<string>} Rendered HTML
 */
export async function renderEmailTemplate(templateName, variables) {
  const filePath = new URL(`./email-templates/${templateName}.html`, import.meta.url);
  let html = await fs.readFile(filePath, "utf8");
  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, value ?? "");
  }
  return html;
}
