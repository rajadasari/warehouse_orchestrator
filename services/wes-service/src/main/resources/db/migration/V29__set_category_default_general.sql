-- V29__set_category_default_general.sql
-- Enforce NOT NULL on category with 'GENERAL' default for templates and resources

-- 1. wo.resource_template
UPDATE wo.resource_template 
SET category = 'GENERAL' 
WHERE category IS NULL OR TRIM(category) = '';

ALTER TABLE wo.resource_template 
    ALTER COLUMN category SET DEFAULT 'GENERAL',
    ALTER COLUMN category SET NOT NULL;

-- 2. wo.resource
UPDATE wo.resource 
SET category = 'GENERAL' 
WHERE category IS NULL OR TRIM(category) = '';

ALTER TABLE wo.resource 
    ALTER COLUMN category SET DEFAULT 'GENERAL',
    ALTER COLUMN category SET NOT NULL;
