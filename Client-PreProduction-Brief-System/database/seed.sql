-- Seed Data for DigiQuest Studio Pre-Production Brief Collection System
-- Default Password for all seeded users is: Password123!
-- (Bcrypt hash: $2a$10$RpstTQ4efFmK4igtKrDcUOSDxd53N6gsGzW4kybKPS6lmjJsWQ6Zm)

-- 1. Insert Clients
INSERT INTO clients (id, company_name, contact_person, email, phone, address, website) VALUES
(1, 'Acme Creative Agency', 'Jane Doe', 'jane.doe@acme.com', '+1-555-0199', '123 Creative Way, New York, NY', 'https://acmecreative.com'),
(2, 'Globex Video Corp', 'Hank Scorpio', 'hank@globex.com', '+1-555-0188', '456 Cypress Creek Rd, Denver, CO', 'https://globex.com'),
(3, 'Vandelay Industries', 'George Costanza', 'george@vandelay.com', '+1-555-0177', '789 Latex Blvd, Queens, NY', 'https://vandelay.com');

-- 2. Insert Users
INSERT INTO users (id, username, password, email, role, client_id) VALUES
(1, 'admin', '$2a$10$RpstTQ4efFmK4igtKrDcUOSDxd53N6gsGzW4kybKPS6lmjJsWQ6Zm', 'admin@digiqueststudio.com', 'Admin', NULL),
(2, 'pm_sarah', '$2a$10$RpstTQ4efFmK4igtKrDcUOSDxd53N6gsGzW4kybKPS6lmjJsWQ6Zm', 'sarah.pm@digiqueststudio.com', 'Project Manager', NULL),
(3, 'client_jane', '$2a$10$RpstTQ4efFmK4igtKrDcUOSDxd53N6gsGzW4kybKPS6lmjJsWQ6Zm', 'jane.doe@acme.com', 'Client', 1),
(4, 'client_hank', '$2a$10$RpstTQ4efFmK4igtKrDcUOSDxd53N6gsGzW4kybKPS6lmjJsWQ6Zm', 'hank@globex.com', 'Client', 2);

-- 3. Insert Briefs
INSERT INTO briefs (
    id, project_name, project_type, client_id, project_description, 
    script, references_text, brand_guidelines, delivery_format, 
    languages_required, target_audience, project_objective, 
    start_date, delivery_date, priority, 
    approval_contact_name, approval_contact_email, approval_contact_phone,
    special_instructions, production_notes, status, created_by
) VALUES
(
    1, 'Acme Fall Fashion Campaign', 'Promo Video', 1, 
    'A high-end 30-second promo video showcasing Acme''s fall collection. The style should be energetic, high-contrast, and fashion-forward.',
    'Scene 1: Model walks down runway. Voiceover: "Style is what defines us." Scene 2: Dynamic cuts of products in close-up...',
    'Reference link: https://youtube.com/watch?v=ref1. Tone reference: Nike Runway Campaign 2025.',
    'Use Acme Primary Palette: Navy Blue (#0B3C5D), Gold (#D9B310). Font: Montserrat. Logo overlay is mandatory in top-right corner.',
    'MP4 (H.264) 4K Ultra HD and 9:16 Vertical for Social Media',
    'English, Spanish', 'Young adults aged 18-35 interested in sustainable high fashion.',
    'Drive online pre-orders of the Fall Collection by at least 25%.',
    '2026-07-01', '2026-08-15', 'High',
    'Jane Doe', 'jane.doe@acme.com', '+1-555-0199',
    'Ensure captions are burned in for the 9:16 social cut.',
    'Requires green screen studio booking and hiring 3 model talents.',
    'Submitted', 3
),
(
    2, 'Globex Product Showcase', 'Product Demo', 2,
    'Explanatory 2-minute video illustrating how the Globex Automated Platform handles logistics and inventory tracking.',
    'Opening: Animation of complex tracking maps simplified. Voiceover describes the challenge. Core section demonstrates software interface...',
    'Reference: Slack product demos, Shopify logistics explainer animations.',
    'Globex brand guidelines apply: Blue (#0044ff), Gray (#eeeeee). Font: Inter.',
    'MP4 1080p, WebM',
    'English', 'B2B Procurement Managers and Operations Managers.',
    'Explain the efficiency gains of the Globex platform to reduce lead generation times.',
    '2026-06-25', '2026-07-20', 'Medium',
    'Hank Scorpio', 'hank@globex.com', '+1-555-0188',
    'Hank Scorpio has final sign-off. Copy must review security protocols accurately.',
    'Will need custom user interface motion-graphic animation blocks.',
    'Approved', 4
),
(
    3, 'Vandelay Latex Commercial', 'TV Commercial', 3,
    '30-second television spot highlighting the quality of Vandelay Latex products, targeting manufacturing partners.',
    'Draft script: "Latex. It is all around you. But not all latex is created equal. Vandelay..."',
    'Classic 90s corporate commercial tone.',
    'Vandelay logo must be prominent. Colors: Black and Yellow.',
    'ProRes 422 HQ 1080p 29.97fps',
    'English', 'Industrial manufacturing executives.',
    'Brand awareness and new partnership inquiries.',
    '2026-09-01', '2026-10-31', 'Low',
    'George Costanza', 'george@vandelay.com', '+1-555-0177',
    'Georges boss Mr. Wilhelm must approve. High priority on sound design.',
    'Need to coordinate voiceover actor casting.',
    'Draft', 1
),
(
    4, 'Acme Explainer Animations', '2D Animation', 1,
    'Series of three 15-second animations explaining internal eco-friendly initiatives at Acme.',
    'Need scripts. Details to be added following PM feedback.',
    'References: Kurzgesagt style vector animations.',
    'Eco colors: Green (#2ecc71), Earthy (#e67e22). Font: Quicksand.',
    'MP4 1080p, GIF',
    'English, French', 'Internal employees and shareholders.',
    'Increase engagement with company environmental initiatives.',
    '2026-07-15', '2026-08-30', 'Low',
    'Jane Doe', 'jane.doe@acme.com', '+1-555-0199',
    'Review script draft with sustainability team before animation.',
    'Need vector design assets from Acme design team.',
    'Revision Requested', 3
);

-- 4. Insert Comments
INSERT INTO comments (brief_id, user_id, comment) VALUES
(1, 2, 'Great initial brief! I recommend adding details on who will provide the voiceover script before we kickoff.'),
(1, 3, 'Hi Sarah, yes! We will use our in-house copywriter and will upload the finalized script by next week.'),
(4, 2, 'We need the raw script and brand assets before this can move to Review. Please upload the Vector graphics.'),
(2, 1, 'Brief approved by Admin. Ready for project assignment.');

-- 5. Insert Notifications
INSERT INTO notifications (user_id, message, type, is_read, brief_id) VALUES
(2, 'New Pre-Production Brief submitted: Acme Fall Fashion Campaign', 'submission', FALSE, 1),
(3, 'Status changed to "Approved" for brief: Globex Product Showcase', 'status_change', TRUE, 2),
(3, 'Revision requested for brief: Acme Explainer Animations', 'status_change', FALSE, 4),
(3, 'Project Manager Sarah commented on your brief: Acme Fall Fashion Campaign', 'comment', FALSE, 1);

-- 6. Insert Audit Logs
INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value) VALUES
(3, 'Brief Created', 'brief', 1, NULL, '{"project_name": "Acme Fall Fashion Campaign", "status": "Draft"}'),
(3, 'Status Changed', 'brief', 1, '{"status": "Draft"}', '{"status": "Submitted"}'),
(4, 'Brief Created', 'brief', 2, NULL, '{"project_name": "Globex Product Showcase", "status": "Draft"}'),
(2, 'Status Changed', 'brief', 2, '{"status": "Submitted"}', '{"status": "Approved"}'),
(2, 'Comment Added', 'comment', 1, NULL, '{"comment": "Great initial brief!"}');
