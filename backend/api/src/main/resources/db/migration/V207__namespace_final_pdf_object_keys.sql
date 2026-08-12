-- Final submission PDFs are private Workspace documents. Legacy uploads used the scope path
-- without a Workspace namespace; copy those objects to the private bucket under the resulting
-- key before applying this migration in an environment with existing files.
UPDATE `print_template`
SET `final_pdf_object_key` = CONCAT(
    'workspaces/',
    `workspace_id`,
    '/',
    `final_pdf_object_key`
)
WHERE `final_pdf_object_key` IS NOT NULL
  AND `final_pdf_object_key` LIKE 'print-template/final-pdf/%';
