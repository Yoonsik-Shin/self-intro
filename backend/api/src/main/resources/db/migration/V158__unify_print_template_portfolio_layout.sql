-- 포트폴리오 배치(portfolio_layout)를 별도 테이블로 두지 않고, 이력서 인쇄 배치와 같은
-- print_template 테이블/서비스로 통합한다. document_type으로 RESUME/PORTFOLIO를 구분하고,
-- 포트폴리오 행은 job_posting_id 대신 portfolio_case_study_id를 쓰며 orientation을 갖는다.

ALTER TABLE print_template
    ADD COLUMN document_type VARCHAR(20) NOT NULL DEFAULT 'RESUME',
    ADD COLUMN portfolio_case_study_id BIGINT NULL,
    ADD COLUMN orientation VARCHAR(10) NOT NULL DEFAULT 'PORTRAIT';

ALTER TABLE print_template
    ADD CONSTRAINT fk_print_template_portfolio_case_study
        FOREIGN KEY (portfolio_case_study_id) REFERENCES portfolio_case_study(id) ON DELETE CASCADE;

CREATE INDEX idx_print_template_portfolio_case_study
    ON print_template(portfolio_case_study_id, orientation);

DROP TABLE portfolio_layout;
