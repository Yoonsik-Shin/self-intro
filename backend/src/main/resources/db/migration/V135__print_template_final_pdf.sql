ALTER TABLE `print_template`
  ADD COLUMN `final_pdf_object_key` varchar(300) DEFAULT NULL AFTER `is_final_submission`;
