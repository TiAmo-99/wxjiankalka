-- 语料表扩展：支持长短句、阅读片段；管理端可维护
ALTER TABLE vocabulary_phrases
  ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'phrase' COMMENT 'phrase|sentence|passage' AFTER id,
  ADD COLUMN title VARCHAR(120) DEFAULT NULL COMMENT '短标题' AFTER kind,
  ADD COLUMN content_hash CHAR(32) DEFAULT NULL COMMENT '去重哈希' AFTER meaning_zh;

ALTER TABLE vocabulary_phrases
  MODIFY phrase_en TEXT NOT NULL,
  MODIFY meaning_zh TEXT NOT NULL;
