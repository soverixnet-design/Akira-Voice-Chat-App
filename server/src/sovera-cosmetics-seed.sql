-- Original Sovera cosmetics, pinned to source commit 0e30b48962272b8a687509aef4dee9bc4a047767.
-- Safe rerun: existing admin names, prices and enable switches are never overwritten.
BEGIN;
SELECT pg_advisory_xact_lock(20261027, 8);
INSERT INTO akira_control_catalog (kind,name,description,asset,price,enabled)
SELECT v.kind,v.name,v.description,v.asset,v.price,v.enabled
FROM (VALUES
  ('frame', 'Phoenix Fire', 'Original Sovera frame; profile diameter=0.43; portraitY=0.53; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/phoenix.png', 0, true),
  ('frame', 'Ice Wings', 'Original Sovera frame; profile diameter=0.43; portraitY=0.53; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/ice.png', 0, true),
  ('frame', 'Royal Dragon', 'Original Sovera frame; profile diameter=0.43; portraitY=0.53; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/dragon.png', 0, true),
  ('frame', 'Sovera VIP7', 'Original Sovera frame; profile diameter=0.43; portraitY=0.53; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/vip7.webp', 0, true),
  ('frame', 'Royal Gold', 'Original Sovera frame; profile diameter=0.61; portraitY=0.52; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/royal-gold.webp', 0, true),
  ('frame', 'Violet Love', 'Original Sovera frame; profile diameter=0.59; portraitY=0.53; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/violet-love.webp', 0, true),
  ('frame', 'Ice Admin', 'Original Sovera frame; profile diameter=0.59; portraitY=0.53; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/ice-admin.webp', 0, true),
  ('frame', 'Golden Dragon', 'Original Sovera frame; profile diameter=0.59; portraitY=0.51; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/dragon-gold.webp', 0, true),
  ('frame', 'Ice Dragon', 'Original Sovera frame; profile diameter=0.58; portraitY=0.52; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/ice-dragon.webp', 0, true),
  ('frame', 'Violet Phoenix', 'Original Sovera frame; profile diameter=0.59; portraitY=0.53; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/violet-phoenix.webp', 0, true),
  ('frame', 'Castle Flag', 'Original Sovera frame; profile diameter=0.61; portraitY=0.52; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/royal-gold.webp', 0, true),
  ('frame', 'Lion Queen', 'Original Sovera frame; profile diameter=0.43; portraitY=0.53; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/phoenix.png', 0, true),
  ('frame', 'Phoenix Queen', 'Original Sovera frame; profile diameter=0.43; portraitY=0.53; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/phoenix.png', 0, true),
  ('frame', 'Tiger Queen', 'Original Sovera frame; profile diameter=0.61; portraitY=0.52; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/royal-gold.webp', 0, true),
  ('entry', 'Sovera VIP7 Phoenix Arrival', 'Original Sovera entry; profile diameter=0; portraitY=0; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/phoenix-entry.webp', 0, true),
  ('entry', 'Dragon Queen Arrival', 'Original Sovera entry; profile diameter=0; portraitY=0; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/dragon-queen-entry.webp', 0, true),
  ('entry', 'Ice King Arrival', 'Original Sovera entry; profile diameter=0; portraitY=0; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/ice-king-entry.webp', 0, true),
  ('entry', 'Castle Flag Arrival', 'Original Sovera entry; profile diameter=0; portraitY=0; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/castle-entry.webp', 0, true),
  ('entry', 'Lion Queen Arrival', 'Original Sovera entry; profile diameter=0; portraitY=0; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/lion-queen-entry.webp', 0, true),
  ('entry', 'Phoenix Queen Arrival', 'Original Sovera entry; profile diameter=0; portraitY=0; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/phoenix-queen-entry.webp', 0, true),
  ('entry', 'Tiger Queen Arrival', 'Original Sovera entry; profile diameter=0; portraitY=0; editable by admin', 'https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/0e30b48962272b8a687509aef4dee9bc4a047767/assets/effects/tiger-queen-entry.webp', 0, true)
) AS v(kind,name,description,asset,price,enabled)
WHERE NOT EXISTS (SELECT 1 FROM akira_control_catalog c WHERE c.kind=v.kind AND c.name=v.name);
COMMIT;
