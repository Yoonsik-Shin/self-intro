package com.selfintro.modules.identity.publication.application;

import com.selfintro.modules.identity.publication.presentation.dto.PublicExperienceDraft;
import com.selfintro.modules.identity.publication.presentation.dto.PublicProfileDraft;
import com.selfintro.modules.identity.publication.presentation.dto.PublicStudyDraft;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicPageCompositionService {

    private static final List<String> COMPOSITION_TABLES =
            List.of(
                    "workspace_public_page_draft",
                    "workspace_public_profile_config",
                    "workspace_public_skill_selection",
                    "workspace_public_competency_selection",
                    "workspace_public_experience_selection",
                    "workspace_public_experience_detail_selection",
                    "workspace_public_experience_placement",
                    "workspace_public_portfolio_selection",
                    "workspace_public_study_selection",
                    "workspace_public_taxonomy_selection");

    private final JdbcTemplate jdbcTemplate;
    private final SecurityAuditService securityAuditService;

    public boolean available() {
        try {
            for (String table : COMPOSITION_TABLES) {
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM " + table + " WHERE 1=0", Integer.class);
            }
            return true;
        } catch (DataAccessException exception) {
            return false;
        }
    }

    public int configVersion(Long workspaceId) {
        if (!available()) return 1;
        List<Integer> versions =
                jdbcTemplate.query(
                        "SELECT config_version FROM workspace_public_page_draft WHERE workspace_id=?",
                        (rs, rowNum) -> rs.getInt(1),
                        workspaceId);
        return versions.isEmpty() ? 1 : versions.getFirst();
    }

    @Transactional
    public void markPublished(Long workspaceId) {
        if (!available()) return;
        jdbcTemplate.update(
                "UPDATE workspace_public_page_draft SET dirty_since=NULL WHERE workspace_id=?",
                workspaceId);
    }

    public PublicProfileDraft profile(Long workspaceId) {
        ProfileVisibility visibility = profileVisibility(workspaceId);
        List<PublicProfileDraft.ItemSelection> skills =
                jdbcTemplate.query(
                        """
                        SELECT ws.id, s.name,
                               COALESCE(sel.enabled, 0) enabled,
                               COALESCE(sel.featured, 0) featured,
                               COALESCE(sel.display_order, ws.display_order) display_order
                        FROM workspace_skill ws
                        JOIN skill s ON s.id = ws.skill_id
                        LEFT JOIN workspace_public_skill_selection sel
                          ON sel.workspace_id = ws.workspace_id
                         AND sel.workspace_skill_id = ws.id
                        WHERE ws.workspace_id = ?
                        ORDER BY display_order, ws.id
                        """,
                        (rs, rowNum) -> item(rs),
                        workspaceId);
        List<PublicProfileDraft.ItemSelection> competencies =
                jdbcTemplate.query(
                        """
                        SELECT c.id, c.title name,
                               COALESCE(sel.enabled, 0) enabled,
                               0 featured,
                               COALESCE(sel.display_order, c.display_order) display_order
                        FROM competency c
                        LEFT JOIN workspace_public_competency_selection sel
                          ON sel.workspace_id = c.workspace_id
                         AND sel.competency_id = c.id
                        WHERE c.workspace_id = ?
                        ORDER BY display_order, c.id
                        """,
                        (rs, rowNum) -> item(rs),
                        workspaceId);
        return visibility.toDraft(skills, competencies);
    }

    @Transactional
    public PublicProfileDraft updateProfile(
            Long workspaceId, Long actorUserId, PublicProfileDraft draft) {
        requireDistinct(draft.skills().stream().map(PublicProfileDraft.ItemSelection::id).toList());
        requireDistinct(
                draft.competencies().stream().map(PublicProfileDraft.ItemSelection::id).toList());
        jdbcTemplate.update(
                """
                INSERT INTO workspace_public_profile_config
                    (workspace_id, show_name, show_name_en, show_job_title, show_bio,
                     show_core_stack_summary, show_status_badge, show_github, show_email, show_phone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    show_name = VALUES(show_name), show_name_en = VALUES(show_name_en),
                    show_job_title = VALUES(show_job_title), show_bio = VALUES(show_bio),
                    show_core_stack_summary = VALUES(show_core_stack_summary),
                    show_status_badge = VALUES(show_status_badge),
                    show_github = VALUES(show_github), show_email = VALUES(show_email),
                    show_phone = VALUES(show_phone)
                """,
                workspaceId,
                draft.showName(),
                draft.showNameEn(),
                draft.showJobTitle(),
                draft.showBio(),
                draft.showCoreStackSummary(),
                draft.showStatusBadge(),
                draft.showGithub(),
                draft.showEmail(),
                draft.showPhone());
        jdbcTemplate.update(
                "UPDATE workspace_public_skill_selection SET enabled = 0, featured = 0 WHERE workspace_id = ?",
                workspaceId);
        for (PublicProfileDraft.ItemSelection item : draft.skills()) {
            requireOwned(
                    "SELECT COUNT(*) FROM workspace_skill WHERE id=? AND workspace_id=?",
                    item.id(),
                    workspaceId);
            jdbcTemplate.update(
                    """
                            INSERT INTO workspace_public_skill_selection
                                (workspace_id, workspace_skill_id, enabled, featured, display_order)
                            SELECT ?, ws.id, ?, ?, ?
                            FROM workspace_skill ws
                            WHERE ws.id = ? AND ws.workspace_id = ?
                            ON DUPLICATE KEY UPDATE enabled = VALUES(enabled),
                                featured = VALUES(featured), display_order = VALUES(display_order)
                    """,
                    workspaceId,
                    item.enabled(),
                    item.featured(),
                    item.displayOrder(),
                    item.id(),
                    workspaceId);
        }
        jdbcTemplate.update(
                "UPDATE workspace_public_competency_selection SET enabled = 0 WHERE workspace_id = ?",
                workspaceId);
        for (PublicProfileDraft.ItemSelection item : draft.competencies()) {
            requireOwned(
                    "SELECT COUNT(*) FROM competency WHERE id=? AND workspace_id=?",
                    item.id(),
                    workspaceId);
            jdbcTemplate.update(
                    """
                            INSERT INTO workspace_public_competency_selection
                                (workspace_id, competency_id, enabled, display_order)
                            SELECT ?, c.id, ?, ? FROM competency c
                            WHERE c.id = ? AND c.workspace_id = ?
                            ON DUPLICATE KEY UPDATE enabled = VALUES(enabled),
                                display_order = VALUES(display_order)
                    """,
                    workspaceId,
                    item.enabled(),
                    item.displayOrder(),
                    item.id(),
                    workspaceId);
        }
        dirty(workspaceId, actorUserId, "PUBLIC_PROFILE_DRAFT_UPDATED");
        return profile(workspaceId);
    }

    public PublicExperienceDraft experience(Long workspaceId) {
        List<PublicExperienceDraft.ExperienceSelection> experiences =
                jdbcTemplate.query(
                        """
                        SELECT e.id, e.title, COALESCE(s.enabled, 0) enabled,
                               COALESCE(s.display_order, e.display_order) display_order,
                               COALESCE(s.show_on_timeline, 0) show_on_timeline,
                               s.timeline_label
                        FROM experience e
                        LEFT JOIN workspace_public_experience_selection s
                          ON s.workspace_id=e.workspace_id AND s.experience_id=e.id
                        WHERE e.workspace_id=? ORDER BY display_order, e.id
                        """,
                        (rs, rowNum) ->
                                new PublicExperienceDraft.ExperienceSelection(
                                        rs.getLong("id"),
                                        rs.getString("title"),
                                        rs.getBoolean("enabled"),
                                        rs.getInt("display_order"),
                                        rs.getBoolean("show_on_timeline"),
                                        rs.getString("timeline_label")),
                        workspaceId);
        List<PublicExperienceDraft.DetailSelection> details =
                jdbcTemplate.query(
                        """
                        SELECT d.id, e.id experience_id, d.content,
                               COALESCE(s.enabled, 0) enabled,
                               COALESCE(s.display_order, d.display_order) display_order
                        FROM experience_detail d JOIN experience e ON e.id=d.experience_id
                        LEFT JOIN workspace_public_experience_detail_selection s
                          ON s.workspace_id=e.workspace_id AND s.experience_detail_id=d.id
                        WHERE e.workspace_id=? ORDER BY e.display_order, display_order, d.id
                        """,
                        (rs, rowNum) ->
                                new PublicExperienceDraft.DetailSelection(
                                        rs.getLong("id"),
                                        rs.getLong("experience_id"),
                                        rs.getString("content"),
                                        rs.getBoolean("enabled"),
                                        rs.getInt("display_order")),
                        workspaceId);
        List<PublicExperienceDraft.PlacementSelection> placements =
                jdbcTemplate.query(
                        """
                        SELECT e.id experience_id, 'CORE_PROJECT' placement_type,
                               COALESCE(p.enabled, 0) enabled,
                               COALESCE(p.display_order, e.display_order) display_order
                        FROM experience e
                        LEFT JOIN workspace_public_experience_placement p
                          ON p.workspace_id=e.workspace_id AND p.experience_id=e.id
                         AND p.placement_type='CORE_PROJECT'
                        WHERE e.workspace_id=? ORDER BY display_order, e.id
                        """,
                        (rs, rowNum) ->
                                new PublicExperienceDraft.PlacementSelection(
                                        rs.getLong("experience_id"),
                                        rs.getString("placement_type"),
                                        rs.getBoolean("enabled"),
                                        rs.getInt("display_order")),
                        workspaceId);
        List<PublicExperienceDraft.PortfolioSelection> portfolios =
                jdbcTemplate.query(
                        """
                        SELECT p.id, p.title, COALESCE(s.enabled, 0) enabled,
                               COALESCE(s.display_order, 0) display_order
                        FROM portfolio_case_study p
                        LEFT JOIN workspace_public_portfolio_selection s
                          ON s.workspace_id=p.workspace_id AND s.portfolio_case_study_id=p.id
                        WHERE p.workspace_id=? ORDER BY display_order, p.id
                        """,
                        (rs, rowNum) ->
                                new PublicExperienceDraft.PortfolioSelection(
                                        rs.getLong("id"),
                                        rs.getString("title"),
                                        rs.getBoolean("enabled"),
                                        rs.getInt("display_order")),
                        workspaceId);
        return new PublicExperienceDraft(experiences, details, placements, portfolios);
    }

    @Transactional
    public PublicExperienceDraft updateExperience(
            Long workspaceId, Long actorUserId, PublicExperienceDraft draft) {
        requireDistinct(
                draft.experiences().stream()
                        .map(PublicExperienceDraft.ExperienceSelection::id)
                        .toList());
        requireDistinct(
                draft.details().stream().map(PublicExperienceDraft.DetailSelection::id).toList());
        requireDistinct(
                draft.portfolios().stream()
                        .map(PublicExperienceDraft.PortfolioSelection::id)
                        .toList());
        jdbcTemplate.update(
                "UPDATE workspace_public_experience_selection SET enabled=0, show_on_timeline=0 WHERE workspace_id=?",
                workspaceId);
        for (PublicExperienceDraft.ExperienceSelection item : draft.experiences()) {
            requireOwnedExperience(workspaceId, item.id());
            jdbcTemplate.update(
                    """
                            INSERT INTO workspace_public_experience_selection
                                (workspace_id, experience_id, enabled, display_order,
                                 show_on_timeline, timeline_label)
                            SELECT ?, e.id, ?, ?, ?, ? FROM experience e
                            WHERE e.id=? AND e.workspace_id=?
                            ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),
                                display_order=VALUES(display_order),
                                show_on_timeline=VALUES(show_on_timeline),
                                timeline_label=VALUES(timeline_label)
                    """,
                    workspaceId,
                    item.enabled(),
                    item.displayOrder(),
                    item.showOnTimeline(),
                    item.timelineLabel(),
                    item.id(),
                    workspaceId);
        }
        jdbcTemplate.update(
                "UPDATE workspace_public_experience_detail_selection SET enabled=0 WHERE workspace_id=?",
                workspaceId);
        for (PublicExperienceDraft.DetailSelection item : draft.details()) {
            requireOwned(
                    """
                    SELECT COUNT(*) FROM experience_detail d
                    JOIN experience e ON e.id=d.experience_id
                    WHERE d.id=? AND e.id=? AND e.workspace_id=?
                    """,
                    item.id(),
                    item.experienceId(),
                    workspaceId);
            jdbcTemplate.update(
                    """
                            INSERT INTO workspace_public_experience_detail_selection
                                (workspace_id, experience_id, experience_detail_id, enabled, display_order)
                            SELECT ?, e.id, d.id, ?, ?
                            FROM experience_detail d JOIN experience e ON e.id=d.experience_id
                            WHERE d.id=? AND e.id=? AND e.workspace_id=?
                            ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),
                                display_order=VALUES(display_order)
                    """,
                    workspaceId,
                    item.enabled(),
                    item.displayOrder(),
                    item.id(),
                    item.experienceId(),
                    workspaceId);
        }
        jdbcTemplate.update(
                "UPDATE workspace_public_experience_placement SET enabled=0 WHERE workspace_id=?",
                workspaceId);
        for (PublicExperienceDraft.PlacementSelection item : draft.placements()) {
            requireOwnedExperience(workspaceId, item.experienceId());
            jdbcTemplate.update(
                    """
                    INSERT INTO workspace_public_experience_placement
                        (workspace_id, experience_id, placement_type, enabled, display_order)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), display_order=VALUES(display_order)
                    """,
                    workspaceId,
                    item.experienceId(),
                    item.placementType(),
                    item.enabled(),
                    item.displayOrder());
        }
        jdbcTemplate.update(
                "UPDATE workspace_public_portfolio_selection SET enabled=0 WHERE workspace_id=?",
                workspaceId);
        for (PublicExperienceDraft.PortfolioSelection item : draft.portfolios()) {
            requireOwned(
                    "SELECT COUNT(*) FROM portfolio_case_study WHERE id=? AND workspace_id=?",
                    item.id(),
                    workspaceId);
            jdbcTemplate.update(
                    """
                            INSERT INTO workspace_public_portfolio_selection
                                (workspace_id, portfolio_case_study_id, enabled, display_order)
                            SELECT ?, p.id, ?, ? FROM portfolio_case_study p
                            WHERE p.id=? AND p.workspace_id=?
                            ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),
                                display_order=VALUES(display_order)
                    """,
                    workspaceId,
                    item.enabled(),
                    item.displayOrder(),
                    item.id(),
                    workspaceId);
        }
        dirty(workspaceId, actorUserId, "PUBLIC_EXPERIENCE_DRAFT_UPDATED");
        return experience(workspaceId);
    }

    public PublicStudyDraft study(Long workspaceId) {
        List<PublicStudyDraft.StudySelection> studies =
                jdbcTemplate.query(
                        """
                        SELECT st.id, st.title, COALESCE(s.enabled, 0) enabled,
                               COALESCE(s.display_order, 0) display_order
                        FROM study st LEFT JOIN workspace_public_study_selection s
                          ON s.workspace_id=st.workspace_id AND s.study_id=st.id
                        WHERE st.workspace_id=? ORDER BY display_order, st.learned_at DESC, st.id DESC
                        """,
                        (rs, rowNum) ->
                                new PublicStudyDraft.StudySelection(
                                        rs.getLong("id"),
                                        rs.getString("title"),
                                        rs.getBoolean("enabled"),
                                        rs.getInt("display_order")),
                        workspaceId);
        List<PublicStudyDraft.TaxonomySelection> taxonomy =
                jdbcTemplate.query(
                        """
                        SELECT n.id, n.scheme_id, n.name,
                               COALESCE(s.enabled, 0) enabled,
                               COALESCE(s.display_order, n.display_order) display_order,
                               s.display_label
                        FROM workspace_taxonomy_scheme_subscription sub
                        JOIN taxonomy_node n ON n.scheme_id=sub.scheme_id AND n.status='ACTIVE'
                        LEFT JOIN workspace_public_taxonomy_selection s
                          ON s.workspace_id=sub.workspace_id AND s.taxonomy_node_id=n.id
                        WHERE sub.workspace_id=? AND sub.enabled=1
                        ORDER BY sub.display_order, n.display_order, n.id
                        """,
                        (rs, rowNum) ->
                                new PublicStudyDraft.TaxonomySelection(
                                        rs.getLong("id"),
                                        rs.getLong("scheme_id"),
                                        rs.getString("name"),
                                        rs.getBoolean("enabled"),
                                        rs.getInt("display_order"),
                                        rs.getString("display_label")),
                        workspaceId);
        return new PublicStudyDraft(studies, taxonomy);
    }

    @Transactional
    public PublicStudyDraft updateStudy(
            Long workspaceId, Long actorUserId, PublicStudyDraft draft) {
        requireDistinct(draft.studies().stream().map(PublicStudyDraft.StudySelection::id).toList());
        requireDistinct(
                draft.taxonomy().stream().map(PublicStudyDraft.TaxonomySelection::id).toList());
        jdbcTemplate.update(
                "UPDATE workspace_public_study_selection SET enabled=0 WHERE workspace_id=?",
                workspaceId);
        for (PublicStudyDraft.StudySelection item : draft.studies()) {
            requireOwned(
                    "SELECT COUNT(*) FROM study WHERE id=? AND workspace_id=?",
                    item.id(),
                    workspaceId);
            jdbcTemplate.update(
                    """
                            INSERT INTO workspace_public_study_selection
                                (workspace_id, study_id, enabled, display_order)
                            SELECT ?, st.id, ?, ? FROM study st
                            WHERE st.id=? AND st.workspace_id=?
                            ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),
                                display_order=VALUES(display_order)
                    """,
                    workspaceId,
                    item.enabled(),
                    item.displayOrder(),
                    item.id(),
                    workspaceId);
        }
        jdbcTemplate.update(
                "UPDATE workspace_public_taxonomy_selection SET enabled=0 WHERE workspace_id=?",
                workspaceId);
        for (PublicStudyDraft.TaxonomySelection item : draft.taxonomy()) {
            requireOwned(
                    """
                    SELECT COUNT(*) FROM taxonomy_node n
                    JOIN workspace_taxonomy_scheme_subscription sub
                      ON sub.scheme_id=n.scheme_id
                    WHERE n.id=? AND sub.workspace_id=? AND sub.enabled=1 AND n.status='ACTIVE'
                    """,
                    item.id(),
                    workspaceId);
            jdbcTemplate.update(
                    """
                            INSERT INTO workspace_public_taxonomy_selection
                                (workspace_id, taxonomy_node_id, enabled, display_order, display_label)
                            SELECT ?, n.id, ?, ?, ?
                            FROM taxonomy_node n
                            JOIN workspace_taxonomy_scheme_subscription sub
                              ON sub.scheme_id=n.scheme_id AND sub.workspace_id=? AND sub.enabled=1
                            WHERE n.id=? AND n.status='ACTIVE'
                            ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),
                                display_order=VALUES(display_order), display_label=VALUES(display_label)
                    """,
                    workspaceId,
                    item.enabled(),
                    item.displayOrder(),
                    item.displayLabel(),
                    workspaceId,
                    item.id());
        }
        dirty(workspaceId, actorUserId, "PUBLIC_STUDY_DRAFT_UPDATED");
        return study(workspaceId);
    }

    private ProfileVisibility profileVisibility(Long workspaceId) {
        List<ProfileVisibility> rows =
                jdbcTemplate.query(
                        """
                        SELECT show_name, show_name_en, show_job_title, show_bio,
                               show_core_stack_summary, show_status_badge, show_github,
                               show_email, show_phone
                        FROM workspace_public_profile_config WHERE workspace_id=?
                        """,
                        (rs, rowNum) -> ProfileVisibility.from(rs),
                        workspaceId);
        return rows.isEmpty() ? ProfileVisibility.defaults() : rows.getFirst();
    }

    private PublicProfileDraft.ItemSelection item(ResultSet rs) throws SQLException {
        return new PublicProfileDraft.ItemSelection(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getBoolean("enabled"),
                rs.getBoolean("featured"),
                rs.getInt("display_order"));
    }

    private void requireOwnedExperience(Long workspaceId, Long experienceId) {
        requireOwned(
                "SELECT COUNT(*) FROM experience WHERE id=? AND workspace_id=?",
                experienceId,
                workspaceId);
    }

    private void requireOwned(String sql, Object... args) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, args);
        if (count == null || count != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다.");
        }
    }

    private void requireDistinct(List<Long> ids) {
        Set<Long> distinct = new HashSet<>(ids);
        if (distinct.size() != ids.size() || distinct.contains(null)) {
            throw new IllegalArgumentException(
                    "Public page selection contains invalid duplicates.");
        }
    }

    private void dirty(Long workspaceId, Long actorUserId, String eventType) {
        jdbcTemplate.update(
                """
                INSERT INTO workspace_public_page_draft
                    (workspace_id, config_version, dirty_since, updated_by_user_id)
                VALUES (?, 1, CURRENT_TIMESTAMP(6), ?)
                ON DUPLICATE KEY UPDATE config_version=config_version+1,
                    dirty_since=COALESCE(dirty_since, CURRENT_TIMESTAMP(6)),
                    updated_by_user_id=VALUES(updated_by_user_id)
                """,
                workspaceId,
                actorUserId);
        securityAuditService.recordWorkspaceAction(eventType, actorUserId, workspaceId);
    }

    private record ProfileVisibility(
            boolean showName,
            boolean showNameEn,
            boolean showJobTitle,
            boolean showBio,
            boolean showCoreStackSummary,
            boolean showStatusBadge,
            boolean showGithub,
            boolean showEmail,
            boolean showPhone) {

        private static ProfileVisibility from(ResultSet rs) throws SQLException {
            return new ProfileVisibility(
                    rs.getBoolean("show_name"),
                    rs.getBoolean("show_name_en"),
                    rs.getBoolean("show_job_title"),
                    rs.getBoolean("show_bio"),
                    rs.getBoolean("show_core_stack_summary"),
                    rs.getBoolean("show_status_badge"),
                    rs.getBoolean("show_github"),
                    rs.getBoolean("show_email"),
                    rs.getBoolean("show_phone"));
        }

        private static ProfileVisibility defaults() {
            return new ProfileVisibility(true, true, true, true, true, true, true, false, false);
        }

        private PublicProfileDraft toDraft(
                List<PublicProfileDraft.ItemSelection> skills,
                List<PublicProfileDraft.ItemSelection> competencies) {
            return new PublicProfileDraft(
                    showName,
                    showNameEn,
                    showJobTitle,
                    showBio,
                    showCoreStackSummary,
                    showStatusBadge,
                    showGithub,
                    showEmail,
                    showPhone,
                    skills,
                    competencies);
        }
    }
}
