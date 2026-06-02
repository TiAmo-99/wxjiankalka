-- 宝塔 / phpMyAdmin 可选手动导入（需先创建空库 jiankalka）
-- 推荐仍使用: npm run db:migrate

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) DEFAULT NULL,
  nickname VARCHAR(100) NOT NULL DEFAULT '',
  real_name VARCHAR(50) NOT NULL DEFAULT '',
  phone VARCHAR(20) DEFAULT NULL,
  avatar_url VARCHAR(500) DEFAULT NULL,
  username VARCHAR(64) DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  study_goal VARCHAR(200) NOT NULL DEFAULT '' COMMENT '学习目标',
  motto VARCHAR(200) NOT NULL DEFAULT '' COMMENT '个签座右铭',
  email_notify_enabled TINYINT(1) NOT NULL DEFAULT 0,
  email_notify_mode ENUM('default', 'custom') NOT NULL DEFAULT 'default',
  email_slot_morning TINYINT(1) NOT NULL DEFAULT 1 COMMENT '09:00',
  email_slot_afternoon TINYINT(1) NOT NULL DEFAULT 1 COMMENT '14:00',
  email_slot_evening TINYINT(1) NOT NULL DEFAULT 1 COMMENT '21:00',
  email_notify_when_done TINYINT(1) NOT NULL DEFAULT 0 COMMENT '全部完成时发鼓励',
  role ENUM('student', 'admin') NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  perm_level TINYINT NOT NULL DEFAULT 0 COMMENT '权限等级，默认0',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_openid (openid),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS study_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_study_plans_user (user_id),
  CONSTRAINT fk_plans_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_plans_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plan_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  plan_id INT NOT NULL,
  date DATE NOT NULL,
  subject VARCHAR(100) NOT NULL,
  content VARCHAR(500) NOT NULL DEFAULT '',
  target_minutes INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_plan_items_plan_date (plan_id, date),
  CONSTRAINT fk_items_plan FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS study_reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  plan_item_id INT DEFAULT NULL,
  report_date DATE NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 1,
  actual_minutes INT NOT NULL DEFAULT 0,
  start_time VARCHAR(8) DEFAULT NULL,
  end_time VARCHAR(8) DEFAULT NULL,
  note TEXT DEFAULT NULL,
  other_subject VARCHAR(100) DEFAULT NULL,
  other_content VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_reports_user_date (user_id, report_date),
  UNIQUE KEY uk_reports_user_plan_date (user_id, plan_item_id, report_date),
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_reports_item FOREIGN KEY (plan_item_id) REFERENCES plan_items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_notify_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  slot ENUM('morning', 'afternoon', 'evening') NOT NULL,
  kind ENUM('remind', 'encourage') NOT NULL DEFAULT 'remind',
  status ENUM('ok', 'fail') NOT NULL,
  err_msg VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_logs_user (user_id, created_at),
  CONSTRAINT fk_email_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS encouragement_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  content VARCHAR(500) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_encouragement_status (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permission_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  request_level TINYINT NOT NULL COMMENT '申请权限等级',
  reason VARCHAR(500) NOT NULL DEFAULT '' COMMENT '申请原因',
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  admin_note VARCHAR(255) DEFAULT NULL COMMENT '审核备注',
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_perm_req_status (status, created_at),
  KEY idx_perm_req_user (user_id, status),
  CONSTRAINT fk_perm_req_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_perm_req_admin FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vocabulary_words (
  id INT PRIMARY KEY AUTO_INCREMENT,
  word VARCHAR(64) NOT NULL,
  phonetic VARCHAR(128) DEFAULT NULL,
  meaning_zh VARCHAR(512) NOT NULL,
  example_en VARCHAR(512) DEFAULT NULL,
  example_zh VARCHAR(512) DEFAULT NULL,
  tags VARCHAR(128) NOT NULL DEFAULT 'kaoyan',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_vocab_word (word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vocabulary_phrases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kind VARCHAR(16) NOT NULL DEFAULT 'phrase' COMMENT 'phrase短语 sentence长句 passage片段',
  title VARCHAR(120) DEFAULT NULL COMMENT '短标题',
  phrase_en TEXT NOT NULL,
  meaning_zh TEXT NOT NULL,
  content_hash CHAR(32) NOT NULL COMMENT '去重',
  tags VARCHAR(128) NOT NULL DEFAULT 'kaoyan',
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_vocab_phrase_hash (content_hash),
  KEY idx_vocab_phrase_kind (kind, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS memos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(120) NOT NULL DEFAULT '' COMMENT '标题',
  content TEXT NOT NULL COMMENT '正文',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_memos_user_updated (user_id, updated_at),
  CONSTRAINT fk_memos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
