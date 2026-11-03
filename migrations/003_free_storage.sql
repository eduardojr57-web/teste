CREATE TABLE file_blobs(id text PRIMARY KEY REFERENCES uploads(id) ON DELETE CASCADE, data bytea NOT NULL);
CREATE TABLE backup_blobs(id text PRIMARY KEY, data bytea NOT NULL, created bigint NOT NULL);
