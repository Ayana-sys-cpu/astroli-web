-- FR-034: Spotify deep-link URL per feed card.
-- The mobile app opens this URL with Linking.openURL; iOS Universal Links
-- route to the Spotify app if installed, or Safari → App Store otherwise.
ALTER TABLE feed_edits ADD COLUMN IF NOT EXISTS spotify_url text;
