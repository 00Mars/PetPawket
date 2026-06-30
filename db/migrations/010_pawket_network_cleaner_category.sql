-- Add a dedicated Pawket Network category for pet cleaners and waste cleanup providers.

ALTER TYPE network_primary_category ADD VALUE IF NOT EXISTS 'cleaner' AFTER 'groomer';
