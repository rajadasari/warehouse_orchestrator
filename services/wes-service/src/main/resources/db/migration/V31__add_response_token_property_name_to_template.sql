-- V31: Add response_token_property_name to template definition
ALTER TABLE wo.resource_template 
ADD COLUMN IF NOT EXISTS response_token_property_name VARCHAR(100);

-- Update REST_API_GENERIC default if present
UPDATE wo.resource_template 
SET response_token_property_name = 'accessToken' 
WHERE template_code = 'REST_API_GENERIC' AND response_token_property_name IS NULL;
